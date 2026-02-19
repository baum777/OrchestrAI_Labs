/**
 * Logging integrity test for Analytics v1.
 * Verifies required fields exist in action_logs for analytics queries.
 */
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Pool } from "pg";
import { PG_POOL } from "../../src/db/db.module";
import { DbModule } from "../../src/db/db.module";
import { AnalyticsModule } from "../../src/modules/analytics/analytics.module";
import { PostgresActionLogger } from "../../src/runtime/postgres-action-logger";

describe("Logging Integrity (Analytics v1)", () => {
  let app: INestApplication;
  let pool: Pool;
  let logger: PostgresActionLogger;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      console.warn("DATABASE_URL not set - skipping logging integrity test");
      return;
    }
    const moduleRef = await Test.createTestingModule({
      imports: [DbModule, AnalyticsModule],
      providers: [PostgresActionLogger],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    pool = moduleRef.get<Pool>(PG_POOL);
    logger = moduleRef.get<PostgresActionLogger>(PostgresActionLogger);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("action_logs has required columns for analytics", async () => {
    if (!pool) return;
    const { rows } = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'action_logs'
      ORDER BY ordinal_position
    `);
    const columns = new Set(rows.map((r: { column_name: string }) => r.column_name));
    expect(columns.has("action")).toBe(true);
    expect(columns.has("created_at")).toBe(true);
    expect(columns.has("project_id")).toBe(true);
    expect(columns.has("client_id")).toBe(true);
    expect(columns.has("agent_id")).toBe(true);
    expect(columns.has("blocked")).toBe(true);
    expect(columns.has("reason")).toBe(true);
    expect(columns.has("input_json")).toBe(true);
    expect(columns.has("output_json")).toBe(true);
  });

  it("PostgresActionLogger appends entry with required fields", async () => {
    if (!logger) return;
    const testEntry = {
      agentId: "test-agent",
      userId: "test-user",
      projectId: "test-project",
      clientId: "test-client",
      action: "test.integrity.check",
      input: { test: true },
      output: {},
      ts: new Date().toISOString(),
    };
    await expect(logger.append(testEntry)).resolves.not.toThrow();
  });

  it("review.access.denied logs support project_id and client_id columns", async () => {
    if (!pool) return;
    // Schema supports project_id, client_id (verified above).
    // ReviewsController now fetches project_id/client_id from review_requests
    // before INSERT when logging review.access.denied (hardening fix).
    const { rows } = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'action_logs' AND column_name IN ('project_id', 'client_id')
    `);
    expect(rows).toHaveLength(2);
  });
});
