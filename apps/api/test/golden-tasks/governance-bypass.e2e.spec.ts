import crypto from "node:crypto";
import { Pool } from "pg";
import { Orchestrator } from "@agent-runtime/orchestrator/orchestrator";
import { DecisionsService } from "../../src/modules/decisions/decisions.service";
import { PostgresActionLogger } from "../../src/runtime/postgres-action-logger";
import { createTestApp } from "../_utils/createTestApp";
import { readEscalations } from "../_utils/action-logs";
import { seedProject, seedReviewRequest } from "../_utils/seed";

function randomId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function getEscalationReason(input: unknown): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const v = input as { reason?: unknown; escalation?: { reason?: unknown } };
  if (typeof v.reason === "string") return v.reason;
  if (typeof v.escalation?.reason === "string") return v.escalation.reason;
  return undefined;
}

describe("governance-bypass (E2E, negative)", () => {
  const databaseUrl = process.env.DATABASE_URL;
  const projectA = process.env.TEST_PROJECT_ID;

  // optional: explicit second project id, else derive stable suffix
  const projectB = process.env.TEST_PROJECT_ID_2 ?? (projectA ? `${projectA}_B` : undefined);

  let pool: Pool;
  let closeApp: () => Promise<void>;
  let decisions: DecisionsService;
  let actionLogger: PostgresActionLogger;
  let orchestrator: Orchestrator;

  const testUserId = "test_user";
  const agentId = "agent_governance_v1";

  beforeAll(async () => {
    if (!databaseUrl) throw new Error("DATABASE_URL must be set to run Golden Task tests.");
    if (!projectA) throw new Error("TEST_PROJECT_ID must be set to run Golden Task tests.");

    pool = new Pool({ connectionString: databaseUrl });
    await seedProject(pool, { projectId: projectA });
    if (projectB) await seedProject(pool, { projectId: projectB });

    const app = await createTestApp({ pool });
    closeApp = app.close;

    decisions = app.moduleRef.get(DecisionsService);
    actionLogger = app.moduleRef.get(PostgresActionLogger);
    orchestrator = app.moduleRef.get(Orchestrator);
  });

  afterAll(async () => {
    await closeApp?.();
    await pool?.end();
  });

  it("TC-01: finalize_review_not_found wird blockiert + escalation in action_logs", async () => {
    const draft = await decisions.createDraft(projectA!, { title: "Draft for bypass TC-01", owner: "tester" });
    const reviewId = randomId("rev_missing");
    const sinceTs = new Date().toISOString();

    await expect(
      decisions.finalizeFromDraft(draft.id, reviewId, {
        logger: actionLogger,
        agentId,
        userId: testUserId,
        projectId: projectA!,
      })
    ).rejects.toThrow(/Review not found/i);

    const escalations = await readEscalations({ databaseUrl: databaseUrl!, projectId: projectA!, sinceTs, limit: 20 });
    expect(escalations.length).toBeGreaterThan(0);
    expect(escalations.some((e) => e.blocked === true && getEscalationReason(e.input) === "finalize_review_not_found")).toBe(
      true
    );
  });

  it("TC-02: finalize_review_not_approved wird blockiert + escalation in action_logs", async () => {
    const draft = await decisions.createDraft(projectA!, { title: "Draft for bypass TC-02", owner: "tester" });

    const seeded = await seedReviewRequest(pool, {
      projectId: projectA!,
      agentId,
      permission: "log.write",
      status: "pending",
      payload: { note: "unapproved review for finalize bypass" },
    });

    const sinceTs = new Date().toISOString();

    await expect(
      decisions.finalizeFromDraft(draft.id, seeded.reviewId, {
        logger: actionLogger,
        agentId,
        userId: testUserId,
        projectId: projectA!,
      })
    ).rejects.toThrow(/Review not approved/i);

    const escalations = await readEscalations({ databaseUrl: databaseUrl!, projectId: projectA!, sinceTs, limit: 20 });
    expect(escalations.length).toBeGreaterThan(0);
    expect(
      escalations.some((e) => e.blocked === true && getEscalationReason(e.input) === "finalize_review_not_approved")
    ).toBe(true);
  });

  it("TC-03: finalize_project_mismatch wird blockiert + escalation in action_logs", async () => {
    if (!projectB) throw new Error("TEST_PROJECT_ID_2 not set and TEST_PROJECT_ID missing; cannot derive second project");

    const draft = await decisions.createDraft(projectA!, { title: "Draft for bypass TC-03", owner: "tester" });

    const seeded = await seedReviewRequest(pool, {
      projectId: projectB,
      agentId,
      permission: "log.write",
      status: "approved",
      payload: { note: "approved review but on different project" },
    });

    const sinceTs = new Date().toISOString();

    await expect(
      decisions.finalizeFromDraft(draft.id, seeded.reviewId, {
        logger: actionLogger,
        agentId,
        userId: testUserId,
        projectId: projectA!,
      })
    ).rejects.toThrow(/project mismatch/i);

    const escalations = await readEscalations({ databaseUrl: databaseUrl!, projectId: projectA!, sinceTs, limit: 20 });
    expect(escalations.length).toBeGreaterThan(0);
    expect(escalations.some((e) => e.blocked === true && getEscalationReason(e.input) === "finalize_project_mismatch")).toBe(
      true
    );
  });

  it("TC-04: invalid_commit_token wird blockiert + escalation in action_logs (orchestrator commit-run)", async () => {
    const sinceTs = new Date().toISOString();

    const result = await orchestrator.run(
      { userId: testUserId, projectId: projectA! },
      {
        agentId,
        userMessage: "commit-run invalid token test",
        intendedAction: {
          permission: "log.write",
          toolCalls: [{ tool: "tool.logs.append", input: { note: "noop" } }],
          reviewCommit: { reviewId: randomId("rev_nope"), commitToken: randomId("tok") },
        },
      }
    );

    expect(result.status).toBe("blocked");

    const escalations = await readEscalations({ databaseUrl: databaseUrl!, projectId: projectA!, sinceTs, limit: 20 });
    expect(escalations.length).toBeGreaterThan(0);
    expect(escalations.some((e) => e.blocked === true && getEscalationReason(e.input) === "invalid_commit_token")).toBe(true);
  });

  it("TC-05: commit_mismatch / payload_tamper wird blockiert + escalation in action_logs (orchestrator commit-run)", async () => {
    // A) commit_mismatch (agent mismatch)
    {
      const commitToken = crypto.randomBytes(16).toString("hex");
      const seeded = await seedReviewRequest(pool, {
        projectId: projectA!,
        agentId: "agent_project_companion_v1", // mismatch on purpose
        permission: "log.write",
        status: "approved",
        commitToken,
        payload: { permission: "log.write", toolCalls: [{ tool: "tool.logs.append", input: { msg: "A" } }] },
      });

      const sinceTs = new Date().toISOString();
      const result = await orchestrator.run(
        { userId: testUserId, projectId: projectA! },
        {
          agentId,
          userMessage: "commit-run mismatch test",
          intendedAction: {
            permission: "log.write",
            toolCalls: [{ tool: "tool.logs.append", input: { msg: "A" } }],
            reviewCommit: { reviewId: seeded.reviewId, commitToken },
          },
        }
      );

      expect(result.status).toBe("blocked");
      const escalations = await readEscalations({ databaseUrl: databaseUrl!, projectId: projectA!, sinceTs, limit: 20 });
      expect(escalations.length).toBeGreaterThan(0);
      expect(escalations.some((e) => e.blocked === true && getEscalationReason(e.input) === "commit_mismatch")).toBe(true);
    }

    // B) payload_tamper (same agent+permission, different toolCalls)
    {
      const commitToken = crypto.randomBytes(16).toString("hex");
      const seeded = await seedReviewRequest(pool, {
        projectId: projectA!,
        agentId,
        permission: "log.write",
        status: "approved",
        commitToken,
        payload: { permission: "log.write", toolCalls: [{ tool: "tool.logs.append", input: { msg: "A" } }] },
      });

      const sinceTs = new Date().toISOString();
      const result = await orchestrator.run(
        { userId: testUserId, projectId: projectA! },
        {
          agentId,
          userMessage: "commit-run tamper test",
          intendedAction: {
            permission: "log.write",
            toolCalls: [{ tool: "tool.logs.append", input: { msg: "B" } }], // differs from stored payload
            reviewCommit: { reviewId: seeded.reviewId, commitToken },
          },
        }
      );

      expect(result.status).toBe("blocked");
      const escalations = await readEscalations({ databaseUrl: databaseUrl!, projectId: projectA!, sinceTs, limit: 20 });
      expect(escalations.length).toBeGreaterThan(0);
      expect(escalations.some((e) => e.blocked === true && getEscalationReason(e.input) === "payload_tamper")).toBe(true);
    }
  });

  it("TC-06 (optional): Logging failure blockiert Finalisierung (kein Final)", async () => {
    const draft = await decisions.createDraft(projectA!, { title: "Draft for bypass TC-06", owner: "tester" });

    const seeded = await seedReviewRequest(pool, {
      projectId: projectA!,
      agentId,
      permission: "log.write",
      status: "approved",
      payload: { note: "approved review for logging failure test" },
    });

    const failingLogger = {
      append: async () => {
        throw new Error("ACTION_LOG_WRITE_FAILED");
      },
    } as unknown as { append: PostgresActionLogger["append"] };

    await expect(
      decisions.finalizeFromDraft(draft.id, seeded.reviewId, {
        logger: failingLogger,
        agentId,
        userId: testUserId,
        projectId: projectA!,
      })
    ).rejects.toThrow(/Failed to log finalization intent/i);

    const current = await decisions.getById(draft.id);
    expect(current.status).toBe("draft");
  });
});

