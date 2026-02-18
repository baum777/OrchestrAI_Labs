// Set working directory to repo root before any imports (for profile loader)
import * as path from "path";
const repoRoot = path.resolve(__dirname, "../../../..");
process.chdir(repoRoot);

import { INestApplication } from "@nestjs/common";
import request from "supertest";
import * as fs from "fs";
import { createTestApp } from "../_utils/createTestApp";

describe("Golden Tasks E2E", () => {
  let app: INestApplication;
  let httpRequest: ReturnType<typeof request>;
  const projectId = process.env.TEST_PROJECT_ID || "proj_test";

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set to run Golden Task tests.");
    }
    const testApp = await createTestApp();
    app = testApp.app;
    httpRequest = testApp.request;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  const loadFixture = (taskId: string, filename: string): any => {
    const fixturePath = path.join(
      repoRoot,
      "testdata/golden-tasks",
      taskId,
      filename
    );
    const content = fs.readFileSync(fixturePath, "utf-8");
    return JSON.parse(content);
  };

  describe("GT-001: Website Relaunch Budget Overrun", () => {
    it("should create draft decision successfully", async () => {
      const input = loadFixture("GT-001", "input.createDraft.json");
      const expected = loadFixture("GT-001", "expected.assertions.json");

      const response = await httpRequest
        .post(`/projects/${projectId}/decisions/draft`)
        .send(input)
        .expect(201);

      // Status check
      expect(response.body.status).toBe(expected.expect.draftStatus);

      // Review ID should not be present for drafts
      if (expected.expect.reviewIdPresent === false) {
        expect(response.body.reviewId).toBeUndefined();
      }

      // Required fields non-empty
      for (const field of expected.expect.requiredFieldsNonEmpty) {
        expect(response.body[field]).toBeDefined();
        expect(Array.isArray(response.body[field])).toBe(true);
        expect(response.body[field].length).toBeGreaterThan(0);
      }

      // Additional assertions: arrays should have content
      expect(response.body.assumptions.length).toBeGreaterThan(0);
      expect(response.body.alternatives.length).toBeGreaterThan(0);
      expect(response.body.risks.length).toBeGreaterThan(0);
      expect(response.body.successCriteria.length).toBeGreaterThan(0);
      expect(response.body.nextSteps.length).toBeGreaterThan(0);
    });
  });

  describe("GT-002: CRM Selection", () => {
    it("should create draft decision successfully", async () => {
      const input = loadFixture("GT-002", "input.createDraft.json");
      const expected = loadFixture("GT-002", "expected.assertions.json");

      const response = await httpRequest
        .post(`/projects/${projectId}/decisions/draft`)
        .send(input)
        .expect(201);

      // Status check
      expect(response.body.status).toBe(expected.expect.draftStatus);

      // Review ID should not be present for drafts
      if (expected.expect.reviewIdPresent === false) {
        expect(response.body.reviewId).toBeUndefined();
      }

      // Required fields non-empty
      for (const field of expected.expect.requiredFieldsNonEmpty) {
        expect(response.body[field]).toBeDefined();
        expect(Array.isArray(response.body[field])).toBe(true);
        expect(response.body[field].length).toBeGreaterThan(0);
      }

      // Additional assertions: arrays should have content
      expect(response.body.assumptions.length).toBeGreaterThan(0);
      expect(response.body.alternatives.length).toBeGreaterThan(0);
      expect(response.body.risks.length).toBeGreaterThan(0);
      expect(response.body.successCriteria.length).toBeGreaterThan(0);
      expect(response.body.nextSteps.length).toBeGreaterThan(0);
    });
  });

  describe("Monitoring Smoke Check", () => {
    it("should return drift metrics with expected keys", async () => {
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const to = new Date().toISOString();

      const response = await httpRequest
        .get(`/monitoring/drift?from=${from}&to=${to}`)
        .expect(200);

      // Check that metrics object exists
      expect(response.body.metrics).toBeDefined();
      expect(typeof response.body.metrics).toBe("object");

      // Check for expected metric keys (shape check, no hard values)
      const metrics = response.body.metrics;
      expect(metrics).toHaveProperty("reviewRejectionRate");
      expect(metrics).toHaveProperty("missingLogIncidents");
      expect(metrics).toHaveProperty("reworkCount");
      expect(metrics).toHaveProperty("escalationRate");
      expect(metrics).toHaveProperty("decisionCompleteness");
    });
  });
});

