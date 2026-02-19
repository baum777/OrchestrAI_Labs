/**
 * E2E Tests: RBAC (Role-Based Access Control)
 * 
 * Phase 2 Compliance Hardening Tests
 * 
 * Tests:
 * - Test G: Role assignment grants permissions
 * - Test H: Role revocation removes permissions
 * - Test I: Unauthorized access is blocked (missing permission)
 * - Test J: Role hierarchy works (admin > reviewer > user)
 * - Test K: Explicit permissions work (additive to roles)
 */

import { Pool } from "pg";
import { createTestApp } from "../_utils/createTestApp";
import { seedProject } from "../_utils/seed";
import supertest from "supertest";
import { UserRolesService } from "../../src/modules/users/user-roles.service";
import { PolicyEngine } from "@governance/policy/policy-engine";
import type { PolicyContext } from "@governance/policy/policy-engine";

describe("rbac (E2E)", () => {
  const databaseUrl = process.env.DATABASE_URL;
  const projectId = process.env.TEST_PROJECT_ID ?? "proj_rbac_test";

  let pool: Pool;
  let closeApp: () => Promise<void>;
  let request: ReturnType<typeof supertest>;
  let userRolesService: UserRolesService;
  let policyEngine: PolicyEngine;
  const testUserId = "test_user_rbac";
  const adminUserId = "test_admin_rbac";
  const testClientId = "client_rbac_test";

  beforeAll(async () => {
    if (!databaseUrl) throw new Error("DATABASE_URL must be set to run E2E tests.");

    pool = new Pool({ connectionString: databaseUrl });
    await seedProject(pool, { projectId, clientId: testClientId });

    // Run migration 007_user_roles.sql if not already run
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_roles (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin', 'reviewer', 'user', 'partner')),
          granted_by TEXT,
          granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          revoked_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE(user_id, role) WHERE revoked_at IS NULL
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_permissions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          permission TEXT NOT NULL,
          granted_by TEXT,
          granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          revoked_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE(user_id, permission) WHERE revoked_at IS NULL
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS role_permissions (
          role TEXT NOT NULL PRIMARY KEY CHECK (role IN ('admin', 'reviewer', 'user', 'partner')),
          permissions JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      // Insert default role permissions
      await pool.query(`
        INSERT INTO role_permissions (role, permissions) VALUES
          ('admin', '["knowledge.read", "knowledge.search", "project.read", "project.update", "project.manage", "decision.create", "decision.read", "log.write", "review.request", "review.approve", "review.reject", "customer_data.read", "marketing.generate"]'::jsonb),
          ('reviewer', '["knowledge.read", "knowledge.search", "project.read", "decision.read", "review.request", "review.approve", "review.reject"]'::jsonb),
          ('user', '["knowledge.read", "knowledge.search", "project.read", "decision.create", "decision.read", "review.request"]'::jsonb),
          ('partner', '["knowledge.read", "knowledge.search", "project.read", "decision.read", "review.request", "review.approve", "review.reject"]'::jsonb)
        ON CONFLICT (role) DO NOTHING
      `);
    } catch (error) {
      // Migration might already exist, continue
      console.warn("Migration setup warning:", error);
    }

    const app = await createTestApp({ pool });
    request = app.request;
    closeApp = app.close;
    userRolesService = app.moduleRef.get(UserRolesService);
    policyEngine = app.moduleRef.get(PolicyEngine);
  });

  afterAll(async () => {
    await closeApp?.();
    await pool?.end();
  });

  beforeEach(async () => {
    // Clean up test data
    await pool.query(`DELETE FROM user_roles WHERE user_id IN ($1, $2)`, [testUserId, adminUserId]);
    await pool.query(`DELETE FROM user_permissions WHERE user_id IN ($1, $2)`, [testUserId, adminUserId]);
  });

  it("Test G: Role assignment grants permissions", async () => {
    // Arrange: User has no roles
    const rolesBefore = await userRolesService.getRoles(testUserId);
    expect(rolesBefore).toEqual([]);

    // Act: Assign reviewer role
    await userRolesService.assignRole(testUserId, "reviewer", adminUserId);

    // Assert: User has reviewer role
    const rolesAfter = await userRolesService.getRoles(testUserId);
    expect(rolesAfter).toContain("reviewer");

    // Assert: User has reviewer permissions
    const permissions = await userRolesService.getPermissions(testUserId);
    expect(permissions).toContain("review.approve");
    expect(permissions).toContain("review.reject");
    expect(permissions).toContain("knowledge.read");
    expect(permissions).not.toContain("project.manage"); // Admin-only permission
  });

  it("Test H: Role revocation removes permissions", async () => {
    // Arrange: Assign reviewer role
    await userRolesService.assignRole(testUserId, "reviewer", adminUserId);
    const permissionsBefore = await userRolesService.getPermissions(testUserId);
    expect(permissionsBefore).toContain("review.approve");

    // Act: Revoke reviewer role
    await userRolesService.revokeRole(testUserId, "reviewer");

    // Assert: User no longer has reviewer role
    const rolesAfter = await userRolesService.getRoles(testUserId);
    expect(rolesAfter).not.toContain("reviewer");

    // Assert: User no longer has reviewer permissions
    const permissionsAfter = await userRolesService.getPermissions(testUserId);
    expect(permissionsAfter).not.toContain("review.approve");
    expect(permissionsAfter).not.toContain("review.reject");
  });

  it("Test I: Unauthorized access is blocked (missing permission)", async () => {
    // Arrange: User has no roles (no permissions)
    const permissions = await userRolesService.getPermissions(testUserId);
    expect(permissions).toEqual([]);

    // Act: Try to authorize operation requiring customer_data.read
    const policyCtx: PolicyContext = {
      userId: testUserId,
      clientId: testClientId,
    };

    await expect(
      policyEngine.authorize(policyCtx, "customer_data.executeReadModel", {
        clientId: testClientId,
        operationId: "test_operation",
      })
    ).rejects.toThrow("PERMISSION_DENIED");
  });

  it("Test J: Role hierarchy works (admin > reviewer > user)", async () => {
    // Arrange: Assign user role
    await userRolesService.assignRole(testUserId, "user", adminUserId);

    // Act & Assert: User role cannot approve reviews
    const policyCtx: PolicyContext = {
      userId: testUserId,
    };

    await expect(
      policyEngine.authorize(policyCtx, "review.approve", { reviewId: "test_review" })
    ).rejects.toThrow("ROLE_REQUIRED");

    // Act: Upgrade to reviewer role
    await userRolesService.assignRole(testUserId, "reviewer", adminUserId);

    // Assert: Reviewer can approve reviews
    await expect(
      policyEngine.authorize(policyCtx, "review.approve", { reviewId: "test_review" })
    ).resolves.toBeDefined();

    // Act: Upgrade to admin role
    await userRolesService.assignRole(testUserId, "admin", adminUserId);

    // Assert: Admin can approve reviews (inherits reviewer permissions)
    await expect(
      policyEngine.authorize(policyCtx, "review.approve", { reviewId: "test_review" })
    ).resolves.toBeDefined();

    // Assert: Admin has all permissions
    const adminPermissions = await userRolesService.getPermissions(testUserId);
    expect(adminPermissions).toContain("project.manage");
    expect(adminPermissions).toContain("review.approve");
    expect(adminPermissions).toContain("customer_data.read");
  });

  it("Test K: Explicit permissions work (additive to roles)", async () => {
    // Arrange: User has user role (no customer_data.read)
    await userRolesService.assignRole(testUserId, "user", adminUserId);
    const permissionsBefore = await userRolesService.getPermissions(testUserId);
    expect(permissionsBefore).not.toContain("customer_data.read");

    // Act: Grant explicit permission
    await userRolesService.grantPermission(testUserId, "customer_data.read", adminUserId);

    // Assert: User now has customer_data.read (role + explicit)
    const permissionsAfter = await userRolesService.getPermissions(testUserId);
    expect(permissionsAfter).toContain("customer_data.read");
    expect(permissionsAfter).toContain("decision.create"); // From user role

    // Act: Revoke explicit permission
    await userRolesService.revokePermission(testUserId, "customer_data.read");

    // Assert: Permission removed, but role permissions remain
    const permissionsAfterRevoke = await userRolesService.getPermissions(testUserId);
    expect(permissionsAfterRevoke).not.toContain("customer_data.read");
    expect(permissionsAfterRevoke).toContain("decision.create"); // Still from user role
  });

  it("Test L: Unauthorized review approval is blocked", async () => {
    // Arrange: User has user role (no reviewer permissions)
    await userRolesService.assignRole(testUserId, "user", adminUserId);
    const permissions = await userRolesService.getPermissions(testUserId);
    expect(permissions).not.toContain("review.approve");

    // Act: Try to approve review via API
    const response = await request
      .post("/reviews/test_review_id/approve")
      .set("X-User-Id", testUserId)
      .send({
        reviewerUserId: testUserId,
        reviewerRoles: [], // No roles in request
      })
      .expect(401); // Unauthorized

    // Assert: Error message indicates role required
    expect(response.body.message || response.text).toMatch(/denied|role|unauthorized/i);
  });

  it("Test M: Unauthorized project phase update is blocked", async () => {
    // Arrange: User has no roles (no project.update permission)
    const permissions = await userRolesService.getPermissions(testUserId);
    expect(permissions).not.toContain("project.update");

    // Act: Try to update project phase via API
    const response = await request
      .put(`/projects/${projectId}/phase`)
      .set("X-User-Id", testUserId)
      .send({
        phase: "discovery",
        userId: testUserId,
      })
      .expect(401); // Unauthorized

    // Assert: Error message indicates permission denied
    expect(response.body.message || response.text).toMatch(/denied|permission|unauthorized/i);
  });

  it("Test N: Authorized project phase update succeeds", async () => {
    // Arrange: User has project.update permission (via admin role)
    await userRolesService.assignRole(testUserId, "admin", adminUserId);
    const permissions = await userRolesService.getPermissions(testUserId);
    expect(permissions).toContain("project.update");

    // Act: Update project phase via API
    const response = await request
      .put(`/projects/${projectId}/phase`)
      .set("X-User-Id", testUserId)
      .send({
        phase: "discovery",
        userId: testUserId,
      })
      .expect(200); // Success

    // Assert: Phase update succeeded
    expect(response.body.ok).toBe(true);
    expect(response.body.phase).toBe("discovery");
  });

  it("Test O: Unauthorized decision creation is blocked", async () => {
    // Arrange: User has no roles (no decision.create permission)
    await pool.query(`DELETE FROM user_roles WHERE user_id = $1`, [testUserId]);
    const permissions = await userRolesService.getPermissions(testUserId);
    expect(permissions).not.toContain("decision.create");

    // Act: Try to create decision via API
    const response = await request
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
        userId: testUserId,
      })
      .expect(401); // Unauthorized

    // Assert: Error message indicates permission denied
    expect(response.body.message || response.text).toMatch(/denied|permission|unauthorized/i);
  });

  it("Test P: Authorized decision creation succeeds", async () => {
    // Arrange: User has decision.create permission (via user role)
    await userRolesService.assignRole(testUserId, "user", adminUserId);
    const permissions = await userRolesService.getPermissions(testUserId);
    expect(permissions).toContain("decision.create");

    // Act: Create decision via API
    const response = await request
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
        userId: testUserId,
      })
      .expect(201); // Created

    // Assert: Decision created successfully
    expect(response.body.id).toBeDefined();
    expect(response.body.title).toBe("Test Decision");
    expect(response.body.status).toBe("draft");
  });
});

