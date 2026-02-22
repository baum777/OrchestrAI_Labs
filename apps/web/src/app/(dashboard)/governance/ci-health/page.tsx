"use client";

import { useState, useEffect } from "react";
import { clock } from "../../../../lib/clock";
import { loadGovernanceStatus, retryLoadGovernanceStatus } from "../_lib/governance-status.adapter";
import { CiMatrix } from "../_components/CiMatrix";

export default function CiHealthPage() {
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
        <span className="ml-3 text-gray-600">Lade CI Health...</span>
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
              <h2 className="text-lg font-semibold text-gray-900">CI Health Status unbekannt</h2>
              <p className="text-gray-600 mt-1">
                Die CI-Health-Daten konnten nicht geladen oder validiert werden.
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
      </div>
    );
  }

  const { data } = result;

  return (
    <div className="space-y-6">
      <CiMatrix ciHealth={data.ciHealth} runs={data.runs} maxRuns={5} />
    </div>
  );
}
