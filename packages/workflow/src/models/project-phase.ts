export interface ProjectPhase {
  id: string;
  name: string;
  description: string;
  outcomes: string[];
  nextPhaseId?: string;
  requiresApproval?: boolean;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  phases: ProjectPhase[];
}

