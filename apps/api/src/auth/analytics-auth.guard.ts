/**
 * Analytics Auth Guard
 *
 * Enforces AuthN + AuthZ for /analytics/* endpoints.
 * - AuthN: Requires X-User-Id header (or req.user from JWT in production)
 * - AuthZ: Requires analytics.read permission via PolicyEngine
 *
 * For MVP: X-User-Id and X-User-Roles headers. In production: JWT token with claims.
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PolicyEngine, PolicyError } from "@governance/policy/policy-engine";
import type { PolicyContext } from "@governance/policy/policy-engine";
import type { Permission } from "@agent-system/shared";

export const ANALYTICS_OPERATION = "analytics.read";

@Injectable()
export class AnalyticsAuthGuard implements CanActivate {
  constructor(
    private readonly policyEngine: PolicyEngine,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: { userId: string; roles?: string[]; permissions?: string[] };
      analyticsUserId?: string;
      analyticsClientId?: string;
      analyticsProjectId?: string;
    }>();

    // --- AuthN: Extract userId ---
    let userId: string | undefined;

    if (request.user?.userId) {
      userId = request.user.userId;
    } else if (request.headers["x-user-id"]) {
      userId = request.headers["x-user-id"] as string;
    }

    if (!userId?.trim()) {
      throw new UnauthorizedException(
        "Authentication required: X-User-Id header or valid token must be provided"
      );
    }

    // --- Tenant context (for Phase 3 binding) ---
    const clientId = (request.headers["x-client-id"] as string | undefined)?.trim();
    const projectId = (request.headers["x-project-id"] as string | undefined)?.trim();

    // --- AuthZ: analytics.read permission ---
    const policyCtx: PolicyContext = {
      userId: userId.trim(),
      clientId: clientId || undefined,
      projectId: projectId || undefined,
      roles: request.user?.roles ?? [],
      permissions: (request.user?.permissions ?? []) as Permission[],
    };

    try {
      await this.policyEngine.authorize(policyCtx, ANALYTICS_OPERATION, {});
    } catch (error) {
      if (error instanceof PolicyError) {
        throw new ForbiddenException(
          `Analytics access denied: ${error.message}`
        );
      }
      throw error;
    }

    // Attach to request for controller/service
    const req = request as typeof request & {
      analyticsUserId: string;
      analyticsClientId?: string;
      analyticsProjectId?: string;
    };
    req.analyticsUserId = userId.trim();
    req.analyticsClientId = clientId || undefined;
    req.analyticsProjectId = projectId || undefined;

    return true;
  }
}
