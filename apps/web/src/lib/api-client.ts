import type { PolicyViolationAdvice } from "@shared/types/governance";

export interface PolicyErrorResponse {
  statusCode: number;
  message: string;
  code: string;
  operation: string;
  advice?: PolicyViolationAdvice;
}

export async function fetchApi(path: string, init?: RequestInit): Promise<Response> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${base}${path}`, init);
  if (!response.ok) {
    // Check if it's a PolicyError response
    if (response.status === 403) {
      try {
        const errorData: PolicyErrorResponse = await response.json();
        if (errorData.advice) {
          throw new PolicyError(errorData.message, errorData.code, errorData.operation, errorData.advice);
        }
      } catch {
        // Not a PolicyError, fall through to generic error
      }
    }
    throw new Error(`API request failed for ${path}: ${response.statusText}`);
  }
  return response;
}

export class PolicyError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly operation: string,
    public readonly advice?: PolicyViolationAdvice
  ) {
    super(message);
    this.name = "PolicyError";
  }
}

