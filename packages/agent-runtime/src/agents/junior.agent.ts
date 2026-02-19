import { AgentProfile } from "@agent-system/shared";
import juniorProfile from "../profiles/junior.json" with { type: "json" };
import { AgentRuntimeContext, BaseAgent } from "./base-agent.js";

export const juniorAgentProfile: AgentProfile = juniorProfile as AgentProfile;

export class JuniorAgent extends BaseAgent {
  constructor(context: AgentRuntimeContext) {
    super(juniorAgentProfile, context);
  }

  async handle(input: string): Promise<unknown> {
    await this.runTool("code-commit", {
      message: "Junior Agent Update",
      body: input
    });

    return this.runTool("tool-execution", { command: "format", options: {} });
  }
}

