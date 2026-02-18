"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/api-client";

interface CapabilityInfo {
  clientId: string;
  operations: string[];
  sources: string[];
}

export default function GovernanceMatrixPage() {
  const [capabilities, setCapabilities] = useState<CapabilityInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Replace with actual API endpoint for capabilities
    // For now, we'll simulate with mock data
    // In production: fetchApi("/governance/capabilities")
    setTimeout(() => {
      // Mock data - replace with actual API call
      setCapabilities([
        {
          clientId: "test-agency-1",
          operations: ["GetCustomer", "SearchCustomers"],
          sources: ["mock"],
        },
        {
          clientId: "acme-corp",
          operations: ["GetCustomer", "GetOrder", "SearchProducts"],
          sources: ["postgres", "rest_crm"],
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Governance Matrix</h1>
        <p className="text-gray-600 mt-1">Client-spezifische Capabilities und Berechtigungen</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Lade Capabilities...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {capabilities.map((cap) => (
            <div
              key={cap.clientId}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">{cap.clientId}</h2>
                <span className="text-sm text-gray-500">
                  {cap.operations.length} Operation{cap.operations.length !== 1 ? "en" : ""}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Erlaubte Operationen</h3>
                  <div className="flex flex-wrap gap-2">
                    {cap.operations.map((op) => (
                      <span
                        key={op}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                      >
                        {op}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Datenquellen</h3>
                  <div className="flex flex-wrap gap-2">
                    {cap.sources.map((source) => (
                      <span
                        key={source}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {capabilities.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Keine Capabilities konfiguriert</p>
        </div>
      )}
    </div>
  );
}

