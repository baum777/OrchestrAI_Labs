import { AgentProfile } from "@agent-system/shared";

export interface KnowledgeClient {
  query: (prompt: string, opts?: Record<string, unknown>) => Promise<unknown>;
  ingest?: (chunks: unknown[]) => Promise<void>;
}

export interface WorkflowClient {
  getProjectState: (projectId: string) => Promise<Record<string, unknown>>;
  advancePhase: (projectId: string, phase: string) => Promise<void>;
}

export interface GovernanceClient {
  logAction: (projectId: string, details: string) => Promise<void>;
  reviewAction: (actionId: string) => Promise<boolean>;
}

export interface AgentRuntimeContext {
  tools: Record<string, (payload: unknown) => Promise<unknown>>;
  knowledge: KnowledgeClient;
  workflow: WorkflowClient;
  governance: GovernanceClient;
}

export abstract class BaseAgent {
  protected readonly tools: AgentRuntimeContext["tools"];

  constructor(
    public readonly profile: AgentProfile,
    protected readonly context: AgentRuntimeContext
  ) {
    this.tools = context.tools;
  }

  protected async runTool(toolId: string, payload: unknown): Promise<unknown> {
    const handler = this.tools[toolId];
    if (!handler) {
      throw new Error(`Tool ${toolId} is not registered for agent ${this.profile.id}`);
    }

    return handler(payload);
  }

  abstract handle(input: string, metadata?: Record<string, unknown>): Promise<unknown>;
}

