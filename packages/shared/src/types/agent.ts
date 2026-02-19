export type AgentRole =
  | "knowledge"
  | "project"
  | "documentation"
  | "junior"
  | "governance"
  | "workflow"
  | "tools";

/** Alias for AgentRole used by AgentSelector. */
export type AgentDomain = AgentRole;

export type Permission =
  | "knowledge.read"
  | "knowledge.search"
  | "project.read"
  | "project.update"
  | "project.manage"
  | "decision.create"
  | "decision.read"
  | "log.write"
  | "review.request"
  | "review.approve"
  | "review.reject"
  | "customer_data.read"
  | "marketing.generate";

export type ToolRef =
  | "tool.knowledge.search"
  | "tool.knowledge.getSource"
  | "tool.workflow.getPhase"
  | "tool.workflow.validateDeliverable"
  | "tool.docs.createDraft"
  | "tool.docs.updateDraft"
  | "tool.decisions.createDraft"
  | "tool.decisions.finalizeFromDraft"
  | "tool.logs.append"
  | "tool.reviews.request"
  | "tool.reviews.status"
  | "tool.customer_data.executeReadModel"
  | "tool.customer_data.getEntity"
  | "tool.customer_data.search"
  | "tool.marketing.generateNarrative";

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
  /** Alias for role, used by AgentSelector. */
  domain?: AgentRole;
  objectives: string[];
  permissions: Permission[];
  tools: ToolRef[];
  allowedSkills?: string[]; // Optional: allowlisted skill IDs
  escalationRules: EscalationRule[];
  memoryScopes: MemoryScope[];
  reviewPolicy: ReviewPolicy;
};

