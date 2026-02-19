import { Body, Controller, Post } from "@nestjs/common";
import type { Permission, ToolRef } from "@shared/types/agent";
import { Orchestrator } from "@agent-runtime/orchestrator/orchestrator";

type ExecuteDto = {
  agentId: string;
  userId: string;
  projectId?: string;
  clientId?: string;
  userMessage: string;
  intendedAction?: {
    permission: Permission;
    toolCalls: { tool: ToolRef; input: unknown }[];
  };
  skillRequest?: {
    skillId: string;
    version?: string;
    input: unknown;
  };
};

@Controller("agents")
export class AgentsController {
  constructor(private readonly orchestrator: Orchestrator) {}

  @Post("execute")
  async execute(@Body() body: ExecuteDto) {
    const ctx = { userId: body.userId, projectId: body.projectId, clientId: body.clientId };
    return this.orchestrator.run(ctx, {
      agentId: body.agentId,
      userMessage: body.userMessage,
      intendedAction: body.intendedAction,
      skillRequest: body.skillRequest,
    });
  }
}

