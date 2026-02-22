/**
 * GET /api/governance/status
 * Returns governance status from persisted CI artifact.
 *
 * Data source:
 * - Vercel Blob: governance-status/latest.json
 * - Filesystem fallback (local dev): /governance-status/latest.json
 *
 * TODO: Add additional storage providers:
 *   - S3: Add to governance-artifact-storage.ts
 *   - Railway Volume: Same approach as filesystem
 *   - Internal artifact service: Add REST endpoint support
 */

import { NextResponse } from "next/server";
import { loadLatestArtifact } from "../../../../lib/governance-artifact-storage";

const CACHE_CONTROL = "public, max-age=60";

export async function GET() {
  try {
    const { data, error } = await loadLatestArtifact();

    if (error || data === null) {
      return NextResponse.json(
        { error: "Governance artifact not found" },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch {
    // Security: No details leaked on unexpected errors
    return NextResponse.json(
      { error: "Governance status unavailable" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
