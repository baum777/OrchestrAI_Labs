import { AgentProfile } from "@agent-system/shared";
import governanceProfile from "../profiles/governance.json" with { type: "json" };
import { AgentRuntimeContext, BaseAgent } from "./base-agent.js";

export const governanceAgentProfile: AgentProfile =
  governanceProfile as AgentProfile;

export class GovernanceAgent extends BaseAgent {
  constructor(context: AgentRuntimeContext) {
    super(governanceAgentProfile, context);
  }

  async handle(input: string): Promise<unknown> {
    await this.context.governance.logAction("default-project", `Review-${input}`);

    if (input.includes("violate")) {
      await this.runTool("log-escalate", { reason: "Policy violation detected" });
    }

    return this.runTool("log-review", { summary: input });
  }
}

