import { AgentDomain } from "@agent-system/shared";
import { BaseAgent } from "../agents/base-agent.js";

export class AgentSelector {
  select(domain: AgentDomain, agents: BaseAgent[]): BaseAgent | undefined {
    const exactMatch = agents.find((agent) => (agent.profile.domain ?? agent.profile.role) === domain);
    if (exactMatch) {
      return exactMatch;
    }

    return agents[0];
  }
}

