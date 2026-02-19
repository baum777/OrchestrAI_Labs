/**
 * E2E Tests: Audit Logging Coverage
 * 
 * Phase 2 Compliance Hardening Tests
 * 
 * Tests:
 * - Test L: POST requests are logged
 * - Test M: PUT requests are logged
 * - Test N: DELETE requests are logged
 * - Test O: Critical GET endpoints are logged
 * - Test P: Audit logs contain required fields (userId, operation, timestamp, result)
 */

import { Pool } from "pg";
import { createTestApp } from "../_utils/createTestApp";
import { seedProject } from "../_utils/seed";
import supertest from "supertest";

describe("audit-logging (E2E)", () => {
  const databaseUrl = process.env.DATABASE_URL;
  const projectId = process.env.TEST_PROJECT_ID ?? "proj_audit_test";

  let pool: Pool;
  let closeApp: () => Promise<void>;
  let request: ReturnType<typeof supertest>;
  const testUserId = "test_user_audit";
  const testClientId = "client_audit_test";

  beforeAll(async () => {
    if (!databaseUrl) throw new Error("DATABASE_URL must be set to run E2E tests.");

    pool = new Pool({ connectionString: databaseUrl });
    await seedProject(pool, { projectId, clientId: testClientId });

    const app = await createTestApp({ pool });
    request = app.request;
    closeApp = app.close;
  });

  afterAll(async () => {
    await closeApp?.();
    await pool?.end();
  });

  beforeEach(async () => {
    // Clean up test logs
    await pool.query(`DELETE FROM action_logs WHERE user_id = $1`, [testUserId]);
  });

  async function getAuditLogs(actionPattern?: string): Promise<any[]> {
    const query = actionPattern
      ? `SELECT * FROM action_logs WHERE user_id = $1 AND action LIKE $2 ORDER BY created_at DESC`
      : `SELECT * FROM action_logs WHERE user_id = $1 ORDER BY created_at DESC`;
    const params = actionPattern ? [testUserId, `%${actionPattern}%`] : [testUserId];
    const { rows } = await pool.query(query, params);
    return rows;
  }

  it("Test L: POST requests are logged", async () => {
    // Act: Make POST request
    await request
      .post(`/projects/${projectId}/decisions/draft`)
      .set("X-User-Id", testUserId)
      .send({
        title: "Test Decision",
        owner: testUserId,
        assumptions: ["test"],
        alternatives: ["alt1"],
        risks: ["risk1"],
        successCriteria: ["criteria1"],
        nextSteps: ["step1"],
      })
      .expect(201);

    // Assert: Audit log exists
    const logs = await getAuditLogs("http.post");
    expect(logs.length).toBeGreaterThan(0);
    
    const log = logs[0];
    expect(log.user_id).toBe(testUserId);
    expect(log.action).toMatch(/^http\.post\./);
    expect(log.input_json).toBeDefined();
    expect(log.output_json).toBeDefined();
    expect(log.created_at).toBeDefined();
  });

  it("Test M: PUT requests are logged", async () => {
    // Arrange: Create a project phase first
    await request
      .put(`/projects/${projectId}/phase`)
      .set("X-User-Id", testUserId)
      .send({ phase: "discovery" })
      .expect(200);

    // Assert: Audit log exists
    const logs = await getAuditLogs("http.put");
    expect(logs.length).toBeGreaterThan(0);
    
    const log = logs[0];
    expect(log.user_id).toBe(testUserId);
    expect(log.action).toMatch(/^http\.put\./);
    expect(log.input_json).toBeDefined();
    expect(log.output_json).toBeDefined();
  });

  it("Test N: DELETE requests are logged", async () => {
    // Arrange: Create consent first
    await request
      .post(`/users/${testUserId}/consent`)
      .set("X-User-Id", testUserId)
      .send({ consentType: "data_processing" })
      .expect(200);

    // Act: DELETE request
    await request
      .delete(`/users/${testUserId}/consent/data_processing`)
      .set("X-User-Id", testUserId)
      .expect(200);

    // Assert: Audit log exists
    const logs = await getAuditLogs("http.delete");
    expect(logs.length).toBeGreaterThan(0);
    
    const log = logs[0];
    expect(log.user_id).toBe(testUserId);
    expect(log.action).toMatch(/^http\.delete\./);
  });

  it("Test O: Critical GET endpoints are logged", async () => {
    // Act: GET critical endpoint
    await request
      .get(`/reviews`)
      .set("X-User-Id", testUserId)
      .query({ status: "pending" })
      .expect(200);

    // Assert: Audit log exists
    const logs = await getAuditLogs("http.get");
    expect(logs.length).toBeGreaterThan(0);
    
    const log = logs[0];
    expect(log.user_id).toBe(testUserId);
    expect(log.action).toMatch(/^http\.get\./);
  });

  it("Test P: Audit logs contain required fields", async () => {
    // Act: Make any request
    await request
      .post(`/projects/${projectId}/decisions/draft`)
      .set("X-User-Id", testUserId)
      .send({
        title: "Test Decision",
        owner: testUserId,
        assumptions: ["test"],
        alternatives: ["alt1"],
        risks: ["risk1"],
        successCriteria: ["criteria1"],
        nextSteps: ["step1"],
      })
      .expect(201);

    // Assert: Log contains all required fields
    const logs = await getAuditLogs();
    expect(logs.length).toBeGreaterThan(0);
    
    const log = logs[0];
    
    // Required fields
    expect(log.user_id).toBe(testUserId);
    expect(log.action).toBeDefined();
    expect(log.created_at).toBeDefined();
    expect(log.input_json).toBeDefined();
    expect(log.output_json).toBeDefined();
    
    // Parse JSON fields
    const input = typeof log.input_json === "string" ? JSON.parse(log.input_json) : log.input_json;
    const output = typeof log.output_json === "string" ? JSON.parse(log.output_json) : log.output_json;
    
    // Input should contain method, path
    expect(input.method).toBeDefined();
    expect(input.path).toBeDefined();
    
    // Output should contain statusCode
    expect(output.statusCode).toBeDefined();
    expect(typeof output.statusCode).toBe("number");
  });

  it("Test Q: Safe endpoints (health) are NOT logged", async () => {
    // Act: GET health endpoint
    await request
      .get("/health")
      .expect(200);

    // Assert: No audit log for health endpoint
    const logs = await getAuditLogs("http.get.health");
    expect(logs.length).toBe(0);
  });
});

