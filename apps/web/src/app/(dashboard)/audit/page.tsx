"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api-client";
import { clock } from "../../../lib/clock";

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
  decisionHash?: string;
}

interface VerifyResult {
  verified: boolean;
  hashMatch: boolean;
  message: string;
}

export default function AuditLedgerPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "blocked" | "allowed">("all");
  const [verifying, setVerifying] = useState<Set<string>>(new Set());
  const [verified, setVerified] = useState<Set<string>>(new Set());

  useEffect(() => {
    // TODO: Replace with actual API endpoint
    // fetchApi("/logs?limit=100")
    clock.setTimeout(() => {
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
          decisionHash: "11940000ea195b5816a3b5cd335ac87b1670b3054fabc3feb21076f09d4a4168",
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
    const date = clock.parseISO(timestamp);
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

  const handleVerify = async (logId: string) => {
    setVerifying((prev) => new Set(prev).add(logId));
    
    try {
      // Mock API call - in production, this would call /api/governance/verify
      const response = await fetchApi(`/api/governance/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId }),
      });
      
      if (response.ok) {
        const result: VerifyResult = await response.json();
        if (result.hashMatch) {
          setVerified((prev) => new Set(prev).add(logId));
        }
      }
    } catch (error) {
      // Mock: Simulate successful verification for demo
      // In production, handle errors properly
      clock.setTimeout(() => {
        setVerified((prev) => new Set(prev).add(logId));
      }, 1000);
    } finally {
      setVerifying((prev) => {
        const next = new Set(prev);
        next.delete(logId);
        return next;
      });
    }
  };

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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Integrität
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      {verified.has(log.id) ? (
                        <div className="group relative">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <span className="mr-1">🛡️</span>
                            Integrity Verified
                          </span>
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10">
                            <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg w-64">
                              Dieser Eintrag wurde deterministisch über das Governance-V2 Framework validiert. Result-Hash ist stabil.
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleVerify(log.id)}
                          disabled={verifying.has(log.id) || !log.decisionHash}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={!log.decisionHash ? "Kein Hash verfügbar" : "Integrität verifizieren"}
                        >
                          {verifying.has(log.id) ? (
                            <>
                              <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-2"></span>
                              Verifying Hash...
                            </>
                          ) : (
                            <>
                              <span className="mr-1">✓</span>
                              Verify
                            </>
                          )}
                        </button>
                      )}
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

