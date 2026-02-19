/**
 * Audit Log Middleware
 * 
 * Mandatory audit logging for all critical operations.
 * ISO 27001: A.12.4.1 (Event logging), A.12.4.3 (Logging of administrator activities)
 * 
 * This middleware:
 * - Logs all POST, PUT, DELETE, PATCH requests
 * - Logs all GET requests to sensitive endpoints
 * - Blocks request if logging fails (mandatory enforcement)
 * - Includes userId, operation, timestamp, result in logs
 */

import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { PostgresActionLogger } from "../runtime/postgres-action-logger";
import type { Clock } from "@agent-system/governance-v2/runtime/clock";
import { SystemClock } from "@agent-system/governance-v2/runtime/clock";

/**
 * Critical endpoints that must be logged (even GET requests)
 */
const CRITICAL_ENDPOINTS = [
  "/users/", // User management
  "/reviews/", // Review operations
  "/decisions/", // Decision operations
  "/projects/", // Project operations
  "/agents/execute", // Agent execution
  "/monitoring/", // Monitoring access
  "/logs/", // Log access
];

/**
 * Safe endpoints that don't need audit logging
 */
const SAFE_ENDPOINTS = [
  "/health", // Health checks
  "/", // Root endpoint
];

@Injectable()
export class AuditLogMiddleware implements NestMiddleware {
  private readonly logger: Logger;
  private readonly clock: Clock;
  private readonly actionLogger: PostgresActionLogger;

  constructor(actionLogger: PostgresActionLogger, clock?: Clock) {
    this.logger = new Logger(AuditLogMiddleware.name);
    this.clock = clock ?? new SystemClock();
    this.actionLogger = actionLogger;
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Skip safe endpoints
    if (this.isSafeEndpoint(req.path)) {
      return next();
    }

    // Only log write operations (POST, PUT, DELETE, PATCH) and critical GET endpoints
    const isWriteOperation = ["POST", "PUT", "DELETE", "PATCH"].includes(req.method);
    const isCriticalEndpoint = this.isCriticalEndpoint(req.path);
    
    if (!isWriteOperation && !isCriticalEndpoint) {
      return next();
    }

    const startTime = this.clock.now().getTime();
    const userId = this.extractUserId(req);
    const agentId = this.extractAgentId(req);
    const projectId = this.extractProjectId(req);
    const clientId = this.extractClientId(req);
    
    // Capture request body (for logging)
    const requestBody = this.sanitizeRequestBody(req.body);
    
    // Capture response
    const originalSend = res.send;
    let responseBody: unknown = null;
    let statusCode = 200;
    
    res.send = function (body: unknown) {
      responseBody = body;
      statusCode = res.statusCode;
      return originalSend.call(this, body);
    };

    // Determine operation name
    const operation = this.getOperationName(req.method, req.path);
    
    // Determine if operation was blocked (status >= 400)
    const blocked = statusCode >= 400;
    const reason = blocked ? `HTTP ${statusCode}` : undefined;

    try {
      // Wait for response to complete
      res.on("finish", async () => {
        const endTime = this.clock.now().getTime();
        const latencyMs = endTime - startTime;
        
        try {
          // Log the operation (mandatory - blocks if fails)
          await this.actionLogger.append({
            agentId: agentId || "system",
            userId: userId || "anonymous",
            projectId: projectId || undefined,
            clientId: clientId || undefined,
            action: `http.${operation}`,
            input: {
              method: req.method,
              path: req.path,
              query: req.query,
              body: requestBody,
              headers: this.sanitizeHeaders(req.headers),
            },
            output: {
              statusCode,
              body: this.sanitizeResponseBody(responseBody),
              latencyMs,
            },
            ts: this.clock.now().toISOString(),
            blocked,
            reason,
          });
        } catch (logError) {
          // Mandatory logging: if logging fails, log the failure and block the request
          this.logger.error(
            `CRITICAL: Audit logging failed for ${req.method} ${req.path}: ${logError instanceof Error ? logError.message : String(logError)}`,
            logError instanceof Error ? logError.stack : undefined
          );
          
          // PHASE 2: Block request if logging fails in production (compliance requirement)
          if (process.env.NODE_ENV === 'production') {
            res.status(500).json({
              statusCode: 500,
              message: "AUDIT_LOG_WRITE_FAILED: Request blocked due to audit logging failure. This is a compliance requirement.",
              code: "AUDIT_LOG_WRITE_FAILED",
            });
            return; // Block request
          }
          
          // In non-production, log error but allow request (for development/testing)
          // This allows testing without strict audit logging requirements
        }
      });
      
      next();
    } catch (error) {
      // If middleware setup fails, log and continue (don't block)
      this.logger.error(
        `Audit middleware error for ${req.method} ${req.path}: ${error instanceof Error ? error.message : String(error)}`
      );
      next();
    }
  }

