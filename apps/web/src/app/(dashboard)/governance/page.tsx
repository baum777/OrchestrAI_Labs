"use client";

import { useEffect, useState } from "react";
import { clock } from "../../../lib/clock";

interface CapabilityInfo {
  clientId: string;
  operations: string[];
  sources: string[];
  tier?: "free" | "standard" | "premium";
  premiumFeatures?: string[];
}

export default function GovernanceMatrixPage() {
  const [capabilities, setCapabilities] = useState<CapabilityInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, _setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Replace with actual API endpoint for capabilities
    // For now, we'll simulate with mock data
    // In production: fetchApi("/governance/capabilities")
    clock.setTimeout(() => {
      // Mock data - replace with actual API call
      setCapabilities([
        {
          clientId: "test-agency-1",
          operations: ["GetCustomer", "SearchCustomers"],
          sources: ["mock"],
          tier: "standard",
          premiumFeatures: [],
        },
        {
          clientId: "acme-corp",
          operations: ["GetCustomer", "GetOrder", "SearchProducts"],
          sources: ["postgres", "rest_crm"],
          tier: "premium",
          premiumFeatures: ["marketer"],
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
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-gray-900">{cap.clientId}</h2>
                  {cap.tier === "premium" && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-sm">
                      ⭐ Premium
                    </span>
                  )}
                </div>
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

                {cap.premiumFeatures && cap.premiumFeatures.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Premium-Module</h3>
                    <div className="flex flex-wrap gap-2">
                      {cap.premiumFeatures.map((feature) => (
                        <span
                          key={feature}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border border-purple-200"
                        >
                          {feature === "marketer" && "📊 "}
                          {feature === "marketer" ? "Generalist Marketer" : feature}
                        </span>
                      ))}
                    </div>
                    {cap.premiumFeatures.includes("marketer") && (
                      <div className="mt-2 text-xs text-gray-600 bg-purple-50 p-2 rounded">
                        <strong>Premium-Modul aktiv:</strong> Nutze mathematisches KPI-Parsing für validierte Werbetexte.
                      </div>
                    )}
                  </div>
                )}
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

