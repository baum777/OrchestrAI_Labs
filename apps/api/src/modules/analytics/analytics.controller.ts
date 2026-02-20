import {
  Controller,
  Get,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Req,
  ForbiddenException,
} from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsQueryDto } from "./dto/analytics-query.dto";
import { AnalyticsAuthGuard } from "../../auth/analytics-auth.guard";

interface RequestWithAnalytics {
  analyticsUserId: string;
  analyticsClientId?: string;
  analyticsProjectId?: string;
}

@Controller("analytics")
@UseGuards(AnalyticsAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  private resolveTenantBoundParams(
    req: RequestWithAnalytics,
    query: AnalyticsQueryDto
  ): { clientId?: string; projectId?: string } {
    const boundClientId = req.analyticsClientId;
    const boundProjectId = req.analyticsProjectId;

    // Tenant binding: clientId required for tenant-scoped access (fail closed)
    if (!boundClientId) {
      throw new ForbiddenException(
        "Tenant context required: clientId must be provided (X-Client-Id in dev, req.user.clientId in production)"
      );
    }

    // Query params may only narrow, never expand
    if (query.clientId && query.clientId !== boundClientId) {
      throw new ForbiddenException(
        "Tenant mismatch: clientId in query does not match authenticated context"
      );
    }
    if (query.projectId && boundProjectId && query.projectId !== boundProjectId) {
      throw new ForbiddenException(
        "Tenant mismatch: projectId in query does not match authenticated context"
      );
    }

    return {
      clientId: boundClientId,
      projectId: boundProjectId ?? query.projectId,
    };
  }

  @Get("overview")
  async getOverview(@Query() query: AnalyticsQueryDto, @Req() req: RequestWithAnalytics) {
    const { clientId, projectId } = this.resolveTenantBoundParams(req, query);
    return this.analyticsService.getOverview(
      query.from,
      query.to,
      projectId,
      clientId,
      query.agentId
    );
  }

  @Get("skills")
  async getSkills(@Query() query: AnalyticsQueryDto, @Req() req: RequestWithAnalytics) {
    const { clientId, projectId } = this.resolveTenantBoundParams(req, query);
    return this.analyticsService.getSkills(
      query.from,
      query.to,
      projectId,
      clientId,
      query.agentId
    );
  }

  @Get("reviews")
  async getReviews(@Query() query: AnalyticsQueryDto, @Req() req: RequestWithAnalytics) {
    const { clientId, projectId } = this.resolveTenantBoundParams(req, query);
    return this.analyticsService.getReviews(
      query.from,
      query.to,
      projectId,
      clientId
    );
  }

  @Get("governance")
  async getGovernance(@Query() query: AnalyticsQueryDto, @Req() req: RequestWithAnalytics) {
    const { clientId, projectId } = this.resolveTenantBoundParams(req, query);
    return this.analyticsService.getGovernance(
      query.from,
      query.to,
      projectId,
      clientId,
      query.agentId
    );
  }

  @Get("time")
  async getTime(@Query() query: AnalyticsQueryDto, @Req() req: RequestWithAnalytics) {
    const { clientId, projectId } = this.resolveTenantBoundParams(req, query);
    return this.analyticsService.getTime(
      query.from,
      query.to,
      projectId,
      clientId,
      query.agentId
    );
  }
}
