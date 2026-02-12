import { AgentProfile } from "@agent-system/shared";
import knowledgeProfile from "../profiles/knowledge.json";
import { AgentRuntimeContext, BaseAgent } from "./base-agent";

export const knowledgeAgentProfile: AgentProfile = knowledgeProfile as AgentProfile;

export class KnowledgeAgent extends BaseAgent {
  constructor(context: AgentRuntimeContext) {
    super(knowledgeAgentProfile, context);
  }

  async handle(input: string): Promise<unknown> {
    return this.context.knowledge.query(input, { source: "vector-store" });
  }
}

