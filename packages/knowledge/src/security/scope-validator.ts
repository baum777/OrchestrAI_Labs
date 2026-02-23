/**
 * Knowledge Scope Validator
 *
 * Validates query scope to prevent cross-tenant leakage.
 */

import { Injectable, Logger } from '@nestjs/common';

export interface KnowledgeQueryContext {
  tenantId: string;
  projectId?: string;
  userId?: string;
  role?: string;
}

export interface ScopeValidationResult {
  valid: boolean;
  error?: string;
  scopeFilter: Record<string, unknown>;
}

@Injectable()
export class ScopeValidator {
  private readonly logger = new Logger(ScopeValidator.name);

  /**
   * Validate that query scope is safe
   */
  validate(context: KnowledgeQueryContext): ScopeValidationResult {
    // Must have tenant ID
    if (!context.tenantId) {
      return {
        valid: false,
        error: 'Missing tenant_id in query context',
        scopeFilter: {},
      };
    }

    // Build scope filter
    const scopeFilter: Record<string, unknown> = {
      tenant_id: context.tenantId,
    };

    if (context.projectId) {
      scopeFilter['project_id'] = context.projectId;
    }

    // Log validation for audit
    this.logger.debug(`Scope validated for tenant ${context.tenantId}`);

    return {
      valid: true,
      scopeFilter,
    };
  }

  /**
   * Detect scope tampering attempts
   */
  detectTampering(requestedScope: string[], allowedScope: string[]): boolean {
    for (const requested of requestedScope) {
      if (!allowedScope.includes(requested)) {
        this.logger.warn(`Scope tampering detected: ${requested} not in allowed scope`);
        return true;
      }
    }
    return false;
  }
}
