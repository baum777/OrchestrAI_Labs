/**
 * Governance V2 Bridge
 * 
 * Entry point for V2-First architecture.
 * Exports V1 functionality through V2 interface.
 */

export { V1PolicyEngineAdapter } from './v1-adapter.js';
export type { Clock } from '../runtime/clock.js';
export { SystemClock, FakeClock } from '../runtime/clock.js';
export type { PolicyViolationAdvice } from '@shared/types/governance';

// Re-export V2 types
export type {
  Decision,
  PolicyRule,
  AutonomyPolicy,
} from '../types/governance.types.js';

// Re-export V1 types through V2 namespace
export type {
  PolicyContext,
  PolicyDecision,
  PolicyErrorCode,
  SanitizedParams,
  RedactedResult,
} from '@governance/policy/types';

export { PolicyEngine as V2PolicyEngine } from '../policy/policy-engine.js';

