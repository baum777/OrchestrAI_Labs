import { BaseAgent } from "../agents/base-agent.js";

export class AgentExecutor {
  async execute(agent: BaseAgent, input: string, metadata?: Record<string, unknown>): Promise<unknown> {
    return agent.handle(input, metadata);
  }
}

