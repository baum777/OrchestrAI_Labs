import type { AgentProfile, ToolRef } from "@shared/types/agent";
import { enforcePermission } from "@governance/policies/enforcement";
import { TOOL_PERMISSION_MAP } from "./tool-permissions";

export type ToolContext = {
  projectId?: string;
  clientId?: string;
  userId: string;
};

export type ToolCall = {
  tool: ToolRef;
  input: unknown;
};

export type ToolResult = {
  ok: boolean;
  output?: unknown;
  error?: string;
};

export interface ToolHandler {
  call(ctx: ToolContext, input: unknown): Promise<ToolResult>;
}

export class ToolRouter {
  constructor(private readonly handlers: Record<string, ToolHandler>) {}

  async execute(profile: AgentProfile, ctx: ToolContext, call: ToolCall): Promise<ToolResult> {
    if (!profile.tools.includes(call.tool)) {
      return { ok: false, error: `Tool not allowed for agent: ${call.tool}` };
    }

    const requiredPerm = TOOL_PERMISSION_MAP[call.tool];
    enforcePermission(profile, requiredPerm);

    const handler = this.handlers[call.tool];
    if (!handler) {
      return { ok: false, error: `Tool handler not implemented: ${call.tool}` };
    }

    return handler.call(ctx, call.input);
  }
}

