"use client";

import type { Reason } from "../_lib/governance-status.schema";
import { StatusChip } from "./StatusChip";

interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  reason: Reason | null;
}

export function EvidenceDrawer({ isOpen, onClose, reason }: EvidenceDrawerProps) {
  if (!isOpen || !reason) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-xl transform transition-transform translate-x-0">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 font-mono">{reason.code}</h2>
                <div className="mt-1">
                  <StatusChip status={reason.severity} />
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Schließen"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Description */}
            <section>
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wider mb-2">
                Beschreibung
              </h3>
              <p className="text-gray-900">{reason.description}</p>
            </section>

            {/* Count */}
            <section>
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wider mb-2">
                Häufigkeit
              </h3>
              <div className="text-2xl font-bold text-gray-900">{reason.count}</div>
              <p className="text-sm text-gray-500">
                {reason.count === 1 ? "Vorkommen im aktuellen Run" : "Vorkommen im aktuellen Run"}
              </p>
            </section>

            {/* Affected Validators */}
            <section>
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wider mb-2">
                Betroffene Validatoren
              </h3>
              <div className="flex flex-wrap gap-2">
                {reason.affectedValidators.map((validatorId) => (
                  <span
                    key={validatorId}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 font-mono"
                  >
                    {validatorId}
                  </span>
                ))}
              </div>
            </section>

            {/* Evidence */}
            <section>
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wider mb-3">
                Evidence
              </h3>
              <div className="space-y-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    Sample
                  </label>
                  <code className="block text-sm font-mono text-gray-900 bg-white p-2 rounded border border-gray-200">
                    {reason.evidence.sample}
                  </code>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    Ort
                  </label>
                  <code className="block text-sm font-mono text-gray-900 bg-white p-2 rounded border border-gray-200">
                    {reason.evidence.location}
                  </code>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    Empfehlung
                  </label>
                  <p className="text-sm text-gray-900">{reason.evidence.recommendation}</p>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
