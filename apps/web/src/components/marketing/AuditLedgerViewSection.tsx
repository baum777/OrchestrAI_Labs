"use client";

import { clock } from "../../lib/clock.js";

export function AuditLedgerViewSection() {
  // Sample audit log entries for demo
  const sampleLogs = [
    {
      id: "log-1",
      timestamp: "2026-02-18T10:30:00.000Z",
      action: "customer_data.access",
      userId: "user-1",
      clientId: "test-agency-1",
      blocked: false,
      decisionHash: "11940000ea195b5816a3b5cd335ac87b1670b3054fabc3feb21076f09d4a4168",
    },
    {
      id: "log-2",
      timestamp: "2026-02-18T09:15:00.000Z",
      action: "policy.violation",
      userId: "user-2",
      clientId: "test-agency-1",
      blocked: true,
      reason: "PII fields not allowed",
    },
    {
      id: "log-3",
      timestamp: "2026-02-18T08:45:00.000Z",
      action: "marketing.narrative.generate",
      userId: "user-1",
      clientId: "test-agency-1",
      blocked: false,
      decisionHash: "a3f5b8c2d1e4f6a7b9c0d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3",
    },
  ];

  const formatTimestamp = (timestamp: string) => {
    const date = clock.parseISO(timestamp);
    return date.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="grid md:grid-cols-2 gap-12 items-center">
      <div className="order-2 md:order-1">
        <div className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-semibold mb-4">
          Audit Ledger
        </div>
        <h3 className="text-3xl font-bold text-gray-900 mb-4">
          Unveränderlicher Audit-Verlauf
        </h3>
        <p className="text-lg text-gray-600 mb-6">
          Jede Aktion wird in einem append-only Audit-Log gespeichert. Deterministische Hashes
          ermöglichen mathematische Verifikation der Integrität.
        </p>
        <ul className="space-y-3 text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Append-only Logging (keine Löschung möglich)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Deterministische Hashes für jede Policy-Entscheidung</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Replay-fähige Audit-Trails</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Compliance-ready für Revisionen</span>
          </li>
        </ul>
      </div>
      <div className="order-1 md:order-2">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          Live-Beispiel: Audit Ledger View
        </h4>
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h5 className="text-sm font-semibold text-gray-900">Audit Log Entries</h5>
          </div>
          <div className="divide-y divide-gray-200">
            {sampleLogs.map((log) => (
              <div
                key={log.id}
                className={`px-4 py-3 ${log.blocked ? "bg-red-50" : ""}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                        {log.action}
                      </code>
                      {log.blocked ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Blockiert
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Erlaubt
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600">
                      {formatTimestamp(log.timestamp)} • {log.userId} • {log.clientId}
                    </div>
                    {log.reason && (
                      <div className="text-xs text-red-700 mt-1">{log.reason}</div>
                    )}
                  </div>
                </div>
                {log.decisionHash && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Hash:</span>
                      <code className="text-xs font-mono text-gray-700 break-all">
                        {log.decisionHash.substring(0, 32)}...
                      </code>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ Verified
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>Was Sie sehen:</strong> Jeder Eintrag enthält einen deterministischen Hash,
            der bei identischen Inputs immer gleich ist. Dies ermöglicht mathematische Verifikation
            der Integrität über Zeit hinweg.
          </p>
        </div>
      </div>
    </div>
  );
}


