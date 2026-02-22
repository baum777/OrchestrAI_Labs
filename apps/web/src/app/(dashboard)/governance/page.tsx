"use client";

import { useState, useEffect } from "react";
import { clock } from "../../../lib/clock";
import { loadGovernanceStatus, retryLoadGovernanceStatus } from "./_lib/governance-status.adapter";
import { formatSuccessRate, formatCount, formatTimestamp } from "./_lib/format";
import { StatusChip } from "./_components/StatusChip";
import { MetricCard } from "./_components/MetricCard";
import { RunTable } from "./_components/RunTable";

export default function GovernanceOverviewPage() {
  const [result, setResult] = useState<Awaited<ReturnType<typeof loadGovernanceStatus>> | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    void loadGovernanceStatus().then(setResult);
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    clock.setTimeout(() => {
      void retryLoadGovernanceStatus().then((r) => {
        setResult(r);
        setIsRetrying(false);
      });
    }, 500);
  };

  // Loading state
  if (result === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        <span className="ml-3 text-gray-600">Lade Governance-Status...</span>
      </div>
    );
  }

  // UNKNOWN State (fail-safe)
  if (result.status === "unknown") {
    return (
      <div className="space-y-6">
        {/* UNKNOWN Banner */}
        <div className="bg-gray-100 border-l-4 border-gray-500 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">Governance-Status unbekannt</h2>
              <p className="text-gray-600 mt-1">
                Die Governance-Daten konnten nicht geladen oder validiert werden.
              </p>
              {result?.error && (
                <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                  <p className="text-sm font-mono text-red-600">{result.error}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isRetrying ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Wird geladen...
                </>
              ) : (
                "Erneut versuchen"
              )}
            </button>
          </div>
        </div>

        {/* Unknown State Cards - Never show green */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Gesamtruns" value="—" status="unknown" />
          <MetricCard title="Erfolgsrate" value="—" status="unknown" />
          <MetricCard title="Aktive Validatoren" value="—" status="unknown" />
          <MetricCard title="Letzter Run" value="—" status="unknown" />
        </div>
      </div>
    );
  }

  const { data } = result;
  const latestRun = data.runs[0];

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <div
        className={`rounded-lg p-4 border-l-4 ${
          data.overallStatus === "success"
            ? "bg-green-50 border-green-500"
            : data.overallStatus === "warning"
              ? "bg-yellow-50 border-yellow-500"
              : data.overallStatus === "error"
                ? "bg-red-50 border-red-500"
                : "bg-gray-50 border-gray-500"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="font-medium text-gray-700">Gesamtstatus:</span>
          <StatusChip status={data.overallStatus} />
          <span className="text-sm text-gray-500 ml-4">
            Generiert: {formatTimestamp(data.generatedAt)}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Gesamtruns"
          value={data.summary.totalRuns.toLocaleString()}
          subtitle={formatCount(data.summary.totalRuns, "Run insgesamt", "Runs insgesamt")}
          status="success"
        />
        <MetricCard
          title="Erfolgsrate"
          value={formatSuccessRate(data.summary.successRate)}
          subtitle={data.summary.successRate >= 95 ? "Ausgezeichnet" : "Verbesserungsbedürftig"}
          status={data.summary.successRate >= 95 ? "success" : "warning"}
        />
        <MetricCard
          title="Aktive Validatoren"
          value={data.summary.activeValidators}
          subtitle={formatCount(data.summary.activeValidators, "Validator aktiv", "Validatoren aktiv")}
          status={data.summary.activeValidators >= 4 ? "success" : "warning"}
        />
        <MetricCard
          title="Letzter Run"
          value={latestRun ? formatTimestamp(latestRun.timestamp).split(" ")[0] : "—"}
          subtitle={latestRun ? `Status: ${latestRun.status}` : "Keine Daten"}
          status={latestRun?.status || "unknown"}
        />
      </div>

      {/* Latest Run Summary */}
      {latestRun && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Letzter Run</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <span className="text-sm text-gray-500">Run ID</span>
              <p className="font-mono font-medium text-gray-900">{latestRun.id}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Zeitstempel</span>
              <p className="font-mono text-gray-900">{formatTimestamp(latestRun.timestamp)}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Validatoren</span>
              <p className="font-medium text-gray-900">{latestRun.validatorCount}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Verstöße</span>
              <p
                className={`font-medium ${
                  latestRun.violations > 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {latestRun.violations}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Run Table */}
      <RunTable runs={data.runs} maxRows={10} />
    </div>
  );
}
