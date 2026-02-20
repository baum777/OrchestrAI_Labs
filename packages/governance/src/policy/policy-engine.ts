/**
 * Policy Engine
 * 
 * Centralized authorization, sanitization, and redaction for customer data access
 * and other sensitive operations.
 */

import crypto from "node:crypto";
import type { CapabilityMap } from "@agent-system/customer-data";
import type {
  PolicyContext,
  PolicyDecision,
  SanitizedParams,
  RedactedResult,
} from "./types.js";
import { PolicyError } from "./errors.js";
import { containsRawSql, applyConstraints, validateAllowedFields } from "@agent-system/customer-data";
import type { Clock } from "../runtime/clock.js";
import { SystemClock } from "../runtime/clock.js";
import type { PolicyViolationAdvice, Permission } from "@agent-system/shared";
import type { LicenseManager } from "../license/license-manager.js";

// Re-export PolicyError and types for convenience
export { PolicyError } from "./errors.js";
export type { PolicyContext, PolicyDecision } from "./types.js";

export interface ConsentStore {
  hasConsent(userId: string, consentType: string): Promise<boolean>;
}

/**
 * Permission Resolver Interface
 * 
 * Resolves user permissions from roles and explicit permissions.
 * Used by PolicyEngine to enforce least-privilege access control.
 */
export interface PermissionResolver {
  /**
   * Get all permissions for a user (from roles + explicit permissions)
   */
  getPermissions(userId: string): Promise<Permission[]>;
  
  /**
   * Check if user has all required permissions
   */
  hasAllPermissions(userId: string, requiredPermissions: Permission[]): Promise<boolean>;
  
  /**
   * Get all roles for a user
   */
  getRoles(userId: string): Promise<string[]>;
}

export class PolicyEngine {
  private readonly clock: Clock;
  private readonly licenseManager?: LicenseManager;
  private readonly consentStore?: ConsentStore;
  private readonly permissionResolver?: PermissionResolver;