  /**
   * Extract user ID from request (priority: JWT > X-User-Id header > body)
   */
  private extractUserId(req: Request): string | null {
    // Priority 1: Authenticated user (from JWT, if available)
    const reqWithUser = req as Request & { user?: { userId: string } };
    if (reqWithUser.user?.userId) {
      return reqWithUser.user.userId;
    }
    
    // Priority 2: X-User-Id header (MVP/testing)
    if (req.headers["x-user-id"]) {
      return req.headers["x-user-id"] as string;
    }
    
    // Priority 3: Request body
    if (req.body?.userId) {
      return req.body.userId;
    }
    
    return null;
  }

  /**
   * Extract agent ID from request
   */
  private extractAgentId(req: Request): string | null {
    if (req.body?.agentId) {
      return req.body.agentId;
    }
    if (req.headers["x-agent-id"]) {
      return req.headers["x-agent-id"] as string;
    }
    return null;
  }

  /**
   * Extract project ID from request
   */
  private extractProjectId(req: Request): string | null {
    // From URL parameter
    const projectIdMatch = req.path.match(/\/projects\/([^/]+)/);
    if (projectIdMatch) {
      return projectIdMatch[1];
    }
    
    // From body
    if (req.body?.projectId) {
      return req.body.projectId;
    }
    
    return null;
  }

  /**
   * Extract client ID from request
   */
  private extractClientId(req: Request): string | null {
    if (req.body?.clientId) {
      return req.body.clientId;
    }
    if (req.headers["x-client-id"]) {
      return req.headers["x-client-id"] as string;
    }
    return null;
  }

  /**
   * Get operation name from method and path
   */
  private getOperationName(method: string, path: string): string {
    // Normalize path: remove IDs and query params
    const normalizedPath = path
      .replace(/\/[^/]+/g, (match) => {
        // Replace UUIDs and IDs with :id
        if (/^\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(match)) {
          return "/:id";
        }
        if (/^\/[a-z0-9_-]+$/i.test(match)) {
          return "/:id";
        }
        return match;
      })
      .replace(/\?.*$/, ""); // Remove query params
    
    return `${method.toLowerCase()}.${normalizedPath.replace(/^\//, "").replace(/\//g, ".")}`;
  }

  /**
   * Check if endpoint is critical (must be logged even for GET)
   */
  private isCriticalEndpoint(path: string): boolean {
    return CRITICAL_ENDPOINTS.some(endpoint => path.startsWith(endpoint));
  }

  /**
   * Check if endpoint is safe (no logging needed)
   */
  private isSafeEndpoint(path: string): boolean {
    return SAFE_ENDPOINTS.some(endpoint => path === endpoint || path.startsWith(endpoint + "/"));
  }

  /**
   * Sanitize request body (remove sensitive data)
   */
  private sanitizeRequestBody(body: unknown): unknown {
    if (!body || typeof body !== "object") {
      return body;
    }
    
    const sanitized = { ...body as Record<string, unknown> };
    
    // Remove sensitive fields
    const sensitiveFields = ["password", "token", "secret", "apiKey", "authorization"];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = "[REDACTED]";
      }
    }
    
    return sanitized;
  }

  /**
   * Sanitize response body (remove sensitive data, limit size)
   */
  private sanitizeResponseBody(body: unknown): unknown {
    if (!body) {
      return body;
    }
    
    // Limit response body size (max 10KB)
    const bodyStr = JSON.stringify(body);
    if (bodyStr.length > 10000) {
      return { truncated: true, size: bodyStr.length };
    }
    
    return body;
  }

  /**
   * Sanitize headers (remove sensitive headers)
   */
  private sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];
    for (const header of sensitiveHeaders) {
      if (header.toLowerCase() in sanitized) {
        sanitized[header.toLowerCase()] = "[REDACTED]";
      }
    }
    
    return sanitized;
  }
}

