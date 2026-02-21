import { headers } from "next/headers";
import { SystemClock } from "@agent-system/governance-v2/runtime/clock";
import type { GovernanceStatusResponse } from "../../../lib/github/governanceArtifact";
import { GovernanceKpis } from "./_components/GovernanceKpis";
import { GovernanceTable } from "./_components/GovernanceTable";

function getBaseUrl(): string {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

function safeBranch(input: string | string[] | undefined): string {
  const raw = Array.isArray(input) ? input[0] : input;
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "main";
  if (!/^[A-Za-z0-9._/-]+$/.test(trimmed)) return "main";
  return trimmed;
}

async function loadStatus(branch: string): Promise<GovernanceStatusResponse> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/governance/status?branch=${encodeURIComponent(branch)}&includePRs=1`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const clock = new SystemClock();
    return {
      meta: {
        generatedAt: clock.now().toISOString(),
        branch,
        workflow: { name: "timestamp-integrity", file: "timestamp-integrity.yml" },
        artifact: { name: "governance-status" },
      },
      summary: {
        overall: "WARN",
        counts: { blueprintViolations: 0, goldenTasksIssues: 0, prNonCompliant: 0, openPrs: 0 },
      },
      checks: {
        blueprint: { violations: [] },
        goldenTasks: { items: [], counts: { total: 0, issues: 0 } },
        prGovernance: { warnOnly: true },
      },
      prs: [],
      error: { code: "api_failed", message: `API Fehler: ${res.status} ${res.statusText}` },
    };
  }
  return (await res.json()) as GovernanceStatusResponse;
}

export default async function GovernancePage(props: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const sp = props.searchParams ?? {};
  const branch = safeBranch(sp.branch);

  const currentBranch = process.env.VERCEL_GIT_COMMIT_REF ?? process.env.GITHUB_REF_NAME;
  const branchOptions = Array.from(new Set(["main", branch, currentBranch].filter(Boolean))) as string[];

  const status = await loadStatus(branch);
  const hasArtifact = !status.error || status.error.code !== "artifact_missing";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Governance</h1>
          <p className="text-gray-600 mt-1">Warn-only Übersicht aus CI Artifact</p>
        </div>

        <form className="flex flex-wrap items-center gap-2" action="/governance" method="get">
          <label className="text-sm text-gray-600">
            Branch
            <select
              name="branch"
              defaultValue={branch}
              className="ml-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              {branchOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>

          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-900 border border-yellow-200">
            Warn-only
          </span>

          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Refresh
          </button>
        </form>
      </div>

      {status.error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-900 font-semibold">Hinweis</div>
          <div className="text-sm text-yellow-800 mt-1">
            {status.error.message}
            {!hasArtifact && (
              <span className="ml-2 text-yellow-800 font-medium">No artifact available yet.</span>
            )}
          </div>
        </div>
      )}

      <GovernanceKpis status={status} />

      <GovernanceTable status={status} />
    </div>
  );
}

