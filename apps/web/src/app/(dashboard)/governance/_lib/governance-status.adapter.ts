/**
 * Governance Status Adapter
 * Loads and validates governance status from API
 * Fail-safe: returns UNKNOWN on any error
 */

import { governanceStatusSchema, type GovernanceStatus } from "./governance-status.schema";

export type LoadResult =
  | { status: "ok"; data: GovernanceStatus; error?: never }
  | { status: "unknown"; data?: never; error: string };

function getApiUrl(): string {
  if (typeof window !== "undefined") {
    return "/api/governance/status";
  }
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL;
  if (base) {
    const protocol = base.startsWith("http") ? "" : "https://";
    return `${protocol}${base.replace(/\/$/, "")}/api/governance/status`;
  }
  return "http://localhost:3000/api/governance/status";
}

/**
 * Load governance status from API
 * Validates with Zod schema (safeParse)
 * Returns UNKNOWN state on any error (fail-safe)
 */
export async function loadGovernanceStatus(): Promise<LoadResult> {
  try {
    const res = await fetch(getApiUrl(), { cache: "no-store" });

    if (!res.ok) {
      console.error("[GovernanceAdapter] API returned", res.status);
      return {
        status: "unknown",
        error: `API returned ${res.status}`,
      };
    }

    const rawData = (await res.json()) as unknown;
    const result = governanceStatusSchema.safeParse(rawData);

    if (!result.success) {
      const errorMessage = `Schema validation failed: ${result.error.message}`;
      console.error("[GovernanceAdapter]", errorMessage);
      return {
        status: "unknown",
        error: errorMessage,
      };
    }

    return {
      status: "ok",
      data: result.data,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error loading governance status";
    console.error("[GovernanceAdapter]", errorMessage);
    return {
      status: "unknown",
      error: errorMessage,
    };
  }
}

/**
 * Retry wrapper
 * Re-runs loadGovernanceStatus (future: add exponential backoff)
 */
export function retryLoadGovernanceStatus(): Promise<LoadResult> {
  return loadGovernanceStatus();
}
