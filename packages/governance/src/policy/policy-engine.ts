/**
 * Policy Engine
 * 
 * Centralized authorization, sanitization, and redaction for customer data access
 * and other sensitive operations.
 */

import crypto from "node:crypto";
import type { Permission } from "@shared/types/agent";
import type { CapabilityMap, OperationCapability } from "@agent-system/customer-data";
import type {
  PolicyContext,
  PolicyDecision,
  PolicyErrorCode,
  SanitizedParams,
  RedactedResult,
} from "./types.js";
import { PolicyError } from "./errors.js";
import { containsRawSql, applyConstraints, validateAllowedFields } from "@agent-system/customer-data";
import type { Clock } from "@agent-system/governance-v2/runtime/clock";
import { SystemClock } from "@agent-system/governance-v2/runtime/clock";

export class PolicyEngine {
  private readonly clock: Clock;

  constructor(clock?: Clock) {
    this.clock = clock ?? new SystemClock();
  }

  /**
   * Authorize an operation. Throws PolicyError if unauthorized.
   */
  authorize(
    ctx: PolicyContext,
    operation: string,
    params: Record<string, unknown>
  ): PolicyDecision {
    const timestamp = this.clock.now().toISOString();
    
    // Rule 1: Role-Based Access Control (RBAC)
    if (operation === "review.approve" || operation === "review.reject") {
      if (!ctx.roles?.includes("reviewer") && 
          !ctx.roles?.includes("admin") && 
          !ctx.roles?.includes("partner")) {
        throw new PolicyError(
          "Review approval requires reviewer role",
          "ROLE_REQUIRED",
          ctx,
          operation
        );
      }
    }
    
    // Rule 2: Permission-Based Access Control
    if (operation.startsWith("customer_data.")) {
      if (!ctx.permissions?.includes("customer_data.read")) {
        throw new PolicyError(
          "Customer data access requires customer_data.read permission",
          "PERMISSION_DENIED",
          ctx,
          operation
        );
      }
      
      // Rule 3: ClientId Scoping
      if (!ctx.clientId) {
        throw new PolicyError(
          "clientId is required for customer_data operations",
          "CLIENT_ID_MISMATCH",
          ctx,
          operation
        );
      }
      
      // Rule 4: Cross-Tenant Protection
      if (params.clientId && params.clientId !== ctx.clientId) {
        throw new PolicyError(
          "Cross-tenant access denied",
          "CROSS_TENANT_DENIED",
          ctx,
          operation
        );
      }
    }
    
    // Rule 5: Project Phase Update Permission
    if (operation === "project.phase.update") {
      if (!ctx.permissions?.includes("project.update")) {
        throw new PolicyError(
          "Project phase update requires project.update permission",
          "PERMISSION_DENIED",
          ctx,
          operation
        );
      }
    }
    
    // Generate decision hash (deterministic - excludes timestamp)
    // Hash is based only on operation and context, not timestamp
    // This ensures replay-friendliness: same input → same hash
    const decisionData = {
      operation,
      context: {
        userId: ctx.userId,
        clientId: ctx.clientId,
        projectId: ctx.projectId,
      },
      // Explicitly exclude timestamp from hash for determinism
    };
    const decisionHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(decisionData))
      .digest("hex");
    
    return {
      allowed: true,
      operation,
      context: ctx,
      constraints: {},
      timestamp,
      decisionHash,
    };
  }

  /**
   * Sanitize parameters according to capability constraints.
   */
  sanitize(
    params: Record<string, unknown>,
    capability: CapabilityMap,
    operationId: string
  ): SanitizedParams {
    // Reject raw SQL attempts
    if (containsRawSql(params)) {
      throw new PolicyError(
        "Raw SQL not allowed in tool calls",
        "SANITIZATION_FAILED",
        { userId: "system" }, // Context not available in sanitize
        `customer_data.${operationId}`
      );
    }
    
    // Apply constraints
    const sanitized = applyConstraints(params, capability, operationId);
    
    // Validate allowedFields if specified
    if (sanitized.constraints.allowedFields && params.fields) {
      const requestedFields = Array.isArray(params.fields) 
        ? params.fields as string[]
        : [params.fields as string];
      try {
        validateAllowedFields(requestedFields, sanitized.constraints.allowedFields);
      } catch (error) {
        // Convert validation error to PolicyError
        throw new PolicyError(
          error instanceof Error ? error.message : "Fields not allowed",
          "CONSTRAINT_VIOLATION",
          { userId: "system" },
          operationId
        );
      }
    }
    
    return sanitized;
  }

  /**
   * Redact result data according to capability constraints.
   */
  redact(
    result: unknown,
    capability: CapabilityMap,
    operationId: string
  ): RedactedResult {
    const data = Array.isArray(result) ? result : [result];
    const operation = capability.operations[operationId];
    
    if (!operation) {
      throw new PolicyError(
        `Operation ${operationId} not found in capability map`,
        "REDACTION_FAILED",
        { userId: "system" },
        `customer_data.${operationId}`
      );
    }
    
    const denyFields = operation.denyFields ?? [];
    const allowedFields = operation.allowedFields;
    
    // Step 1: Remove denyFields
    let redacted = data.map(row => {
      if (typeof row !== "object" || row === null) {
        return row;
      }
      const obj = row as Record<string, unknown>;
      const cleaned: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (!denyFields.includes(key)) {
          cleaned[key] = value;
        }
      }
      return cleaned;
    });
    
    // Step 2: Filter to allowedFields if specified
    if (allowedFields && allowedFields.length > 0) {
      redacted = redacted.map(row => {
        if (typeof row !== "object" || row === null) {
          return row;
        }
        const obj = row as Record<string, unknown>;
        const filtered: Record<string, unknown> = {};
        for (const field of allowedFields) {
          if (field in obj) {
            filtered[field] = obj[field];
          }
        }
        return filtered;
      });
    }
    
    const firstRow = redacted[0];
    const fieldsReturned = typeof firstRow === "object" && firstRow !== null
      ? Object.keys(firstRow as Record<string, unknown>)
      : [];
    
    return {
      data: redacted,
      metadata: {
        rowCount: redacted.length,
        fieldsReturned,
        redactedFields: denyFields.length > 0 ? denyFields : undefined,
      },
    };
  }
}

