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

// Dynamic import to avoid hard dependency (V1 might not always be available)
// V2 can import V1, but V1 must NOT know about V2
let V1PolicyEngineClass: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const v1Module = require('@governance/policy/policy-engine');
  V1PolicyEngineClass = v1Module.PolicyEngine;
} catch {
  // V1 module not available - this is OK for optional bridge
}

/**
 * V2-compatible PolicyEngine that wraps V1 implementation.
 * Uses V2 Clock abstraction for deterministic time handling.
 */
export class V1PolicyEngineAdapter {
  private readonly v1Engine: any; // V1PolicyEngine type (dynamic)
  private readonly clock: Clock;

  constructor(clock?: Clock, licenseManager?: LicenseManager) {
    this.clock = clock ?? new SystemClock();
    
    if (!V1PolicyEngineClass) {
      throw new Error('V1 PolicyEngine not available. Ensure @governance package is installed.');
    }
    
    this.v1Engine = new V1PolicyEngineClass(this.clock, licenseManager);
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
    return this.v1Engine.sanitize(params, capability as any, operationId);
  }

  /**
   * Redact result data (V1 method).
   */
  redact(
    result: unknown,
    capability: unknown,
    operationId: string
  ): unknown {
    return this.v1Engine.redact(result, capability as any, operationId);
  }

  /**
   * Get the underlying V1 engine (for advanced use cases).
   */
  getV1Engine(): any {
    return this.v1Engine;
  }

  /**
   * Get the Clock instance used by this adapter.
   */
  getClock(): Clock {
    return this.clock;
  }
}

