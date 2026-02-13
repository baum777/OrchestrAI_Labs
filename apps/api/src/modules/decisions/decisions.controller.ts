import { Body, Controller, Get, Param, Post, UsePipes, ValidationPipe } from "@nestjs/common";
import { DecisionsService } from "./decisions.service";
import { CreateDecisionDraftDto } from "./dto/create-decision-draft.dto";

@Controller()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  })
)
export class DecisionsController {
  constructor(private readonly decisions: DecisionsService) {}

  @Post("projects/:projectId/decisions/draft")
  async createDraft(@Param("projectId") projectId: string, @Body() body: CreateDecisionDraftDto) {
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

