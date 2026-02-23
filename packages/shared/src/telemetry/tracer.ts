/**
 * OpenTelemetry Tracer
 *
 * Provides distributed tracing for agent execution flows.
 * All spans use deterministic IDs and clock-based timestamps.
 */

import { SystemClock } from '../timestamp-integrity';
import type { Clock } from '../types';

export interface Span {
  name: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startTime: number; // epoch ms from clock
  endTime?: number;
  attributes: Record<string, string | number | boolean>;
  status: 'ok' | 'error';
  events: SpanEvent[];
}

interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, unknown>;
}

export interface SpanContext {
  traceId: string;
  spanId: string;
  isRemote: boolean;
}

export class Tracer {
  private clock: Clock;
  private activeSpans: Map<string, Span> = new Map();
  private spanCounter: number = 0;

  constructor(clock?: Clock) {
    this.clock = clock ?? new SystemClock();
  }

  startSpan(name: string, parentContext?: SpanContext, attributes?: Record<string, unknown>): Span {
    const traceId = parentContext?.traceId ?? this.generateTraceId();
    const spanId = this.generateSpanId();

    const span: Span = {
      name,
      traceId,
      spanId,
      parentSpanId: parentContext?.spanId,
      startTime: this.clock.now().getTime(),
      attributes: this.sanitizeAttributes(attributes ?? {}),
      status: 'ok',
      events: [],
    };

    this.activeSpans.set(spanId, span);
    return span;
  }

  endSpan(spanId: string, status: 'ok' | 'error' = 'ok'): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.endTime = this.clock.now().getTime();
    span.status = status;
    this.exportSpan(span);
    this.activeSpans.delete(spanId);
  }

  addEvent(spanId: string, name: string, attributes?: Record<string, unknown>): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.events.push({
      name,
      timestamp: this.clock.now().getTime(),
      attributes,
    });
  }

  private generateTraceId(): string {
    return `trace-${this.clock.now().getTime()}-${++this.spanCounter}`;
  }

  private generateSpanId(): string {
    return `span-${++this.spanCounter}`;
  }

  private sanitizeAttributes(attrs: Record<string, unknown>): Record<string, string | number | boolean> {
    const sanitized: Record<string, string | number | boolean> = {};

    for (const [key, value] of Object.entries(attrs)) {
      if (this.isPiiField(key)) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      if (this.isSensitiveIdentifier(key)) {
        sanitized[key] = this.hashIdentifier(String(value));
        continue;
      }

      if (typeof value === 'string') {
        sanitized[key] = value;
      } else if (typeof value === 'number') {
        sanitized[key] = value;
      } else if (typeof value === 'boolean') {
        sanitized[key] = value;
      } else {
        sanitized[key] = JSON.stringify(value);
      }
    }

    return sanitized;
  }

  private isPiiField(key: string): boolean {
    const piiPatterns = ['email', 'phone', 'ssn', 'password', 'token', 'secret', 'credit_card'];
    return piiPatterns.some(p => key.toLowerCase().includes(p));
  }

  private isSensitiveIdentifier(key: string): boolean {
    const sensitivePatterns = ['user_id', 'client_id', 'tenant_id', 'customer_id'];
    return sensitivePatterns.some(p => key.toLowerCase().includes(p));
  }

  private hashIdentifier(value: string): string {
    return `hash-${Buffer.from(value).toString('base64').substring(0, 16)}`;
  }

  private exportSpan(span: Span): void {
    if (process.env.TELEMETRY_EXPORT_ENABLED === 'true') {
      console.log(JSON.stringify({
        type: 'span',
        ...span,
        duration_ms: span.endTime ? span.endTime - span.startTime : undefined,
      }));
    }
  }
}

export const tracer = new Tracer();
