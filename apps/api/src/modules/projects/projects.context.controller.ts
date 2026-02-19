import { Body, Controller, Get, Param, Put, BadRequestException, Inject, UnauthorizedException } from "@nestjs/common";
import { ProjectsService } from "./projects.service";
import { PostgresActionLogger } from "../../runtime/postgres-action-logger";
import type { ProjectPhase } from "@shared/types/project-phase";
import { PolicyEngine, PolicyError, type PolicyContext } from "@governance/policy/policy-engine";

@Controller("projects")
export class ProjectsContextController {
  constructor(
    private readonly projects: ProjectsService,
    @Inject(PostgresActionLogger) private readonly logger: PostgresActionLogger,
    private readonly policyEngine: PolicyEngine
  ) {}

  @Get(":projectId/context")
  async getContext(@Param("projectId") projectId: string) {
    if (!projectId || projectId.trim().length === 0) {
      throw new BadRequestException("projectId is required");
    }

    return this.projects.getContext(projectId.trim());
  }

  @Put(":projectId/phase")
  async updatePhase(
    @Param("projectId") projectId: string,
    @Body() body: { phase: ProjectPhase; userId?: string; clientId?: string }
  ) {
    if (!projectId || projectId.trim().length === 0) {
      throw new BadRequestException("projectId is required");
    }

    if (!body.phase) {
      throw new BadRequestException("phase is required");
    }

    const validPhases: ProjectPhase[] = ["discovery", "design", "delivery", "review"];
    if (!validPhases.includes(body.phase)) {
      throw new BadRequestException(`phase must be one of: ${validPhases.join(", ")}`);
    }

    // Extract userId from body or use "system" as fallback (MVP)
    // In production, this should come from auth context (JWT)
    const userId = body.userId || "system";
    const clientId = body.clientId;
    const agentId = "system";

    // PHASE 2: PolicyEngine authorization (RBAC enforcement)
    const policyCtx: PolicyContext = {
      userId,
      projectId: projectId.trim(),
      clientId,
    };

    try {
      await this.policyEngine.authorize(policyCtx, "project.phase.update", {
        projectId: projectId.trim(),
        phase: body.phase,
      });
    } catch (error) {
      if (error instanceof PolicyError) {
        throw new UnauthorizedException(`Project phase update denied: ${error.message}`);
      }
      throw error;
    }

    await this.projects.updatePhase(projectId.trim(), body.phase, this.logger, agentId, userId, clientId);
    return { ok: true, projectId: projectId.trim(), phase: body.phase };
  }
}

