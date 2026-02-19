/**
 * Policy Error Types
 * 
 * Structured errors for policy violations.
 */

import type { PolicyContext, PolicyErrorCode } from "./types.js";
import type { PolicyViolationAdvice } from "@agent-system/shared";

export class PolicyError extends Error {
  constructor(
    message: string,
    public readonly code: PolicyErrorCode,
    public readonly context: PolicyContext,
    public readonly operation: string,
    public readonly advice?: PolicyViolationAdvice
  ) {
    super(message);
    this.name = "PolicyError";
  }
}

