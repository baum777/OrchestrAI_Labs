"use client";

import { useEffect, useState } from "react";
import { fetchApi, PolicyError } from "../../../lib/api-client";
import { AdvisorCard } from "../../../components/governance/AdvisorCard";
import type { DecisionDraft } from "@shared/types/decision";

export default function ApprovalInboxPage() {
  const [decisions, setDecisions] = useState<DecisionDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PolicyError | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>("");

  useEffect(() => {
    // In production, this would come from auth context or project selector
    const projectId = selectedProject || "default-project";
    
    fetchApi(`/projects/${projectId}/decisions`)
      .then((res) => res.json())
      .then((data: Array<DecisionDraft | { status: "final" }>) => {
        // Filter only drafts
        const drafts = data.filter((d) => d.status === "draft") as DecisionDraft[];
        setDecisions(drafts);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof PolicyError) {
          setError(err);
        } else {
          setError(null);
          console.error("Failed to load decisions:", err);
        }
        setLoading(false);
      });
  }, [selectedProject]);

  const handleApprove = async (decisionId: string) => {
    // TODO: Implement approve action
    console.log("Approve decision:", decisionId);
  };

  const handleReject = async (decisionId: string) => {
    // TODO: Implement reject action
    console.log("Reject decision:", decisionId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Approval Inbox</h1>
          <p className="text-gray-600 mt-1">Entscheidungsentwürfe zur Überprüfung</p>
        </div>
      </div>

      {error && error.advice && (
        <AdvisorCard advice={error.advice} />
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Lade Entscheidungen...</p>
        </div>
      ) : decisions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Keine ausstehenden Entscheidungen</p>
        </div>
      ) : (
        <div className="space-y-4">
          {decisions.map((decision) => (
            <div
              key={decision.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{decision.title}</h3>
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">Owner:</span> {decision.owner}
                    {decision.ownerRole && (
                      <span className="ml-4">
                        <span className="font-medium">Rolle:</span> {decision.ownerRole}
                      </span>
                    )}
                  </div>
                  {decision.goal && (
                    <p className="mt-2 text-sm text-gray-700">{decision.goal}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Draft
                    </span>
                    {decision.clientId && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        Client: {decision.clientId}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleApprove(decision.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Genehmigen
                  </button>
                  <button
                    onClick={() => handleReject(decision.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Ablehnen
                  </button>
                </div>
              </div>
              {decision.reviewId && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Review ID: <code className="font-mono">{decision.reviewId}</code>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


