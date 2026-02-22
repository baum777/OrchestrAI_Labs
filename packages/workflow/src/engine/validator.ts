import { WorkflowDefinition, ProjectPhase } from "../models/project-phase.js";

export class WorkflowValidator {
  static validateDefinition(definition: WorkflowDefinition): boolean {
    return definition.phases.every((phase: ProjectPhase) => phase.id && phase.name);
  }
}

