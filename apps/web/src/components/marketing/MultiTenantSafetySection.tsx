"use client";

export function MultiTenantSafetySection() {
  return (
    <div className="grid md:grid-cols-2 gap-12 items-center">
      <div className="order-2 md:order-1">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
          <h4 className="text-lg font-semibold text-gray-900 mb-6">
            Multi-Tenant Architektur
          </h4>
          
          {/* Visual representation */}
          <div className="space-y-4">
            {/* Client 1 */}
            <div className="border-2 border-indigo-300 rounded-lg p-4 bg-indigo-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                <span className="font-semibold text-indigo-900">Client A</span>
              </div>
              <div className="ml-5 space-y-2 text-sm text-indigo-800">
                <div className="flex items-center gap-2">
                  <span>📊</span>
                  <span>Connector Registry (isolated)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🔒</span>
                  <span>Capability Registry (client-scoped)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>💾</span>
                  <span>Data Store (physical separation)</span>
                </div>
              </div>
            </div>

            {/* Client 2 */}
            <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <span className="font-semibold text-blue-900">Client B</span>
              </div>
              <div className="ml-5 space-y-2 text-sm text-blue-800">
                <div className="flex items-center gap-2">
                  <span>📊</span>
                  <span>Connector Registry (isolated)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🔒</span>
                  <span>Capability Registry (client-scoped)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>💾</span>
                  <span>Data Store (physical separation)</span>
                </div>
              </div>
            </div>

            {/* Separation indicator */}
            <div className="flex items-center justify-center py-2">
              <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
              <span className="px-4 text-xs font-semibold text-gray-500">
                PHYSICAL SEPARATION
              </span>
              <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
            </div>
          </div>
        </div>
      </div>
      <div className="order-1 md:order-2">
        <div className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-semibold mb-4">
          Multi-Tenant Safety
        </div>
        <h3 className="text-3xl font-bold text-gray-900 mb-4">
          Physische Daten-Trennung
        </h3>
        <p className="text-lg text-gray-600 mb-6">
          Die <code className="font-mono bg-gray-100 px-1 rounded">ClientRegistry</code> stellt
          sicher, dass Daten verschiedener Clients physisch getrennt sind. Keine Cross-Client-Zugriffe möglich.
        </p>
        <ul className="space-y-3 text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>
              <strong>Connector Registry:</strong> Jeder Client hat isolierte Connector-Instanzen
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>
              <strong>Capability Registry:</strong> Client-scoped Operation-Allowlists
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>
              <strong>Data Store:</strong> Physische Trennung auf Datenbank-Ebene
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>
              <strong>Policy Enforcement:</strong> Automatische Blockierung von Cross-Client-Zugriffen
            </span>
          </li>
        </ul>
        <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <p className="text-sm text-indigo-800">
            <strong>Technische Details:</strong> Die{" "}
            <code className="font-mono bg-indigo-100 px-1 rounded">InMemoryMultiSourceConnectorRegistry</code>{" "}
            verwendet eine verschachtelte Map-Struktur (<code className="font-mono bg-indigo-100 px-1 rounded">clientId → source → connector</code>),
            die garantiert, dass Connectors verschiedener Clients niemals vermischt werden können.
          </p>
        </div>
      </div>
    </div>
  );
}


