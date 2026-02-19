import { Test, TestingModule } from "@nestjs/testing";
import { PG_POOL } from "../../db/db.module";
import { AnalyticsService } from "./analytics.service";
import type { Pool } from "pg";
import type { Clock } from "@agent-system/governance-v2/runtime/clock";

const createFakeClock = (nowIso: string): Clock =>
  ({
    now: () => {
      const d = new Date(nowIso);
      return {
        getTime: () => d.getTime(),
        toISOString: () => d.toISOString(),
      };
    },
  }) as unknown as Clock;

describe("AnalyticsService", () => {
  let service: AnalyticsService;
  const mockQuery = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PG_POOL, useValue: { query: mockQuery } },
      ],
    })
      .overrideProvider(AnalyticsService)
      .useFactory({
        factory: (pool: Pool) =>
          new AnalyticsService(pool, createFakeClock("2026-02-19T12:00:00.000Z")),
        inject: [PG_POOL],
      })
      .compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("rate calculations", () => {
    it("skillSuccessRate is 0 when no skills", async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: "0" }] });
      const overview = await service.getOverview(
        "2026-02-12T00:00:00Z",
        "2026-02-19T23:59:59Z"
      );
      expect(overview.skillSuccessRate).toBe(0);
    });

    it("skillSuccessRate is 1 when all executed", async () => {
      mockQuery.mockImplementation((_q: string) => {
        if (_q.includes("skill.executed") && !_q.includes("skill.blocked")) {
          return Promise.resolve({ rows: [{ count: "10" }] });
        }
        if (_q.includes("skill.blocked")) {
          return Promise.resolve({ rows: [{ count: "0" }] });
        }
        return Promise.resolve({ rows: [{ count: "5" }] });
      });
      const overview = await service.getOverview(
        "2026-02-12T00:00:00Z",
        "2026-02-19T23:59:59Z"
      );
      expect(overview.skillSuccessRate).toBe(1);
    });

    it("skillSuccessRate is 0.5 when half executed", async () => {
      mockQuery.mockImplementation((_q: string) => {
        if (_q.includes("skill.executed") && !_q.includes("skill.blocked")) {
          return Promise.resolve({ rows: [{ count: "5" }] });
        }
        if (_q.includes("skill.blocked")) {
          return Promise.resolve({ rows: [{ count: "5" }] });
        }
        return Promise.resolve({ rows: [{ count: "5" }] });
      });
      const overview = await service.getOverview(
        "2026-02-12T00:00:00Z",
        "2026-02-19T23:59:59Z"
      );
      expect(overview.skillSuccessRate).toBe(0.5);
    });
  });

  describe("null safety", () => {
    it("handles null count from DB", async () => {
      mockQuery.mockResolvedValue({ rows: [{}] });
      const overview = await service.getOverview(
        "2026-02-12T00:00:00Z",
        "2026-02-19T23:59:59Z"
      );
      expect(overview.totalEvents).toBe(0);
    });

    it("throws on invalid date range > 90 days", async () => {
      await expect(
        service.getOverview("2025-01-01T00:00:00Z", "2026-06-01T00:00:00Z")
      ).rejects.toThrow("Date range must not exceed 90 days");
    });

    it("throws on from > to", async () => {
      await expect(
        service.getOverview("2026-02-19T00:00:00Z", "2026-02-12T00:00:00Z")
      ).rejects.toThrow("from must be before to");
    });
  });
});
