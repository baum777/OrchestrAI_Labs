/**
 * V1 Adapter Bridge
 * 
 * Bridges V1 (legacy) governance functions through V2 interface.
 * V2 can import V1 to encapsulate legacy functionality.
 * 
 * Rule: V1 must NOT know about V2. V2 can import V1.
 */

import type { Clock } from '../runtime/clock.js';
import { SystemClock } from '../runtime/clock.js';
import type { PolicyContext, PolicyDecision } from '@governance/policy/types';
import type { LicenseManager } from '@governance/license/license-manager';
import { PolicyEngine as V1PolicyEngine } from '@governance/policy/policy-engine';
import type { CapabilityMap } from '@agent-system/customer-data';

/**
 * V2-compatible PolicyEngine that wraps V1 implementation.
 * Uses V2 Clock abstraction for deterministic time handling.
 */
export class V1PolicyEngineAdapter {
  private readonly v1Engine: InstanceType<typeof V1PolicyEngine>;
  private readonly clock: Clock;

  constructor(clock?: Clock, licenseManager?: LicenseManager) {
    this.clock = clock ?? new SystemClock();
    this.v1Engine = new V1PolicyEngine(this.clock, licenseManager);
  }

  /**
   * Authorize an operation (V1 method wrapped with V2 Clock).
   */
  authorize(
    ctx: PolicyContext,
    operation: string,
    params: Record<string, unknown>
  ): PolicyDecision {
    return this.v1Engine.authorize(ctx, operation, params);
  }

  /**
   * Sanitize parameters (V1 method).
   */
  sanitize(
    params: Record<string, unknown>,
    capability: unknown,
    operationId: string
  ): unknown {
    return this.v1Engine.sanitize(params, capability as CapabilityMap, operationId);
  }

  /**
   * Redact result data (V1 method).
   */
  redact(
    result: unknown,
    capability: unknown,
    operationId: string
  ): unknown {
    return this.v1Engine.redact(result, capability as CapabilityMap, operationId);
  }

  /**
   * Get the underlying V1 engine (for advanced use cases).
   */
  getV1Engine(): InstanceType<typeof V1PolicyEngine> {
    return this.v1Engine;
  }

  /**
   * Get the Clock instance used by this adapter.
   */
  getClock(): Clock {
    return this.clock;
  }
}

