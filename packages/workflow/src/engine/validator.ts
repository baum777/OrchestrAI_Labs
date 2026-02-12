import { WorkflowDefinition } from "../models/project-phase";

export class WorkflowValidator {
  static validateDefinition(definition: WorkflowDefinition): boolean {
    return definition.phases.every((phase) => phase.id && phase.name);
  }
}

