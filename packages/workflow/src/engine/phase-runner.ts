import { WorkflowDefinition, ProjectPhase } from "../models/project-phase";

export class PhaseRunner {
  constructor(private readonly definition: WorkflowDefinition) {}

  getPhase(id: string): ProjectPhase | undefined {
    return this.definition.phases.find((phase) => phase.id === id);
  }

  getNextPhase(currentId: string): ProjectPhase | undefined {
    const current = this.getPhase(currentId);
    if (!current || !current.nextPhaseId) {
      return undefined;
    }

    return this.getPhase(current.nextPhaseId);
  }
}

