import { Pool } from "pg";
import { createTestApp } from "../_utils/createTestApp";
import { seedProject } from "../_utils/seed";
import type { SuperTest, Test } from "supertest";

describe("golden-tasks (smoke)", () => {
  const databaseUrl = process.env.DATABASE_URL;
  const projectId = process.env.TEST_PROJECT_ID;

  let pool: Pool;
  let closeApp: () => Promise<void>;
  let request: SuperTest<Test>;

  beforeAll(async () => {
    if (!databaseUrl) throw new Error("DATABASE_URL must be set to run Golden Task tests.");
    if (!projectId) throw new Error("TEST_PROJECT_ID must be set to run Golden Task tests.");

    pool = new Pool({ connectionString: databaseUrl });
    await seedProject(pool, { projectId });

    const app = await createTestApp({ pool });
    request = app.request;
    closeApp = app.close;
  });

  afterAll(async () => {
    await closeApp?.();
    await pool?.end();
  });

  it("GT-smoke: can create a draft decision via REST", async () => {
    const res = await request
      .post(`/projects/${projectId}/decisions/draft`)
      .send({
        title: "Golden Task Smoke Draft",
        owner: "tester",
        assumptions: ["a1"],
        alternatives: ["alt1"],
        risks: ["r1"],
        successCriteria: ["s1"],
        nextSteps: ["n1"],
      })
      .expect(201);

    expect(res.body).toMatchObject({
      projectId,
      status: "draft",
      title: "Golden Task Smoke Draft",
      owner: "tester",
    });
    expect(typeof res.body.id).toBe("string");
    expect(res.body.id).toMatch(/^dec_/);
  });
});
