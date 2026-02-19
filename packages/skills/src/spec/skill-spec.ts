/**
 * Skill Specification Types
 * 
 * Defines TypeScript interfaces for skill manifests, execution context, and results.
 */

import type { AgentProfile } from "@agent-system/shared";
import type { ToolContext, ToolCall, ToolResult } from "@agent-system/agent-runtime";
import type { Clock } from '@agent-system/governance-v2/runtime/clock';
import type { ValidationResult } from '@agent-system/governance-v2';

/**
 * Skill identifier (e.g., "governance.workstream_validate")
 */
export type SkillId = string;

/**
 * Skill version (semantic version, e.g., "1.0.0")
 */
export type SkillVersion = string;

/**
 * Review policy for skills
 */
export interface SkillReviewPolicy {
  mode: 'none' | 'draft_only' | 'required';
  requiresHumanFor?: string[];
  reviewerRoles?: string[];
}

/**
 * Side effect declaration
 */
export interface SideEffect {
  type: 'create' | 'update' | 'delete' | 'read';
  resource: string;
  scope?: 'project' | 'client' | 'global';
}

/**
 * Context requirements
 */
export interface ContextRequirements {
  projectId?: boolean;
  clientId?: boolean;
  userId: boolean; // Always required
}

/**
 * Customer data access configuration
 */
export interface CustomerDataAccess {
  enabled: boolean;
  allowedOperations?: string[];
}

/**
 * Telemetry specification
 */
export interface TelemetrySpec {
  trackExecution: boolean;
  trackLatency: boolean;
  trackErrors: boolean;
}

/**
 * Governance configuration
 */
export interface GovernanceConfig {
  generatesWorkstream?: boolean;
  requiresDocumentHeader?: boolean;
  timestampIntegrity?: boolean;
}

/**
 * Skill dependency
 */
export interface SkillDependency {
  skillId: string;
  versionRange: string; // e.g., "^1.0.0"
}

/**
 * JSON Schema type (simplified)
 */
export interface JSONSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

/**
 * Skill lifecycle status
 */
export type SkillStatus = 'experimental' | 'stable' | 'deprecated' | 'disabled';

/**
 * Skill manifest (loaded from manifest.json)
 */
export interface SkillManifest {
  id: SkillId;
  name: string;
  version: SkillVersion;
  description: string;
  tags: string[];
  owners: string[];
  status: SkillStatus;
  layer: 'strategy' | 'architecture' | 'implementation' | 'governance';
  autonomyTier: 1 | 2 | 3 | 4;
  requiredPermissions: string[];
  requiredTools: string[];
  dependencies?: SkillDependency[];
  capabilityDomain?: string;
  customerDataAccess?: CustomerDataAccess;
  contextRequirements?: ContextRequirements;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  sideEffects: SideEffect[];
  reviewPolicy: SkillReviewPolicy;
  resources: {
    instructions: string;
    examples?: string[];
    templates?: string[];
  };
  telemetry: TelemetrySpec;
  governance?: GovernanceConfig;
}

/**
 * Skill execution context
 */
export interface SkillExecutionContext {
  skillId: SkillId;
  skillVersion: SkillVersion;
  agentProfile: AgentProfile;
  toolContext: ToolContext;
  clock: Clock;
  input: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Skill execution result
 */
export interface SkillExecutionResult {
  ok: boolean;
  output?: unknown;
  error?: string;
  toolCalls?: ToolCall[]; // Tool calls that were executed
  workstream?: unknown; // Generated workstream (if applicable)
  telemetry?: SkillTelemetry;
}

/**
 * Skill telemetry
 */
export interface SkillTelemetry {
  skillId: SkillId;
  version: SkillVersion;
  executionTimeMs: number;
  toolCallCount: number;
  errorCount: number;
  timestamp: string; // ISO-8601
  skillRunId: string; // Unique run identifier
}

/**
 * Skill plan (deterministic compilation result)
 */
export interface SkillPlan {
  skillId: SkillId;
  version: SkillVersion;
  input: unknown;
  toolCalls: ToolCall[];
  workstream?: unknown;
  reviewRequired: boolean;
  reviewPolicy: SkillReviewPolicy;
  executionMode: 'direct' | 'tool_plan'; // direct = calls internal handler, tool_plan = executes tool calls
}

