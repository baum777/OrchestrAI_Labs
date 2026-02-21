import type { GovernanceStatusResponse } from "../../../../lib/github/governanceArtifact";

function pillColor(overall: string): { bg: string; text: string; border: string } {
  if (overall === "PASS") return { bg: "bg-green-100", text: "text-green-900", border: "border-green-200" };
  if (overall === "FAIL") return { bg: "bg-red-100", text: "text-red-900", border: "border-red-200" };
  return { bg: "bg-yellow-100", text: "text-yellow-900", border: "border-yellow-200" };
}

function cardTone(count: number): { bg: string; ring: string } {
  if (count > 0) return { bg: "bg-white", ring: "ring-1 ring-yellow-200" };
  return { bg: "bg-white", ring: "ring-1 ring-gray-200" };
}

export function GovernanceKpis({ status }: { status: GovernanceStatusResponse }) {
  const overall = status.summary.overall;
  const overallPill = pillColor(overall);

  const blueprintCount = status.summary.counts.blueprintViolations;
  const gtIssues = status.summary.counts.goldenTasksIssues;
  const prNonCompliant = status.summary.counts.prNonCompliant;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div className={`rounded-lg p-4 ${cardTone(overall === "PASS" ? 0 : 1).bg} ${cardTone(overall === "PASS" ? 0 : 1).ring}`}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-600">Health</div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${overallPill.bg} ${overallPill.text} ${overallPill.border}`}
          >
            {overall}
          </span>
        </div>
        <div className="mt-3 text-2xl font-bold text-gray-900">
          {overall === "PASS" ? "OK" : "Warn"}
        </div>
        <div className="mt-1 text-xs text-gray-500">Phase-1: warn-only</div>
      </div>

      <div className={`rounded-lg p-4 ${cardTone(blueprintCount).bg} ${cardTone(blueprintCount).ring}`}>
        <div className="text-sm font-medium text-gray-600">Blueprint</div>
        <div className="mt-3 text-2xl font-bold text-gray-900">{blueprintCount}</div>
        <div className="mt-1 text-xs text-gray-500">Violations</div>
      </div>

      <div className={`rounded-lg p-4 ${cardTone(gtIssues).bg} ${cardTone(gtIssues).ring}`}>
        <div className="text-sm font-medium text-gray-600">Golden Tasks</div>
        <div className="mt-3 text-2xl font-bold text-gray-900">{gtIssues}</div>
        <div className="mt-1 text-xs text-gray-500">Drift / Issues</div>
      </div>

      <div className={`rounded-lg p-4 ${cardTone(prNonCompliant).bg} ${cardTone(prNonCompliant).ring}`}>
        <div className="text-sm font-medium text-gray-600">PR Governance</div>
        <div className="mt-3 text-2xl font-bold text-gray-900">{prNonCompliant}</div>
        <div className="mt-1 text-xs text-gray-500">Non-compliant PRs</div>
      </div>
    </div>
  );
}

