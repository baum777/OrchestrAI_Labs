/**
 * Policy Error Types
 * 
 * Structured errors for policy violations.
 */

import type { PolicyContext, PolicyErrorCode } from "./types.js";

export class PolicyError extends Error {
  constructor(
    message: string,
    public readonly code: PolicyErrorCode,
    public readonly context: PolicyContext,
    public readonly operation: string
  ) {
    super(message);
    this.name = "PolicyError";
  }
}

