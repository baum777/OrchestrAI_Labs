/**
 * Governance v2 Core Types
 * 
 * Defines interfaces for self-validating meta-layer of the agent system.
 */

export type AutonomyTier = 1 | 2 | 3 | 4;

export type Layer = 'strategy' | 'architecture' | 'implementation' | 'governance';

export interface Risk {
  id: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
  owner?: string;
}

export interface Workstream {
  id: string;
  owner: string;
  scope: string[];
  autonomyTier: AutonomyTier;
  layer: Layer;
  structuralModel: string;
  risks: Risk[];
  definitionOfDone: string;
  status?: 'todo' | 'in_progress' | 'blocked' | 'in_review' | 'done';
  blockers?: string[];
}

export interface Decision {
  id: string;
  layer: Layer;
  rationale: string;
  alternatives: string[];
  implications: string;
  owner: string;
  timestamp: string;
  date?: string;
  decision?: string;
  key?: string; // Optional key for conflict detection (derived from decision string or hash)
  scope?: string[]; // Optional scope paths for conflict detection
}

export interface ValidationResult {
  status: 'pass' | 'blocked' | 'conflict';
  reasons?: string[];
  requiresReview?: boolean;
  clarificationQuestions?: string[];
}

export interface ClarificationRequest {
  id: string;
  workstreamId?: string;
  decisionId?: string;
  questions: string[];
  context: Record<string, unknown>;
  timestamp: string;
}

export interface PolicyRule {
  id: string;
  match: Record<string, unknown>;
  require: {
    approvals: number;
    approver_roles: string[];
    confirmation?: boolean;
  };
  deny_if_matches?: string[];
}

export interface AutonomyPolicy {
  ladder: Record<number, string>;
  defaults: {
    repo_default_tier: number;
    implementer_default_tier: number;
  };
  hard_rules: Array<{
    id: string;
    description: string;
  }>;
}

export interface GovernanceScorecard {
  layerPurity: number; // 0-2
  workstreamCompleteness: number; // 0-2
  escalationDiscipline: number; // 0-2
  decisionTraceability: number; // 0-2
  dodEnforcement: number; // 0-2
  clarificationCompliance: number; // 0-2
  totalScore: number; // 0-12, normalized to 0-10
}

export interface AuditResult {
  timestamp: string;
  scorecard: GovernanceScorecard;
  violations: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    fix?: string;
  }>;
  entropyScore: number; // 1-10
}

