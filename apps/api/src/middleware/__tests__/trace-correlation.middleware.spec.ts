/**
 * Trace Correlation Middleware Tests
 */

import { TraceCorrelationMiddleware } from '../trace-correlation.middleware';
import { FakeClock } from '@agent-system/governance-v2/runtime/clock';
import type { Clock } from '@agent-system/governance-v2/runtime/clock';
import type { Request, Response } from 'express';

interface TraceContext {
  traceId: string;
  requestId: string;
  startTime: number;
}

interface RequestWithTrace extends Request {
  traceContext: TraceContext;
}

describe('TraceCorrelationMiddleware', () => {
  let middleware: TraceCorrelationMiddleware;
  let clock: Clock;

  beforeEach(() => {
    clock = new FakeClock(Date.UTC(2026, 0, 1, 0, 0, 0));
    middleware = new TraceCorrelationMiddleware(clock);
  });

  it('should generate trace ID when none provided', () => {
    const req = {
      headers: {},
      path: '/api/test',
      method: 'GET',
    } as unknown as Request;
    const res = {
      setHeader: jest.fn(),
      statusCode: 200,
      on: jest.fn(),
    } as unknown as Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    const ctx = (req as unknown as RequestWithTrace).traceContext;
    expect(ctx.traceId).toMatch(/^trace-\d+$/);
    expect(ctx.requestId).toMatch(/^req-/);
    expect(res.setHeader).toHaveBeenCalledWith('X-Trace-ID', expect.any(String));
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
    expect(next).toHaveBeenCalled();
  });

  it('should propagate incoming trace ID', () => {
    const incomingTraceId = 'upstream-trace-12345';
    const req = {
      headers: { 'x-trace-id': incomingTraceId },
      path: '/api/test',
      method: 'GET',
    } as unknown as Request;
    const res = {
      setHeader: jest.fn(),
      statusCode: 200,
      on: jest.fn(),
    } as unknown as Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    const ctx = (req as unknown as RequestWithTrace).traceContext;
    expect(ctx.traceId).toBe(incomingTraceId);
    expect(res.setHeader).toHaveBeenCalledWith('X-Trace-ID', incomingTraceId);
  });

  it('should propagate incoming request ID', () => {
    const incomingRequestId = 'request-abc-789';
    const req = {
      headers: { 'x-request-id': incomingRequestId },
      path: '/api/test',
      method: 'GET',
    } as unknown as Request;
    const res = {
      setHeader: jest.fn(),
      statusCode: 200,
      on: jest.fn(),
    } as unknown as Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    const ctx = (req as unknown as RequestWithTrace).traceContext;
    expect(ctx.requestId).toBe(incomingRequestId);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', incomingRequestId);
  });

  it('should reject invalid trace ID format', () => {
    const invalidTraceId = '<script>alert(1)</script>'; // Injection attempt
    const req = {
      headers: { 'x-trace-id': invalidTraceId },
      path: '/api/test',
      method: 'GET',
    } as unknown as Request;
    const res = {
      setHeader: jest.fn(),
      statusCode: 200,
      on: jest.fn(),
    } as unknown as Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    const ctx = (req as unknown as RequestWithTrace).traceContext;
    expect(ctx.traceId).not.toBe(invalidTraceId);
    expect(ctx.traceId).toMatch(/^trace-\d+$/);
  });

  it('should correlate request ID with trace ID when generating new', () => {
    const req = {
      headers: {},
      path: '/api/test',
      method: 'GET',
    } as unknown as Request;
    const res = {
      setHeader: jest.fn(),
      statusCode: 200,
      on: jest.fn(),
    } as unknown as Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    const ctx = (req as unknown as RequestWithTrace).traceContext;
    expect(ctx.requestId).toContain(ctx.traceId);
  });

  it('should use SystemClock by default', () => {
    const defaultMiddleware = new TraceCorrelationMiddleware();
    const req = {
      headers: {},
      path: '/api/test',
      method: 'GET',
    } as unknown as Request;
    const res = {
      setHeader: jest.fn(),
      statusCode: 200,
      on: jest.fn(),
    } as unknown as Response;
    const next = jest.fn();

    expect(() => defaultMiddleware.use(req, res, next)).not.toThrow();
    expect(next).toHaveBeenCalled();
  });
});
