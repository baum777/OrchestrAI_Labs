import { NextResponse, type NextRequest } from "next/server";
import { SystemClock } from "@agent-system/governance-v2/runtime/clock";
import {
  coerceGovernanceStatusResponse,
  fetchGovernanceStatus,
  type GovernanceStatusResponse,
} from "../../../../lib/github/governanceArtifact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_MS = 60_000;
const cache = new Map<string, { ts: number; data: GovernanceStatusResponse }>();

function asBoolFlag(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  const v = value.trim();
  if (v === "1" || /^true$/i.test(v) || /^yes$/i.test(v)) return true;
  if (v === "0" || /^false$/i.test(v) || /^no$/i.test(v)) return false;
  return undefined;
}

function safeBranch(input: string | null): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  if (!/^[A-Za-z0-9._/-]+$/.test(trimmed)) return undefined;
  return trimmed;
}

function mockResponse(branch: string): GovernanceStatusResponse {
  const clock = new SystemClock();
  const nowIso = clock.now().toISOString();
  return {
    meta: {
      generatedAt: nowIso,
      branch,
      workflow: {
        name: "timestamp-integrity",
        file: "timestamp-integrity.yml",
        runUrl: undefined,
      },
      artifact: {
        name: "governance-status",
        downloadUrl: undefined,
        webUrl: undefined,
      },
    },
    summary: {
      overall: "WARN",
      counts: {
        blueprintViolations: 1,
        goldenTasksIssues: 1,
        prNonCompliant: 1,
        openPrs: 2,
      },
    },
    checks: {
      blueprint: {
        violations: [
          {
            id: "bp-001",
            severity: "warning",
            title: "Beispiel-Violation (dev mock)",
            path: "docs/DOCS_BLUEPRINT_SPEC.md",
            message: "Mock-Daten, weil GITHUB_TOKEN fehlt (dev only).",
          },
        ],
      },
      goldenTasks: {
        items: [
          { id: "GT-001", status: "drift", message: "Mock drift item (dev mock)" },
          { id: "GT-002", status: "ok" },
        ],
        counts: { total: 2, issues: 1 },
      },
      prGovernance: {
        warnOnly: true,
        openPrs: { total: 2, nonCompliant: 1 },
      },
    },
    prs: [
      {
        number: 123,
        title: "Mock PR (compliant)",
        url: "https://github.com/example/example/pull/123",
        compliant: true,
        missingSections: [],
      },
      {
        number: 124,
        title: "Mock PR (missing sections)",
        url: "https://github.com/example/example/pull/124",
        compliant: false,
        missingSections: ["Golden Task Impact"],
      },
    ],
    error: {
      code: "missing_github_token",
      message: "GITHUB_TOKEN fehlt – dev mock response aktiv.",
    },
  };
}

export async function GET(request: NextRequest) {
  const clock = new SystemClock();
  const { searchParams } = new URL(request.url);
  const branch = safeBranch(searchParams.get("branch")) ?? "main";
  const includePRs = asBoolFlag(searchParams.get("includePRs")) ?? true;

  const cacheKey = `${branch}::${includePRs ? "prs1" : "prs0"}`;
  const cached = cache.get(cacheKey);
  const now = clock.now().getTime();
  if (cached && now - cached.ts < TTL_MS) {
    return NextResponse.json(cached.data, { status: 200 });
  }

  if (!process.env.GITHUB_TOKEN && process.env.NODE_ENV !== "production") {
    const data = mockResponse(branch);
    cache.set(cacheKey, { ts: now, data });
    return NextResponse.json(data, { status: 200 });
  }

  const data = await fetchGovernanceStatus({ branch, includePRs, token: process.env.GITHUB_TOKEN });
  const coerced = coerceGovernanceStatusResponse(data) ?? data;

  cache.set(cacheKey, { ts: now, data: coerced });
  return NextResponse.json(coerced, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=60",
    },
  });
}

