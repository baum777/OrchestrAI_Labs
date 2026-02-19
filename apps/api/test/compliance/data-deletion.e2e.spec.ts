/**
 * E2E Tests: Data Deletion (DSGVO Art. 17)
 * 
 * Tests:
 * - Test D: Data deletion removes/anonymizes correctly
 * - Test E: Unauthorized deletion is blocked
 * - Test F: Self-deletion works
 */

import { Pool } from "pg";
import { createTestApp } from "../_utils/createTestApp";
import { seedProject } from "../_utils/seed";
import supertest from "supertest";
import { DecisionsService } from "../../src/modules/decisions/decisions.service";
import { PostgresActionLogger } from "../../src/runtime/postgres-action-logger";
import { SystemClock } from "@agent-system/governance-v2/runtime/clock";

describe("data-deletion (E2E)", () => {
  const databaseUrl = process.env.DATABASE_URL;
  const projectId = process.env.TEST_PROJECT_ID ?? "proj_deletion_test";

  let pool: Pool;
  let closeApp: () => Promise<void>;
  let request: ReturnType<typeof supertest>;
  let decisionsService: DecisionsService;
  let actionLogger: PostgresActionLogger;
  let clock: SystemClock;
  const testUserId = "test_user_deletion";
  const otherUserId = "test_user_other";

  beforeAll(async () => {
    if (!databaseUrl) throw new Error("DATABASE_URL must be set to run E2E tests.");

    pool = new Pool({ connectionString: databaseUrl });
    await seedProject(pool, { projectId });

    clock = new SystemClock();
    const app = await createTestApp({ pool });
    request = app.request;
    closeApp = app.close;
    decisionsService = app.moduleRef.get(DecisionsService);
    actionLogger = app.moduleRef.get(PostgresActionLogger);
  });

  afterAll(async () => {
    await closeApp?.();
    await pool?.end();
  });

  beforeEach(async () => {
    // Clean up test data
    await pool.query(`DELETE FROM decisions WHERE owner IN ($1, $2)`, [testUserId, otherUserId]);
    await pool.query(`DELETE FROM review_requests WHERE user_id IN ($1, $2)`, [testUserId, otherUserId]);
    await pool.query(`DELETE FROM action_logs WHERE user_id IN ($1, $2)`, [testUserId, otherUserId]);
  });

  it("Test D: Data deletion removes/anonymizes correctly", async () => {
    // Arrange: Create test data
    const draft1 = await decisionsService.createDraft(projectId, {
      title: "Test Decision 1",
      owner: testUserId,
    });
    const draft2 = await decisionsService.createDraft(projectId, {
      title: "Test Decision 2",
      owner: testUserId,
    });

    // Create action log entry
    await actionLogger.append({
      agentId: "test_agent",
      userId: testUserId,
      action: "test.action",
      input: { userId: testUserId, test: "data" },
      output: { result: "ok" },
      ts: clock.now().toISOString(),
      blocked: false,
    });

    // Verify preconditions
    const { rows: decisionsBefore } = await pool.query(
      `SELECT COUNT(*) as count FROM decisions WHERE owner = $1`,
      [testUserId]
    );
    expect(parseInt(decisionsBefore[0].count)).toBe(2);

    const { rows: logsBefore } = await pool.query(
      `SELECT COUNT(*) as count FROM action_logs WHERE user_id = $1`,
      [testUserId]
    );
    expect(parseInt(logsBefore[0].count)).toBeGreaterThan(0);

    // Act: Delete user data
    const deleteResult = await request.delete(`/users/${testUserId}/data`).expect(200);

    expect(deleteResult.body.ok).toBe(true);
    expect(deleteResult.body.deleted.decisions).toBe(2);
    expect(deleteResult.body.deleted.anonymizedLogs).toBeGreaterThan(0);

    // Assert: Decisions are deleted
    const { rows: decisionsAfter } = await pool.query(
      `SELECT COUNT(*) as count FROM decisions WHERE owner = $1`,
      [testUserId]
    );
    expect(parseInt(decisionsAfter[0].count)).toBe(0);

    // Assert: Action logs are anonymized (not deleted)
    const { rows: logsAfter } = await pool.query(
      `SELECT COUNT(*) as count FROM action_logs WHERE user_id LIKE 'deleted_user_%'`
    );
    expect(parseInt(logsAfter[0].count)).toBeGreaterThan(0);

    // Verify original user_id is gone
    const { rows: originalLogs } = await pool.query(
      `SELECT COUNT(*) as count FROM action_logs WHERE user_id = $1`,
      [testUserId]
    );
    expect(parseInt(originalLogs[0].count)).toBe(0);

    // Verify anonymized logs contain deleted_user_ prefix
    const { rows: anonymizedLogs } = await pool.query(
      `SELECT user_id FROM action_logs WHERE user_id LIKE 'deleted_user_%' LIMIT 1`
    );
    if (anonymizedLogs.length > 0) {
      expect(anonymizedLogs[0].user_id).toMatch(/^deleted_user_/);
    }
  });

  it("Test E: Unauthorized deletion is blocked", async () => {
    // Arrange: Create test data for testUserId
    await decisionsService.createDraft(projectId, {
      title: "Test Decision",
      owner: testUserId,
    });

    // Act: Try to delete testUserId's data as otherUserId (should be blocked by auth guard)
    const result = await request
      .delete(`/users/${testUserId}/data`)
      .set("X-User-Id", otherUserId)
      .expect(401); // Unauthorized

    expect(result.body.statusCode).toBe(401);
    expect(result.body.message).toContain("Access denied");
  });

  it("Test H: Admin can delete other user's data", async () => {
    // Arrange: Create test data for testUserId
    await decisionsService.createDraft(projectId, {
      title: "Test Decision",
      owner: testUserId,
    });

    // Act: Delete as admin
    const result = await request
      .delete(`/users/${testUserId}/data`)
      .set("X-User-Id", "admin_user")
      .set("X-User-Roles", "admin")
      .expect(200);

    // Assert: Admin deletion succeeds
    expect(result.body.ok).toBe(true);
    expect(result.body.deleted.decisions).toBe(1);
  });

  it("Test F: Self-deletion works", async () => {
    // Arrange: Create test data
    await decisionsService.createDraft(projectId, {
      title: "Test Decision",
      owner: testUserId,
    });

    // Act: Delete own data
    const result = await request.delete(`/users/${testUserId}/data`).expect(200);

    // Assert: Deletion succeeds
    expect(result.body.ok).toBe(true);
    expect(result.body.deleted.decisions).toBe(1);

    // Verify data is gone
    const { rows } = await pool.query(
      `SELECT COUNT(*) as count FROM decisions WHERE owner = $1`,
      [testUserId]
    );
    expect(parseInt(rows[0].count)).toBe(0);
  });

  it("Test G: Idempotent deletion (no data)", async () => {
    // Arrange: No data exists for user

    // Act: Delete user data (idempotent)
    const result = await request.delete(`/users/${testUserId}/data`).expect(200);

    // Assert: Returns success with zero counts
    expect(result.body.ok).toBe(true);
    expect(result.body.message).toBe("No user data found");
    expect(result.body.deleted.decisions).toBe(0);
    expect(result.body.deleted.reviews).toBe(0);
    expect(result.body.deleted.anonymizedLogs).toBe(0);
  });
});

