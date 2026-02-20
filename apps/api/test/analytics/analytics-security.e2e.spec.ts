/**
 * Analytics v1 Security Hardening E2E Tests
 *
 * Verifies: 401 unauthenticated, 403 no permission, 403 tenant mismatch, 400 invalid dates.
 * NOTE: Requires full app (AppModule) + DATABASE_URL + migrations 007, 009.
 * Run: DATABASE_URL=postgresql://... pnpm -C apps/api test test/analytics/analytics-security
 * Security behavior is covered by controller unit tests with mocked guards.
 */
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { DbModule } from "../../src/db/db.module";
import { AnalyticsModule } from "../../src/modules/analytics/analytics.module";
import { UsersModule } from "../../src/modules/users/users.module";
import { UserRolesService } from "../../src/modules/users/user-roles.service";
import { ConsentService } from "../../src/modules/users/consent.service";
import { DataDeletionService } from "../../src/modules/users/data-deletion.service";

describe.skip("Analytics Security E2E (requires full AppModule + DATABASE_URL)", () => {
  let app: INestApplication;
  let userRolesService: UserRolesService;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) return;
    const moduleRef = await Test.createTestingModule({
      imports: [DbModule, UsersModule, AnalyticsModule],
    })
      .overrideProvider(ConsentService)
      .useValue({ hasConsent: async () => true })
      .overrideProvider(DataDeletionService)
      .useValue({ deleteUserData: async () => ({ anonymizedCount: 0 }) })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    userRolesService = moduleRef.get<UserRolesService>(UserRolesService);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("unauthenticated request returns 401", async () => {
    if (!app) return;
    const res = await request(app.getHttpServer())
      .get("/analytics/overview")
      .expect(401);
    expect(res.body.message).toMatch(/Authentication required|X-User-Id/i);
  });

  it("missing X-Client-Id returns 403 (fail closed)", async () => {
    if (!app) return;
    const res = await request(app.getHttpServer())
      .get("/analytics/overview")
      .set("X-User-Id", "some-user")
      .expect(403);
    expect(res.body.message).toMatch(/X-Client-Id|Tenant context/i);
  });

  it("authenticated without analytics.read returns 403", async () => {
    if (!app) return;
    const userId = "no-analytics-user-" + Date.now();
    try {
      await userRolesService.assignRole(userId, "user", "system");
    } catch {
      /**/
    }

    await request(app.getHttpServer())
      .get("/analytics/overview")
      .set("X-User-Id", userId)
      .set("X-Client-Id", "test-client")
      .expect(403);
  });

  it("authenticated with analytics.read and X-Client-Id returns 200", async () => {
    if (!app) return;
    const userId = "analytics-test-user-" + Date.now();
    try {
      await userRolesService.assignRole(userId, "admin", "system");
    } catch {
      // Role may already exist
    }

    const res = await request(app.getHttpServer())
      .get("/analytics/overview")
      .set("X-User-Id", userId)
      .set("X-Client-Id", "test-client-analytics")
      .expect(200);

    expect(res.body).toHaveProperty("totalEvents");
  });

  it("tenant mismatch (query clientId != X-Client-Id) returns 403", async () => {
    if (!app) return;
    const userId = "analytics-tenant-test-" + Date.now();
    try {
      await userRolesService.assignRole(userId, "admin", "system");
    } catch {
      /**/
    }

    await request(app.getHttpServer())
      .get("/analytics/overview")
      .set("X-User-Id", userId)
      .set("X-Client-Id", "allowed-client")
      .query({ clientId: "other-client" })
      .expect(403);
  });

  it("invalid date range (from > to) returns 400", async () => {
    if (!app) return;
    const userId = "analytics-date-test-" + Date.now();
    try {
      await userRolesService.assignRole(userId, "admin", "system");
    } catch {
      /**/
    }

    const res = await request(app.getHttpServer())
      .get("/analytics/overview")
      .set("X-User-Id", userId)
      .set("X-Client-Id", "test-client")
      .query({
        from: "2026-02-19T00:00:00Z",
        to: "2026-02-18T00:00:00Z",
      })
      .expect(400);

    expect(res.body.message).toMatch(/from must be before to|Invalid date/i);
  });

  it("date range > 90 days returns 400", async () => {
    if (!app) return;
    const userId = "analytics-range-test-" + Date.now();
    try {
      await userRolesService.assignRole(userId, "admin", "system");
    } catch {
      /**/
    }

    const res = await request(app.getHttpServer())
      .get("/analytics/overview")
      .set("X-User-Id", userId)
      .set("X-Client-Id", "test-client")
      .query({
        from: "2025-01-01T00:00:00Z",
        to: "2026-06-01T00:00:00Z",
      })
      .expect(400);

    expect(res.body.message).toMatch(/90 days|exceed/i);
  });
});
