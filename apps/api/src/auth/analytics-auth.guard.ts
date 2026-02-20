/**
 * Analytics Auth Guard
 *
 * Enforces AuthN + AuthZ for /analytics/* endpoints.
 * - AuthN: Requires authenticated principal (req.user). In development only, X-User-Id header
 *   is accepted when req.user is absent. Production must use JWT/session that populates req.user.
 * - AuthZ: Requires analytics.read permission via PolicyEngine
 *
 * Header injection (X-User-Id, X-Client-Id) is for dev/testing only and MUST NOT be used in production.
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

const IS_PRODUCTION = process.env.NODE_ENV === "production";

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

    // --- AuthN: Require authenticated principal ---
    // Production: req.user required (set by JWT/session middleware). Header-only = 401.
    // Development/Test: Fallback to X-User-Id header for local/dev usage only.
    let userId: string | undefined;

    if (request.user?.userId) {
      userId = request.user.userId;
    } else if (!IS_PRODUCTION && request.headers["x-user-id"]) {
      userId = request.headers["x-user-id"] as string;
    }

    if (!userId?.trim()) {
      throw new UnauthorizedException(
        IS_PRODUCTION
          ? "Authentication required: valid token or session must provide authenticated principal"
          : "Authentication required: provide req.user (JWT/session) or X-User-Id header (dev-only)"
      );
    }

    // --- Tenant context ---
    // Production: clientId must come from req.user (verified). Header NOT accepted.
    // Development: X-Client-Id header accepted for dev/test only.
    const clientId =
      IS_PRODUCTION
        ? (request.user as { clientId?: string } | undefined)?.clientId?.trim()
        : (request.headers["x-client-id"] as string | undefined)?.trim();
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
