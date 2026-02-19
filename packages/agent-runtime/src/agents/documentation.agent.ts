import { AgentProfile } from "@agent-system/shared";
import documentationProfile from "../profiles/documentation.json" with { type: "json" };
import { AgentRuntimeContext, BaseAgent } from "./base-agent.js";

export const documentationAgentProfile: AgentProfile =
  documentationProfile as AgentProfile;

export class DocumentationAgent extends BaseAgent {
  constructor(context: AgentRuntimeContext) {
    super(documentationAgentProfile, context);
  }

  async handle(input: string): Promise<unknown> {
    return this.runTool("document-write", {
      title: "Generated Documentation",
      body: `Input:\n${input}\n\nSources: auto-managed`
    });
  }
}

