"use client";

import type { CiHealth, Run } from "../_lib/governance-status.schema";
import { StatusChip } from "./StatusChip";
import { formatTimestamp } from "../_lib/format";

interface CiMatrixProps {
  ciHealth: CiHealth;
  runs: Run[];
  maxRuns?: number;
}

export function CiMatrix({ ciHealth, runs, maxRuns = 5 }: CiMatrixProps) {
  const displayRuns = runs.slice(0, maxRuns);
  const checkNames = ciHealth.checks.map((check) => check.name);

  return (
    <div className="space-y-6">
      {/* CI Health Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">CI Health</h3>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
              <span>
                Branch: <span className="font-mono font-medium text-gray-900">{ciHealth.branch}</span>
              </span>
              <span>
                Commit: <span className="font-mono font-medium text-gray-900">{ciHealth.lastCommit}</span>
              </span>
            </div>
          </div>
          <StatusChip status={ciHealth.status} />
        </div>

        {/* Latest Checks */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ciHealth.checks.map((check) => (
            <div
              key={check.name}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <span className="text-sm font-medium text-gray-700 capitalize">{check.name}</span>
              <StatusChip status={check.status} size="sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Run Matrix */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">CI Matrix</h3>
          <p className="text-sm text-gray-600 mt-1">Letzte {maxRuns} Runs mit CI-Status</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Run
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zeit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {checkNames.map((name) => (
                  <th
                    key={name}
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider capitalize"
                  >
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {displayRuns.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 font-mono">{run.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                    {formatTimestamp(run.timestamp).split(" ")[0]}
                    <br />
                    <span className="text-gray-400">
                      {formatTimestamp(run.timestamp).split(" ")[1]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip status={run.status} size="sm" />
                  </td>
                  {checkNames.map((name) => {
                    // MVP: Use current CI health status for all runs
                    // Future: Each run should have its own CI results
                    const check = ciHealth.checks.find((c) => c.name === name);
                    return (
                      <td key={name} className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          {check ? (
                            <span
                              className={`inline-block h-3 w-3 rounded-full ${
                                check.status === "success"
                                  ? "bg-green-500"
                                  : check.status === "warning"
                                    ? "bg-yellow-500"
                                    : check.status === "error"
                                      ? "bg-red-500"
                                      : "bg-gray-300"
                              }`}
                              title={`${name}: ${check.status}`}
                            />
                          ) : (
                            <span className="inline-block h-3 w-3 rounded-full bg-gray-300" />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {displayRuns.length === 0 && (
                <tr>
                  <td colSpan={3 + checkNames.length} className="px-4 py-8 text-center text-gray-500">
                    Keine Runs verfügbar
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
