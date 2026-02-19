/**
 * Policy Error Filter
 * 
 * Production-safe error handling for PolicyError exceptions.
 * SOC 2: CC6.1 (Logical and physical access controls)
 * 
 * In production:
 * - Generic error messages (no sensitive details)
 * - No stack traces
 * - No operation details
 * 
 * In development:
 * - Detailed error messages
 * - Stack traces (if available)
 * - Full operation context
 */

import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from "@nestjs/common";
import type { Response } from "express";
import { PolicyError } from "@governance/policy/policy-engine";

const isDevelopment = process.env.NODE_ENV !== "production";
const isProduction = process.env.NODE_ENV === "production";

@Catch(PolicyError)
export class PolicyErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(PolicyErrorFilter.name);

  catch(exception: PolicyError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const status = HttpStatus.FORBIDDEN;

    // Log detailed error internally (always, for debugging)
    this.logger.error(
      `PolicyError: ${exception.code} - ${exception.message}`,
      {
        operation: exception.operation,
        context: exception.context,
        stack: exception.stack,
        path: request.path,
        method: request.method,
      }
    );

    // Production-safe error response
    if (isProduction) {
      // Generic error message (no sensitive details)
      const errorResponse = {
        statusCode: status,
        message: "Access denied. Please contact support if you believe this is an error.",
        code: exception.code, // Keep code for client-side handling
        // No operation, no advice, no stack trace in production
      };

      response.status(status).json(errorResponse);
    } else {
      // Development: detailed error response
      const errorResponse = {
        statusCode: status,
        message: exception.message,
        code: exception.code,
        operation: exception.operation,
        advice: exception.advice,
        // Include stack trace in development
        ...(isDevelopment && exception.stack ? { stack: exception.stack } : {}),
      };

      response.status(status).json(errorResponse);
    }
  }
}

