/**
 * Analytics v1 Security Hardening E2E Tests
 *
 * Verifies: 401 unauthenticated, 403 no permission, 403 tenant mismatch, 400 invalid dates.
 * Uses minimal bootstrap: mocked AnalyticsAuthGuard + mocked AnalyticsService. No DB required.
 */
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { UnauthorizedException, ForbiddenException } from "@nestjs/common";
import { ExecutionContext } from "@nestjs/common";
import { AnalyticsController } from "../../src/modules/analytics/analytics.controller";
import { AnalyticsService } from "../../src/modules/analytics/analytics.service";
import { AnalyticsAuthGuard } from "../../src/auth/analytics-auth.guard";

type GuardMode = "401" | "403" | "no_client" | "tenant_ok" | "tenant_mismatch";

let guardMode: GuardMode = "tenant_ok";

const mockGuard = {
  canActivate: (ctx: ExecutionContext): boolean => {
    const req = ctx.switchToHttp().getRequest();
    if (guardMode === "401") {
      throw new UnauthorizedException("Authentication required");
    }
    if (guardMode === "403") {
      throw new ForbiddenException("Analytics access denied");
    }
    req.analyticsUserId = "test-user";
    req.analyticsClientId =
      guardMode === "no_client" ? undefined
      : guardMode === "tenant_mismatch" ? "allowed-client"
      : "test-client";
    req.analyticsProjectId = "test-project";
    return true;
  },
};

const mockAnalyticsService = {
  getOverview: async () => ({
    totalEvents: 0,
    totalRuns: 0,
    skillExecuted: 0,
    skillBlocked: 0,
    reviewRequired: 0,
    timeGapDetected: 0,
    policyViolations: 0,
    skillSuccessRate: 0,
    reviewRate: 0,
    timeGapRate: 0,
  }),
};

describe("Analytics Security E2E", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [{ provide: AnalyticsService, useValue: mockAnalyticsService }],
    })
      .overrideGuard(AnalyticsAuthGuard)
      .useValue(mockGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("unauthenticated request returns 401", async () => {
    guardMode = "401";
    const res = await request(app.getHttpServer())
      .get("/analytics/overview")
      .expect(401);
    expect(res.body.message).toMatch(/Authentication required/i);
  });

  it("authenticated without analytics.read returns 403", async () => {
    guardMode = "403";
    const res = await request(app.getHttpServer())
      .get("/analytics/overview")
      .expect(403);
    expect(res.body.message).toMatch(/Analytics access denied|Analytics access/i);
  });

  it("missing tenant context (no clientId from guard) returns 403", async () => {
    guardMode = "no_client";
    const res = await request(app.getHttpServer())
      .get("/analytics/overview")
      .expect(403);
    expect(res.body.message).toMatch(/Tenant context|X-Client-Id/i);
  });

  it("tenant mismatch (query clientId != bound) returns 403", async () => {
    guardMode = "tenant_mismatch";
    const res = await request(app.getHttpServer())
      .get("/analytics/overview")
      .query({ clientId: "other-client" })
      .expect(403);
    expect(res.body.message).toMatch(/Tenant mismatch/i);
  });

  it("valid request returns 200", async () => {
    guardMode = "tenant_ok";
    const res = await request(app.getHttpServer())
      .get("/analytics/overview")
      .expect(200);
    expect(res.body).toHaveProperty("totalEvents");
  });

  it("invalid date range (from > to) returns 400", async () => {
    guardMode = "tenant_ok";
    const res = await request(app.getHttpServer())
      .get("/analytics/overview")
      .query({ from: "2026-02-19T00:00:00Z", to: "2026-02-18T00:00:00Z" })
      .expect(400);
    const msg = Array.isArray(res.body.message) ? res.body.message.join(" ") : res.body.message;
    expect(msg).toMatch(/from must be before to|Invalid date/i);
  });

  it("date range > 90 days returns 400", async () => {
    guardMode = "tenant_ok";
    const res = await request(app.getHttpServer())
      .get("/analytics/overview")
      .query({ from: "2025-01-01T00:00:00Z", to: "2026-06-01T00:00:00Z" })
      .expect(400);
    const msg = Array.isArray(res.body.message) ? res.body.message.join(" ") : res.body.message;
    expect(msg).toMatch(/90 days|exceed/i);
  });
});
