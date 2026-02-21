"use client";

import { useMemo, useState } from "react";
import type { GovernanceStatusResponse } from "../../../../lib/github/governanceArtifact";

type TabKey = "blueprint" | "goldenTasks" | "prs" | "audit";

type Row = {
  id: string;
  title: string;
  status?: string;
  severity?: string;
  source?: string;
  url?: string;
  isIssue: boolean;
  details: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  if (Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function rowFromUnknown(prefix: string, idx: number, item: unknown, isIssueDefault: boolean): Row {
  const r = asRecord(item);
  const id = asString(r?.id) ?? asString(r?.code) ?? `${prefix}-${idx}`;
  const title =
    asString(r?.title) ??
    asString(r?.message) ??
    asString(r?.rule) ??
    asString(r?.name) ??
    asString(r?.id) ??
    `${prefix} #${idx + 1}`;
  const status = asString(r?.status) ?? asString(r?.result);
  const severity = asString(r?.severity) ?? asString(r?.level);
  const url = asString(r?.url) ?? asString(r?.link) ?? asString(r?.htmlUrl);

  const ok = r?.ok;
  const isIssue =
    ok === false ||
    (typeof status === "string" && /drift|fail|error|non-?compliant|violation/i.test(status)) ||
    (typeof severity === "string" && /warn|warning|critical|high|error|fail/i.test(severity)) ||
    isIssueDefault;

  return {
    id,
    title,
    status,
    severity,
    source: asString(r?.path) ?? asString(r?.file) ?? asString(r?.scope),
    url,
    isIssue,
    details: item,
  };
}

function buildRows(status: GovernanceStatusResponse, tab: TabKey): Row[] {
  if (tab === "blueprint") {
    return status.checks.blueprint.violations.map((v, i) => rowFromUnknown("bp", i, v, true));
  }
  if (tab === "goldenTasks") {
    return status.checks.goldenTasks.items.map((it, i) => rowFromUnknown("gt", i, it, false));
  }
  if (tab === "prs") {
    return status.prs.map((pr) => ({
      id: `pr-${pr.number}`,
      title: `#${pr.number} ${pr.title}`,
      status: pr.compliant ? "compliant" : "non-compliant",
      severity: pr.compliant ? undefined : "warning",
      source: pr.author ? `@${pr.author}` : undefined,
      url: pr.url,
      isIssue: !pr.compliant,
      details: pr,
    }));
  }
  const rows: Row[] = [
    {
      id: "audit-generatedAt",
      title: "Generated At",
      status: status.meta.generatedAt,
      isIssue: false,
      details: status.meta.generatedAt,
    },
    {
      id: "audit-run",
      title: "Workflow Run",
      status: status.meta.workflow.runUrl ? "link" : "missing",
      url: status.meta.workflow.runUrl,
      isIssue: !status.meta.workflow.runUrl,
      details: status.meta.workflow,
    },
    {
      id: "audit-artifact",
      title: "Artifact",
      status: status.meta.artifact.webUrl || status.meta.artifact.downloadUrl ? "link" : "missing",
      url: status.meta.artifact.webUrl ?? status.meta.artifact.downloadUrl,
      isIssue: !(status.meta.artifact.webUrl || status.meta.artifact.downloadUrl),
      details: status.meta.artifact,
    },
  ];

  if (status.error) {
    rows.push({
      id: "audit-error",
      title: `Error: ${status.error.code}`,
      status: status.error.message,
      severity: "warning",
      isIssue: true,
      details: status.error,
    });
  }
  return rows;
}

function TabButton(props: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        props.active ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {props.children}
    </button>
  );
}

export function GovernanceTable({ status }: { status: GovernanceStatusResponse }) {
  const [tab, setTab] = useState<TabKey>("blueprint");
  const [onlyIssues, setOnlyIssues] = useState<boolean>(true);
  const [selected, setSelected] = useState<Row | null>(null);

  const rows = useMemo(() => buildRows(status, tab), [status, tab]);
  const visibleRows = useMemo(() => (onlyIssues ? rows.filter((r) => r.isIssue) : rows), [rows, onlyIssues]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <TabButton active={tab === "blueprint"} onClick={() => setTab("blueprint")}>
            Blueprint
          </TabButton>
          <TabButton active={tab === "goldenTasks"} onClick={() => setTab("goldenTasks")}>
            Golden Tasks
          </TabButton>
          <TabButton active={tab === "prs"} onClick={() => setTab("prs")}>
            PRs
          </TabButton>
          <TabButton active={tab === "audit"} onClick={() => setTab("audit")}>
            Audit
          </TabButton>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={onlyIssues}
            onChange={(e) => setOnlyIssues(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Only Issues
        </label>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Link</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {visibleRows.map((row) => (
                <tr
                  key={row.id}
                  className={`cursor-pointer hover:bg-gray-50 ${row.isIssue ? "bg-yellow-50" : ""}`}
                  onClick={() => setSelected(row)}
                >
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="font-medium">{row.title}</div>
                    {(row.severity || row.status) && (
                      <div className="mt-1 text-xs text-gray-500">
                        {row.severity ? <span className="mr-2">Severity: {row.severity}</span> : null}
                        {row.status ? <span>Status: {row.status}</span> : null}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {row.isIssue ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-900 border border-yellow-200">
                        Issue
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-900 border border-green-200">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.source ?? "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {row.url ? (
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {visibleRows.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Keine Einträge</p>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelected(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-xl border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm text-gray-500">{tab.toUpperCase()}</div>
                <div className="text-lg font-semibold text-gray-900 truncate">{selected.title}</div>
              </div>
              <button
                type="button"
                className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
            </div>
            <div className="p-4 overflow-auto">
              {selected.url && (
                <div className="mb-3">
                  <a
                    href={selected.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2 text-sm"
                  >
                    Deep link öffnen
                  </a>
                </div>
              )}
              <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto">
                {JSON.stringify(selected.details, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

