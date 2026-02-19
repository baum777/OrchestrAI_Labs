/**
 * Policy Engine Types
 * 
 * Types for PolicyEngine authorization, sanitization, and redaction.
 */

import type { Permission } from "@shared/types/agent";

export type PolicyContext = {
  userId: string;              // Required: caller identity
  clientId?: string;            // Required for customer_data operations
  projectId?: string;           // Optional: project scope
  roles?: string[];             // User roles (e.g., ["reviewer", "admin"])
  agentId?: string;             // Agent executing operation
  permissions?: Permission[];   // Agent permissions (from profile)
};

export type PolicyDecision = {
  allowed: boolean;
  operation: string;
  context: PolicyContext;
  constraints: {
    maxRows?: number;
    allowedFields?: string[];
    denyFields?: string[];
  };
  reason?: string;              // If denied, explanation
  timestamp: string;             // ISO timestamp
  decisionHash: string;          // SHA256 hash for audit
};

export type PolicyErrorCode =
  | "PERMISSION_DENIED"           // User/agent lacks required permission
  | "ROLE_REQUIRED"                // Required role missing (e.g., reviewer)
  | "CLIENT_ID_MISMATCH"           // ctx.clientId != capability.clientId
  | "OPERATION_NOT_ALLOWED"        // operationId not allowlisted for clientId
  | "CROSS_TENANT_DENIED"          // Attempted cross-client access
  | "SCOPE_VIOLATION"              // projectId/clientId scope violation
  | "CONSTRAINT_VIOLATION"         // maxRows, allowedFields violated
  | "SANITIZATION_FAILED"          // Parameter sanitization failed
  | "REDACTION_FAILED"             // Result redaction failed
  | "PII_DETECTION"                // PII detected and redacted
  | "CAPABILITY_MISSING"           // Agent lacks required capability/permission
  | "TIME_GAP_DETECTED"            // Long time gap detected between operations
  | "UNAUTHORIZED_ENTITY";         // Entity not on allowlist

export type SanitizedParams = {
  operationId: string;
  params: Record<string, unknown>;
  constraints: {
    maxRows: number;
    allowedFields?: string[];
    denyFields?: string[];
  };
};

export type RedactedResult = {
  data: unknown[];
  metadata: {
    rowCount: number;
    fieldsReturned: string[];
    redactedFields?: string[];    // Fields removed during redaction
  };
};