  constructor(
    clock?: Clock,
    licenseManager?: LicenseManager,
    consentStore?: ConsentStore,
    permissionResolver?: PermissionResolver
  ) {
    this.clock = clock ?? new SystemClock();
    this.licenseManager = licenseManager;
    this.consentStore = consentStore;
    this.permissionResolver = permissionResolver;
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
      OPERATION_NOT_MAPPED: {
        code: "OPERATION_NOT_MAPPED",
        advisorTitle: "Operation nicht in Berechtigungsmatrix",
        humanExplanation: "Diese Operation ist nicht in der Berechtigungsmatrix definiert. Zugriff verweigert (Default-Deny).",
        remedyStep: "Admin kontaktieren, um Operation zur Berechtigungsmatrix hinzuzufügen.",
        safetyLevel: "critical",
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
   * Get required permissions for an operation.
   * 
   * Maps operation identifiers to required permissions.
   * This is the central permission matrix for the system.
   * 
   * Returns null if operation is not in permission matrix (explicit deny).
   * Returns empty array [] if operation requires no permissions (explicit allow).
   */
  getRequiredPermissions(operation: string): Permission[] | null {
    // Permission matrix: operation → required permissions
    const permissionMap: Record<string, Permission[]> = {
      // Customer data operations
      "customer_data.executeReadModel": ["customer_data.read"],
      "customer_data.getEntity": ["customer_data.read"],
      "customer_data.search": ["customer_data.read"],
      "tool.customer_data.executeReadModel": ["customer_data.read"],
      "tool.customer_data.getEntity": ["customer_data.read"],
      "tool.customer_data.search": ["customer_data.read"],
      
      // Project operations
      "project.phase.update": ["project.update"],
      "project.manage": ["project.manage"],
      
      // Decision operations
      "decision.create": ["decision.create"],
      "decision.finalize": ["decision.create"], // Finalizing requires create permission
      
      // Review operations (role-based, not permission-based)
      "review.approve": [], // Role-based (reviewer/admin/partner) - empty array = explicit allow
      "review.reject": [], // Role-based (reviewer/admin/partner) - empty array = explicit allow
      "review.request": ["review.request"],
      
      // Knowledge operations
      "knowledge.search": ["knowledge.search"],
      "knowledge.read": ["knowledge.read"],

      // Analytics operations (read-only KPIs)
      "analytics.read": ["analytics.read"],

      // Marketing operations (premium feature)
      "tool.marketing.generateNarrative": ["marketing.generate"],
      "marketing.generate": ["marketing.generate"],
    };
    
    // Check exact match first
    if (permissionMap[operation]) {
      return permissionMap[operation];
    }
    
    // Check prefix matches
    for (const [op, perms] of Object.entries(permissionMap)) {
      if (operation.startsWith(op + ".") || operation.startsWith("tool." + op + ".")) {
        return perms;
      }
    }
    
    // Default: operation not in permission matrix (explicit deny)
    return null;
  }

  /**
   * Authorize an operation. Throws PolicyError if unauthorized.
   * 
   * @param ctx - Policy context (userId, clientId, roles, permissions)
   * @param operation - Operation identifier (e.g., "customer_data.executeReadModel")
   * @param params - Operation parameters
   * @returns PolicyDecision if authorized
   * @throws PolicyError if unauthorized (including missing consent)
   */
  async authorize(
    ctx: PolicyContext,
    operation: string,
    params: Record<string, unknown>
  ): Promise<PolicyDecision> {
    const timestamp = this.clock.now().toISOString();
    
    // Rule 0: Permission-Based Access Control (Least Privilege)
    // If permissionResolver is available, use it to enforce permissions
    const requiredPermissions = this.getRequiredPermissions(operation);
    
    // Explicit deny: operation not in permission matrix
    if (requiredPermissions === null) {
      throw new PolicyError(
        `Operation '${operation}' is not in permission matrix. Access denied by default.`,
        "OPERATION_NOT_MAPPED",
        ctx,
        operation,
        this.getAdvisorAdvice("OPERATION_NOT_MAPPED")
      );
    }
    
    // Explicit allow: operation requires no permissions (empty array)
    // Example: review.approve (role-based, not permission-based)
    if (requiredPermissions.length === 0) {
      // Operation explicitly allowed without permissions (role-based checks happen later)
      // Continue to role-based checks
    } else {
      // Operation requires permissions: check if user has them
      if (this.permissionResolver) {
        // If ctx.permissions is provided, use it (from agent profile)
        // Otherwise, resolve from user roles
        let userPermissions: Permission[] = ctx.permissions ?? [];
        
        if (userPermissions.length === 0) {
          // Resolve permissions from user roles
          userPermissions = await this.permissionResolver.getPermissions(ctx.userId);
        }
        
        // Check if user has all required permissions
        const hasAll = await this.permissionResolver.hasAllPermissions(
          ctx.userId,
          requiredPermissions
        );
        
        if (!hasAll) {
          const missing = requiredPermissions.filter(p => !userPermissions.includes(p));
          throw new PolicyError(
            `Operation requires permissions: ${requiredPermissions.join(", ")}. Missing: ${missing.join(", ")}`,
            "PERMISSION_DENIED",
            ctx,
            operation,
            this.getAdvisorAdvice("PERMISSION_DENIED")
          );
        }
      } else if (ctx.permissions) {
        // Fallback: if no permissionResolver but ctx.permissions provided, check directly
        const hasAll = requiredPermissions.every(p => ctx.permissions!.includes(p));
        if (!hasAll) {
          const missing = requiredPermissions.filter(p => !ctx.permissions!.includes(p));
          throw new PolicyError(
            `Operation requires permissions: ${requiredPermissions.join(", ")}. Missing: ${missing.join(", ")}`,
            "PERMISSION_DENIED",
            ctx,
            operation,
            this.getAdvisorAdvice("PERMISSION_DENIED")
          );
        }
      } else {
        // No permissionResolver and no ctx.permissions: deny access
        throw new PolicyError(
          `Operation requires permissions: ${requiredPermissions.join(", ")}. No permission resolver available.`,
          "PERMISSION_DENIED",
          ctx,
          operation,
          this.getAdvisorAdvice("PERMISSION_DENIED")
        );
      }
    }
    
    // Rule 1: Role-Based Access Control (RBAC)
    // Review operations require reviewer/admin/partner role
    if (operation === "review.approve" || operation === "review.reject") {
      let userRoles: string[] = ctx.roles ?? [];
      
      // If permissionResolver is available, resolve roles from DB
      if (this.permissionResolver && userRoles.length === 0) {
        userRoles = await this.permissionResolver.getRoles(ctx.userId);
      }
      
      if (!userRoles.includes("reviewer") && 
          !userRoles.includes("admin") && 
          !userRoles.includes("partner")) {
        throw new PolicyError(
          "Review approval requires reviewer role",
          "ROLE_REQUIRED",
          ctx,
          operation,
          this.getAdvisorAdvice("ROLE_REQUIRED")
        );
      }
    }
    
    // Rule 2: Permission-Based Access Control (legacy check for customer_data)
    if (operation.startsWith("customer_data.")) {
      let userPermissions: Permission[] = ctx.permissions ?? [];
      
      // If permissionResolver is available, resolve permissions from DB
      if (this.permissionResolver && userPermissions.length === 0) {
        userPermissions = await this.permissionResolver.getPermissions(ctx.userId);
      }
      
      if (!userPermissions.includes("customer_data.read")) {
        throw new PolicyError(
          "Customer data access requires customer_data.read permission",
          "CAPABILITY_MISSING",
          ctx,
          operation,
          this.getAdvisorAdvice("CAPABILITY_MISSING")
        );
      }
      
      // Rule 2.5: Consent Check (DSGVO Art. 6)
      if (this.consentStore) {
        const hasConsent = await this.consentStore.hasConsent(ctx.userId, "data_processing");
        if (!hasConsent) {
          throw new PolicyError(
            "Consent required for data processing (DSGVO Art. 6)",
            "CONSENT_MISSING",
            ctx,
            operation,
            {
              code: "CONSENT_MISSING",
              advisorTitle: "Einwilligung erforderlich",
              humanExplanation: "Für die Datenverarbeitung ist Ihre Einwilligung erforderlich",
              remedyStep: "Bitte erteilen Sie Ihre Einwilligung über /users/:userId/consent",
              safetyLevel: "warning",
            }
          );
        }
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

