/**
 * Self-or-Admin Guard
 * 
 * Minimal auth guard for Phase 1 compliance hardening.
 * Allows access if:
 * - requestorUserId matches userId (self-deletion) OR
 * - requestorUserId has admin role
 * 
 * For MVP: Extracts userId from X-User-Id header or request body.
 * In production: Should extract from JWT token.
 */

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      params: { userId: string };
      headers: Record<string, string | undefined>;
      body?: { requestorUserId?: string; requestorRoles?: string[] };
      user?: { userId: string; roles?: string[] };
      requestorUserId?: string;
      requestorRoles?: string[];
    }>();
    
    // Extract userId from route params
    const userId = request.params.userId;
    if (!userId) {
      throw new UnauthorizedException("userId parameter is required");
    }

    // Extract requestorUserId from:
    // 1. Authenticated user (from JWT token in production)
    // 2. X-User-Id header (for MVP/testing)
    // 3. Request body (fallback for MVP)
    let requestorUserId: string | undefined;
    let requestorRoles: string[] = [];

    // Priority 1: Authenticated user (production)
    if (request.user?.userId) {
      requestorUserId = request.user.userId;
      requestorRoles = request.user.roles ?? [];
    }
    // Priority 2: X-User-Id header (MVP/testing)
    else if (request.headers["x-user-id"]) {
      requestorUserId = request.headers["x-user-id"] as string;
      const rolesHeader = request.headers["x-user-roles"];
      if (rolesHeader) {
        requestorRoles = (rolesHeader as string).split(",").map((r) => r.trim());
      }
    }
    // Priority 3: Request body (fallback for MVP)
    else if (request.body?.requestorUserId) {
      requestorUserId = request.body.requestorUserId;
      requestorRoles = request.body.requestorRoles ?? [];
    }
    // Priority 4: Assume self-deletion (MVP default)
    // ⚠️ MVP-ONLY: This fallback allows unauthenticated requests to succeed.
    // In production, this should be removed and replaced with JWT token extraction.
    // All requests must provide authentication via Priority 1 (JWT) or Priority 2 (X-User-Id header).
    else {
      requestorUserId = userId;
    }

    if (!requestorUserId) {
      throw new UnauthorizedException("Authentication required: requestorUserId must be provided");
    }

    // Check: self-deletion OR admin role
    const isSelf = requestorUserId === userId;
    const isAdmin = requestorRoles.includes("admin") || requestorRoles.includes("Admin");

    if (!isSelf && !isAdmin) {
      throw new UnauthorizedException(
        `Access denied: User ${requestorUserId} cannot delete data for user ${userId}. Only self-deletion or admin role allowed.`
      );
    }

    // Attach requestor info to request for use in controller
    const requestWithExtras = request as typeof request & {
      requestorUserId: string;
      requestorRoles: string[];
    };
    requestWithExtras.requestorUserId = requestorUserId;
    requestWithExtras.requestorRoles = requestorRoles;

    return true;
  }
}

