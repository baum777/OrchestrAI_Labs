import { Test, TestingModule } from "@nestjs/testing";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";

describe("AnalyticsController", () => {
  let controller: AnalyticsController;
  const mockAnalyticsService = {
    getOverview: jest.fn().mockResolvedValue({
      totalEvents: 42,
      totalRuns: 10,
      skillExecuted: 2,
      skillBlocked: 1,
      reviewRequired: 0,
      timeGapDetected: 0,
      policyViolations: 0,
      skillSuccessRate: 0.6667,
      reviewRate: 0,
      timeGapRate: 0,
    }),
    getSkills: jest.fn().mockResolvedValue([]),
    getReviews: jest.fn().mockResolvedValue({
      totalReviews: 5,
      approved: 3,
      rejected: 1,
      pending: 1,
      commitTokenUsed: 2,
      commitConversion: 0.6667,
    }),
    getGovernance: jest.fn().mockResolvedValue({
      blockedByAction: [],
      topBlockReasons: [],
      policyViolations: 0,
      decisionFinalizedCount: 1,
    }),
    getTime: jest.fn().mockResolvedValue({
      timeGapDetected: 0,
      lastTimeGapAt: null,
      dailyTrend: [],
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAnalyticsService.getOverview.mockResolvedValue({
      totalEvents: 42,
      totalRuns: 10,
      skillExecuted: 2,
      skillBlocked: 1,
      reviewRequired: 0,
      timeGapDetected: 0,
      policyViolations: 0,
      skillSuccessRate: 0.6667,
      reviewRate: 0,
      timeGapRate: 0,
    });
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        { provide: AnalyticsService, useValue: mockAnalyticsService },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("GET /analytics/overview returns overview", async () => {
    const result = await controller.getOverview({});
    expect(result).toEqual(
      expect.objectContaining({
        totalEvents: 42,
        totalRuns: 10,
        skillSuccessRate: 0.6667,
      })
    );
    expect(mockAnalyticsService.getOverview).toHaveBeenCalledWith(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );
  });

  it("GET /analytics/skills returns skills", async () => {
    const result = await controller.getSkills({});
    expect(result).toEqual([]);
    expect(mockAnalyticsService.getSkills).toHaveBeenCalled();
  });

  it("GET /analytics/reviews returns reviews", async () => {
    const result = await controller.getReviews({});
    expect(result.totalReviews).toBe(5);
    expect(mockAnalyticsService.getReviews).toHaveBeenCalled();
  });

  it("GET /analytics/governance returns governance", async () => {
    const result = await controller.getGovernance({});
    expect(result.decisionFinalizedCount).toBe(1);
    expect(mockAnalyticsService.getGovernance).toHaveBeenCalled();
  });

  it("GET /analytics/time returns time stats", async () => {
    const result = await controller.getTime({});
    expect(result.timeGapDetected).toBe(0);
    expect(mockAnalyticsService.getTime).toHaveBeenCalled();
  });
});
