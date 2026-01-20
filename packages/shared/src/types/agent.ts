export type AgentRole =
  | "knowledge"
  | "project"
  | "documentation"
  | "junior"
  | "governance";

export type Permission =
  | "knowledge.read"
  | "knowledge.search"
  | "project.read"
  | "project.update"
  | "decision.create"
  | "decision.read"
  | "log.write"
  | "review.request"
  | "review.approve"
  | "review.reject";

export type ToolRef =
  | "tool.knowledge.search"
  | "tool.knowledge.getSource"
  | "tool.workflow.getPhase"
  | "tool.workflow.validateDeliverable"
  | "tool.docs.createDraft"
  | "tool.docs.updateDraft"
  | "tool.logs.append"
  | "tool.reviews.request"
  | "tool.reviews.status";

export type ReviewPolicy = {
  mode: "none" | "draft_only" | "required";
  requiresHumanFor: Permission[];
  reviewerRoles: ("partner" | "senior" | "admin")[];
  notes?: string;
};

export type EscalationRule = {
  when: "low_confidence" | "missing_sources" | "policy_block" | "user_request";
  action: "request_review" | "handoff_to_human";
  minConfidence?: number;
};

export type MemoryScope = {
  scope: "global" | "client" | "project";
  retentionDays: number;
  pii: "avoid" | "allow_with_review";
};

export type AgentProfile = {
  id: string;
  name: string;
  role: AgentRole;
  objectives: string[];
  permissions: Permission[];
  tools: ToolRef[];
  escalationRules: EscalationRule[];
  memoryScopes: MemoryScope[];
  reviewPolicy: ReviewPolicy;
};

