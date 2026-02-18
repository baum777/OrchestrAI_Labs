"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/api-client";

interface AuditLogEntry {
  id: string;
  action: string;
  userId: string;
  agentId?: string;
  projectId?: string;
  clientId?: string;
  blocked: boolean;
  reason?: string;
  timestamp: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}

export default function AuditLedgerPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "blocked" | "allowed">("all");

  useEffect(() => {
    // TODO: Replace with actual API endpoint
    // fetchApi("/logs?limit=100")
    setTimeout(() => {
      setLogs([
        {
          id: "log-1",
          action: "customer_data.access",
          userId: "user-1",
          agentId: "agent-1",
          projectId: "project-1",
          clientId: "test-agency-1",
          blocked: false,
          timestamp: "2026-02-18T10:30:00.000Z",
        },
        {
          id: "log-2",
          action: "policy.violation",
          userId: "user-2",
          agentId: "agent-2",
          projectId: "project-2",
          clientId: "test-agency-1",
          blocked: true,
          reason: "Fields not allowed",
          timestamp: "2026-02-18T09:15:00.000Z",
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const formatTimestamp = (timestamp: string) => {
    // Use timestamp from API (SystemClock) - no Date.now()!
    const date = new Date(timestamp);
    return date.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === "blocked") return log.blocked;
    if (filter === "allowed") return !log.blocked;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Ledger</h1>
          <p className="text-gray-600 mt-1">Vollständiges Audit-Log aller Aktionen</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "all"
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFilter("blocked")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "blocked"
                ? "bg-red-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Blockiert
          </button>
          <button
            onClick={() => setFilter("allowed")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "allowed"
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Erlaubt
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Lade Audit-Logs...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zeitstempel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktion
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User / Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grund
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className={log.blocked ? "bg-red-50" : ""}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                        {log.action}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{log.userId}</div>
                      {log.agentId && (
                        <div className="text-xs text-gray-500">Agent: {log.agentId}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.clientId || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.blocked ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Blockiert
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Erlaubt
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.reason || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredLogs.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Keine Log-Einträge gefunden</p>
        </div>
      )}
    </div>
  );
}

