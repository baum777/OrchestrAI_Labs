"use client";

import { useEffect, useState } from "react";
import { clock } from "../../../lib/clock";

interface AgentStatus {
  id: string;
  name: string;
  status: "active" | "idle" | "error";
  lastActivity: string;
  projectId?: string;
}

export default function FleetMonitorPage() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with actual API endpoint
    // fetchApi("/monitoring/agents")
    clock.setTimeout(() => {
      setAgents([
        {
          id: "agent-1",
          name: "Knowledge Agent",
          status: "active",
          lastActivity: "2026-02-18T10:30:00.000Z",
          projectId: "project-1",
        },
        {
          id: "agent-2",
          name: "Project Agent",
          status: "idle",
          lastActivity: "2026-02-18T09:15:00.000Z",
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
    });
  };

  const statusColors = {
    active: "bg-green-100 text-green-800",
    idle: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Fleet Monitor</h1>
        <p className="text-gray-600 mt-1">Übersicht aller aktiven Agenten</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Lade Agent-Status...</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-xl">🤖</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                    <p className="text-sm text-gray-500">ID: {agent.id}</p>
                    {agent.projectId && (
                      <p className="text-xs text-gray-400 mt-1">Project: {agent.projectId}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColors[agent.status]}`}
                  >
                    {agent.status === "active" ? "Aktiv" : agent.status === "idle" ? "Inaktiv" : "Fehler"}
                  </span>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Letzte Aktivität</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatTimestamp(agent.lastActivity)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {agents.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Keine Agenten aktiv</p>
        </div>
      )}
    </div>
  );
}

