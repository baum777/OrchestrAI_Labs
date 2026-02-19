/**
 * E2E Tests: Consent Management (DSGVO Art. 6 & 7)
 * 
 * Tests:
 * - Test A: Consent required blocks customer_data operations
 * - Test B: Consent grant unblocks
 * - Test C: Consent revoke re-blocks
 */

import { Pool } from "pg";
import { createTestApp } from "../_utils/createTestApp";
import { seedProject } from "../_utils/seed";
import supertest from "supertest";
import { Orchestrator } from "@agent-runtime/orchestrator/orchestrator";
import { ConsentService } from "../../src/modules/users/consent.service";
import { PolicyError } from "@governance/policy/policy-engine";

describe("consent-management (E2E)", () => {
  const databaseUrl = process.env.DATABASE_URL;
  const projectId = process.env.TEST_PROJECT_ID ?? "proj_consent_test";

  let pool: Pool;
  let closeApp: () => Promise<void>;
  let request: ReturnType<typeof supertest>;
  let orchestrator: Orchestrator;
  let consentService: ConsentService;
  const testUserId = "test_user_consent";
  const testClientId = "client_consent_test";

  beforeAll(async () => {
    if (!databaseUrl) throw new Error("DATABASE_URL must be set to run E2E tests.");

    pool = new Pool({ connectionString: databaseUrl });
    await seedProject(pool, { projectId, clientId: testClientId });

    const app = await createTestApp({ pool });
    request = app.request;
    closeApp = app.close;
    orchestrator = app.moduleRef.get(Orchestrator);
    consentService = app.moduleRef.get(ConsentService);
  });

  afterAll(async () => {
    await closeApp?.();
    await pool?.end();
  });

  beforeEach(async () => {
    // Clean up any existing consents for test user
    await pool.query(`DELETE FROM user_consents WHERE user_id = $1`, [testUserId]);
  });

  it("Test A: Consent required blocks customer_data operations", async () => {
    // Arrange: Ensure user has NO consent for data_processing
    const consentBefore = await consentService.getConsent(testUserId, "data_processing");
    expect(consentBefore.granted).toBe(false);

    // Act: Try to execute customer_data operation via orchestrator
    const result = await orchestrator.run(
      {
        userId: testUserId,
        projectId,
        clientId: testClientId,
      },
      {
        agentId: "agent_test",
        userMessage: "Get customer data",
        intendedAction: {
          permission: "customer_data.read",
          toolCalls: [
            {
              tool: { name: "customer_data.executeReadModel", version: "1.0" } as any,
              input: {
                clientId: testClientId,
                operationId: "test_operation",
              },
            },
          ],
        },
      }
    );

    // Assert: Operation should be blocked
    expect(result.status).toBe("blocked");
    expect(result.data).toBeDefined();
    const dataStr = JSON.stringify(result.data);
    expect(dataStr).toContain("CONSENT_MISSING");
  });

  it("Test B: Consent grant unblocks", async () => {
    // Arrange: Grant consent
    const grantResult = await request
      .post(`/users/${testUserId}/consent`)
      .send({
        consentType: "data_processing",
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
      })
      .expect(200);

    expect(grantResult.body.ok).toBe(true);
    expect(grantResult.body.consent.granted).toBe(true);

    // Verify consent exists
    const consent = await consentService.getConsent(testUserId, "data_processing");
    expect(consent.granted).toBe(true);

    // Act: Try to execute customer_data operation
    // Note: This will still fail if capability registry is not set up,
    // but the consent check should pass
    const result = await orchestrator.run(
      {
        userId: testUserId,
        projectId,
        clientId: testClientId,
      },
      {
        agentId: "agent_test",
        userMessage: "Get customer data",
        intendedAction: {
          permission: "customer_data.read",
          toolCalls: [
            {
              tool: { name: "customer_data.executeReadModel", version: "1.0" } as any,
              input: {
                clientId: testClientId,
                operationId: "test_operation",
              },
            },
          ],
        },
      }
    );

    // Assert: Should not fail with CONSENT_MISSING
    // (may fail for other reasons like missing capability, but not consent)
    if (result.status === "blocked") {
      const dataStr = JSON.stringify(result.data);
      expect(dataStr).not.toContain("CONSENT_MISSING");
    }
  });

  it("Test C: Consent revoke re-blocks", async () => {
    // Arrange: Grant consent first
    await request
      .post(`/users/${testUserId}/consent`)
      .send({
        consentType: "data_processing",
      })
      .expect(200);

    // Verify consent is granted
    const consentBefore = await consentService.getConsent(testUserId, "data_processing");
    expect(consentBefore.granted).toBe(true);

    // Act: Revoke consent
    const revokeResult = await request
      .delete(`/users/${testUserId}/consent/data_processing`)
      .expect(200);

    expect(revokeResult.body.ok).toBe(true);
    expect(revokeResult.body.consent.granted).toBe(false);

    // Verify consent is revoked
    const consentAfter = await consentService.getConsent(testUserId, "data_processing");
    expect(consentAfter.granted).toBe(false);

    // Act: Try to execute customer_data operation again
    const result = await orchestrator.run(
      {
        userId: testUserId,
        projectId,
        clientId: testClientId,
      },
      {
        agentId: "agent_test",
        userMessage: "Get customer data",
        intendedAction: {
          permission: "customer_data.read",
          toolCalls: [
            {
              tool: { name: "customer_data.executeReadModel", version: "1.0" } as any,
              input: {
                clientId: testClientId,
                operationId: "test_operation",
              },
            },
          ],
        },
      }
    );

    // Assert: Operation should be blocked again
    expect(result.status).toBe("blocked");
    expect(result.data).toBeDefined();
    const dataStr = JSON.stringify(result.data);
    expect(dataStr).toContain("CONSENT_MISSING");
  });
});

