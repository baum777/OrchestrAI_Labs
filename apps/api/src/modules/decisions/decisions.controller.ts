import { Body, Controller, Get, Param, Post, UsePipes, ValidationPipe, UnauthorizedException } from "@nestjs/common";
import { DecisionsService } from "./decisions.service";
import { CreateDecisionDraftDto } from "./dto/create-decision-draft.dto";
import { PolicyEngine, PolicyError, type PolicyContext } from "@governance/policy/policy-engine";

@Controller()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  })
)
export class DecisionsController {
  constructor(
    private readonly decisions: DecisionsService,
    private readonly policyEngine: PolicyEngine
  ) {}

  @Post("projects/:projectId/decisions/draft")
  async createDraft(@Param("projectId") projectId: string, @Body() body: CreateDecisionDraftDto) {
    // PHASE 2: PolicyEngine authorization (RBAC enforcement)
    // Extract userId from body or use owner as fallback
    const bodyWithUserId = body as CreateDecisionDraftDto & { userId?: string };
    const userId = bodyWithUserId.userId || body.owner || "system";
    const clientId = body.clientId;

    const policyCtx: PolicyContext = {
      userId,
      projectId,
      clientId,
    };

    try {
      await this.policyEngine.authorize(policyCtx, "decision.create", {
        projectId,
        title: body.title,
      });
    } catch (error) {
      if (error instanceof PolicyError) {
        throw new UnauthorizedException(`Decision creation denied: ${error.message}`);
      }
      throw error;
    }

    return this.decisions.createDraft(projectId, body);
  }

  @Get("projects/:projectId/decisions")
  async list(@Param("projectId") projectId: string) {
    return this.decisions.listByProject(projectId);
  }

  @Get("decisions/:id")
  async getById(@Param("id") id: string) {
    return this.decisions.getById(id);
  }
}

