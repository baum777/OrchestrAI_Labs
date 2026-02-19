import { Controller, Get, Query } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsQueryDto } from "./dto/analytics-query.dto";

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("overview")
  async getOverview(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getOverview(
      query.from,
      query.to,
      query.projectId,
      query.clientId,
      query.agentId
    );
  }

  @Get("skills")
  async getSkills(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getSkills(
      query.from,
      query.to,
      query.projectId,
      query.clientId,
      query.agentId
    );
  }

  @Get("reviews")
  async getReviews(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getReviews(
      query.from,
      query.to,
      query.projectId,
      query.clientId
    );
  }

  @Get("governance")
  async getGovernance(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getGovernance(
      query.from,
      query.to,
      query.projectId,
      query.clientId,
      query.agentId
    );
  }

  @Get("time")
  async getTime(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getTime(
      query.from,
      query.to,
      query.projectId,
      query.clientId,
      query.agentId
    );
  }
}
