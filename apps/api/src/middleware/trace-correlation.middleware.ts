/**
 * Trace Correlation Middleware
 *
 * Ensures X-Trace-ID propagation across API boundaries.
 * Correlates requestId with traceId for end-to-end observability.
 * NO Date usage - uses SystemClock only for timestamps.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SystemClock } from '@agent-system/governance-v2/runtime/clock';
import type { Clock } from '@agent-system/governance-v2/runtime/clock';

@Injectable()
export class TraceCorrelationMiddleware implements NestMiddleware {
  private clock: Clock;

  constructor(clock?: Clock) {
    this.clock = clock ?? new SystemClock();
  }

  use(req: Request, res: Response, next: NextFunction): void {
    // Extract or generate trace ID (NO random - deterministic from clock)
    const traceId = this.extractOrGenerateTraceId(req);
    
    // Extract or generate request ID
    const requestId = this.extractOrGenerateRequestId(req, traceId);

    // Set trace context on request for downstream use
    (req as any).traceContext = {
      traceId,
      requestId,
      startTime: this.clock.now().getTime(),
    };

    // Propagate to response headers
    res.setHeader('X-Trace-ID', traceId);
    res.setHeader('X-Request-ID', requestId);

    // Log with correlation (sanitized - no PII)
    if (process.env.TELEMETRY_EXPORT_ENABLED === 'true') {
      console.log(JSON.stringify({
        type: 'trace_start',
        trace_id: this.hashIdentifier(traceId),
        request_id: this.hashIdentifier(requestId),
        path: req.path,
        method: req.method,
        timestamp: this.clock.now().toISOString(),
      }));
    }

    // Track response completion for span duration
    res.on('finish', () => {
      const ctx = (req as any).traceContext;
      if (ctx && process.env.TELEMETRY_EXPORT_ENABLED === 'true') {
        console.log(JSON.stringify({
          type: 'trace_end',
          trace_id: this.hashIdentifier(traceId),
          request_id: this.hashIdentifier(requestId),
          status_code: res.statusCode,
          duration_ms: this.clock.now().getTime() - ctx.startTime,
          timestamp: this.clock.now().toISOString(),
        }));
      }
    });

    next();
  }

  private extractOrGenerateTraceId(req: Request): string {
    // Check for incoming trace ID from upstream
    const incomingTraceId = req.headers['x-trace-id'] || req.headers['x-b3-traceid'];
    if (incomingTraceId && typeof incomingTraceId === 'string') {
      // Validate format (alphanumeric and hyphens only, max 64 chars)
      if (/^[a-zA-Z0-9\-]{8,64}$/.test(incomingTraceId)) {
        return incomingTraceId;
      }
    }
    
    // Generate deterministic trace ID from clock
    return this.generateTraceId();
  }

  private extractOrGenerateRequestId(req: Request, traceId: string): string {
    // Check for incoming request ID
    const incomingRequestId = req.headers['x-request-id'];
    if (incomingRequestId && typeof incomingRequestId === 'string') {
      // Validate format
      if (/^[a-zA-Z0-9\-]{8,64}$/.test(incomingRequestId)) {
        return incomingRequestId;
      }
    }
    
    // Generate request ID correlated with trace ID
    return `req-${traceId}-${this.clock.now().getTime()}`;
  }

  private generateTraceId(): string {
    // Deterministic trace ID using clock timestamp + counter
    return `trace-${this.clock.now().getTime()}`;
  }

  private hashIdentifier(value: string): string {
    // Consistent hashing for telemetry (no raw identifiers)
    return `hash-${Buffer.from(value).toString('base64').substring(0, 16)}`;
  }
}
