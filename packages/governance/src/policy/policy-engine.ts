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
import type { PolicyViolationAdvice } from "@shared/types/governance";
import type { LicenseManager } from "../license/license-manager.js";

// Re-export PolicyError for convenience
export { PolicyError } from "./errors.js";

export class PolicyEngine {
  private readonly clock: Clock;
  private readonly licenseManager?: LicenseManager;

  constructor(clock?: Clock, licenseManager?: LicenseManager) {
    this.clock = clock ?? new SystemClock();
    this.licenseManager = licenseManager;
  }

  /**
   * Get human-friendly advice for a policy violation error code.
   */
  private getAdvisorAdvice(errorCode: string): PolicyViolationAdvice {
    const adviceMap: Record<string, PolicyViolationAdvice> = {
      PII_DETECTION: {
        code: "PII_DETECTION",
        advisorTitle: "Datenschutz-Schutzschild",
        humanExplanation: "E-Mail/Daten wurden geschwärzt",
        remedyStep: "Keine Aktion nötig.",
        safetyLevel: "info",
      },
      CAPABILITY_MISSING: {
        code: "CAPABILITY_MISSING",
        advisorTitle: "Fehlende Berechtigung",
        humanExplanation: "Agent darf nicht auf diese Quelle zugreifen",
        remedyStep: "Admin kontaktieren.",
        safetyLevel: "warning",
      },
      TIME_GAP_DETECTED: {
        code: "TIME_GAP_DETECTED",
        advisorTitle: "Sicherheits-Check",
        humanExplanation: "Lange Pause erkannt",
        remedyStep: "Letzte Schritte prüfen.",
        safetyLevel: "warning",
      },
      UNAUTHORIZED_ENTITY: {
        code: "UNAUTHORIZED_ENTITY",
        advisorTitle: "Eingeschränkter Bereich",
        humanExplanation: "Entity nicht auf der Allowlist",
        remedyStep: "Projekt-Scope prüfen.",
        safetyLevel: "warning",
      },
      PERMISSION_DENIED: {
        code: "PERMISSION_DENIED",
        advisorTitle: "Fehlende Berechtigung",
        humanExplanation: "Sie haben keine Berechtigung für diese Aktion",
        remedyStep: "Admin kontaktieren.",
        safetyLevel: "warning",
      },
      ROLE_REQUIRED: {
        code: "ROLE_REQUIRED",
        advisorTitle: "Rolle erforderlich",
        humanExplanation: "Diese Aktion erfordert eine spezielle Rolle",
        remedyStep: "Admin kontaktieren.",
        safetyLevel: "warning",
      },
      CONSTRAINT_VIOLATION: {
        code: "CONSTRAINT_VIOLATION",
        advisorTitle: "Eingeschränkter Bereich",
        humanExplanation: "Angeforderte Felder sind nicht erlaubt",
        remedyStep: "Projekt-Scope prüfen.",
        safetyLevel: "warning",
      },
      OPERATION_NOT_ALLOWED: {
        code: "OPERATION_NOT_ALLOWED",
        advisorTitle: "Eingeschränkter Bereich",
        humanExplanation: "Diese Operation ist nicht erlaubt",
        remedyStep: "Projekt-Scope prüfen.",
        safetyLevel: "warning",
      },
      CLIENT_ID_MISMATCH: {
        code: "CLIENT_ID_MISMATCH",
        advisorTitle: "Konfigurationsfehler",
        humanExplanation: "Client-ID fehlt oder stimmt nicht überein",
        remedyStep: "Admin kontaktieren.",
        safetyLevel: "warning",
      },
      CROSS_TENANT_DENIED: {
        code: "CROSS_TENANT_DENIED",
        advisorTitle: "Sicherheits-Verletzung",
        humanExplanation: "Zugriff auf Daten eines anderen Mandanten verweigert",
        remedyStep: "Bitte Administrator kontaktieren.",
        safetyLevel: "critical",
      },
      SANITIZATION_FAILED: {
        code: "SANITIZATION_FAILED",
        advisorTitle: "Sicherheits-Verletzung",
        humanExplanation: "Ungültige Eingabeparameter erkannt",
        remedyStep: "Bitte Administrator kontaktieren.",
        safetyLevel: "critical",
      },
      REDACTION_FAILED: {
        code: "REDACTION_FAILED",
        advisorTitle: "Datenschutz-Schutzschild",
        humanExplanation: "Fehler bei der Datenbereinigung",
        remedyStep: "Bitte Administrator kontaktieren.",
        safetyLevel: "warning",
      },
      SCOPE_VIOLATION: {
        code: "SCOPE_VIOLATION",
        advisorTitle: "Eingeschränkter Bereich",
        humanExplanation: "Zugriff außerhalb des erlaubten Bereichs",
        remedyStep: "Projekt-Scope prüfen.",
        safetyLevel: "warning",
      },
    };

    return adviceMap[errorCode] ?? {
      code: errorCode,
      advisorTitle: "Sicherheits-Verletzung",
      humanExplanation: "Eine Sicherheitsrichtlinie wurde verletzt",
      remedyStep: "Bitte Administrator kontaktieren.",
      safetyLevel: "critical",
    };
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
          operation,
          this.getAdvisorAdvice("ROLE_REQUIRED")
        );
      }
    }
    
    // Rule 2: Permission-Based Access Control
    if (operation.startsWith("customer_data.")) {
      if (!ctx.permissions?.includes("customer_data.read")) {
        throw new PolicyError(
          "Customer data access requires customer_data.read permission",
          "CAPABILITY_MISSING",
          ctx,
          operation,
          this.getAdvisorAdvice("CAPABILITY_MISSING")
        );
      }
      
      // Rule 3: ClientId Scoping
      if (!ctx.clientId) {
        throw new PolicyError(
          "clientId is required for customer_data operations",
          "CLIENT_ID_MISMATCH",
          ctx,
          operation,
          this.getAdvisorAdvice("CLIENT_ID_MISMATCH")
        );
      }
      
      // Rule 4: Cross-Tenant Protection
      if (params.clientId && params.clientId !== ctx.clientId) {
        throw new PolicyError(
          "Cross-tenant access denied",
          "CROSS_TENANT_DENIED",
          ctx,
          operation,
          this.getAdvisorAdvice("CROSS_TENANT_DENIED")
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
          operation,
          this.getAdvisorAdvice("PERMISSION_DENIED")
        );
      }
    }

    // Rule 6: Premium Feature Access (License Check)
    if (operation.startsWith("tool.marketing.")) {
      if (!ctx.clientId) {
        throw new PolicyError(
          "clientId is required for premium features",
          "CLIENT_ID_MISMATCH",
          ctx,
          operation,
          this.getAdvisorAdvice("CLIENT_ID_MISMATCH")
        );
      }

      if (this.licenseManager && !this.licenseManager.hasFeatureAccess(ctx.clientId, "marketer")) {
        throw new PolicyError(
          "Premium feature 'marketer' requires premium tier license",
          "CAPABILITY_MISSING",
          ctx,
          operation,
          {
            code: "CAPABILITY_MISSING",
            advisorTitle: "Premium-Modul erforderlich",
            humanExplanation: "Dieses Feature ist nur für Premium-Kunden verfügbar",
            remedyStep: "Upgrade auf Premium-Tier oder Admin kontaktieren.",
            safetyLevel: "warning",
          }
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
        `customer_data.${operationId}`,
        this.getAdvisorAdvice("SANITIZATION_FAILED")
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
          operationId,
          this.getAdvisorAdvice("CONSTRAINT_VIOLATION")
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
        `customer_data.${operationId}`,
        this.getAdvisorAdvice("REDACTION_FAILED")
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

