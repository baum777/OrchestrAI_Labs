"use client";

import type { Run } from "../_lib/governance-status.schema";
import { formatTimestamp, formatDuration, formatCount } from "../_lib/format";
import { StatusChip } from "./StatusChip";

interface RunTableProps {
  runs: Run[];
  maxRows?: number;
}

export function RunTable({ runs, maxRows = 10 }: RunTableProps) {
  const displayRuns = runs.slice(0, maxRows);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Letzte Runs</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Run ID
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Zeitstempel
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Validatoren
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Verstöße
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dauer
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {displayRuns.map((run) => (
              <tr key={run.id} className="hover:bg-gray-50">
                <td className="px-5 py-4 text-sm font-medium text-gray-900">{run.id}</td>
                <td className="px-5 py-4 text-sm text-gray-600 font-mono">
                  {formatTimestamp(run.timestamp)}
                </td>
                <td className="px-5 py-4">
                  <StatusChip status={run.status} size="sm" />
                </td>
                <td className="px-5 py-4 text-sm text-gray-600">{run.validatorCount}</td>
                <td className="px-5 py-4 text-sm text-gray-600">
                  {run.violations > 0 ? (
                    <span className="text-red-600 font-medium">{run.violations}</span>
                  ) : (
                    <span className="text-gray-600">0</span>
                  )}
                </td>
                <td className="px-5 py-4 text-sm text-gray-600 font-mono">
                  {formatDuration(run.durationMs)}
                </td>
              </tr>
            ))}
            {displayRuns.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                  Keine Runs verfügbar
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {runs.length > maxRows && (
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
          {formatCount(runs.length - maxRows, "weiterer Run", "weitere Runs")} ausgeblendet
        </div>
      )}
    </div>
  );
}
