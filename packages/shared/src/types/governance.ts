/**
 * Governance Types
 * 
 * Shared types for governance and policy violations.
 */

export interface PolicyViolationAdvice {
  code: string;
  advisorTitle: string;
  humanExplanation: string;
  remedyStep: string;
  safetyLevel: "info" | "warning" | "critical";
}

