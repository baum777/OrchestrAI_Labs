import { AgentProfile } from "@agent-system/shared";
import projectProfile from "../profiles/project.json" with { type: "json" };
import { AgentRuntimeContext, BaseAgent } from "./base-agent.js";

export const projectAgentProfile: AgentProfile = projectProfile as AgentProfile;

export class ProjectAgent extends BaseAgent {
  constructor(context: AgentRuntimeContext) {
    super(projectAgentProfile, context);
  }

  async handle(input: string): Promise<unknown> {
    const state = await this.context.workflow.getProjectState("default-project");
    await this.context.workflow.advancePhase("default-project", "next");
    return {
      input,
      state,
      hint: "Phase advancement wird nach Überprüfung gemeldet."
    };
  }
}

