import { AgentDomain } from "@agent-system/shared";
import { BaseAgent } from "../agents/base-agent";

export class AgentSelector {
  select(domain: AgentDomain, agents: BaseAgent[]): BaseAgent | undefined {
    const exactMatch = agents.find((agent) => agent.profile.domain === domain);
    if (exactMatch) {
      return exactMatch;
    }

    return agents[0];
  }
}

