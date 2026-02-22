"use client";

import { useState, useMemo } from "react";
import type { Reason } from "../_lib/governance-status.schema";
import { formatCount } from "../_lib/format";
import { StatusChip } from "./StatusChip";

interface ReasonTableProps {
  reasons: Reason[];
  onSelect?: (reason: Reason) => void;
}

export function ReasonTable({ reasons, onSelect }: ReasonTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const filteredReasons = useMemo(() => {
    return reasons.filter((reason) => {
      const matchesSearch =
        searchTerm === "" ||
        reason.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reason.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSeverity = severityFilter === "all" || reason.severity === severityFilter;

      return matchesSearch && matchesSeverity;
    });
  }, [reasons, searchTerm, severityFilter]);

  const groupedByCode = useMemo(() => {
    const groups: Record<string, Reason[]> = {};
    filteredReasons.forEach((reason) => {
      if (!groups[reason.code]) {
        groups[reason.code] = [];
      }
      groups[reason.code].push(reason);
    });
    return groups;
  }, [filteredReasons]);

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Suche
            </label>
            <input
              type="text"
              id="search"
              placeholder="Reason Code oder Beschreibung..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-1">
              Schweregrad
            </label>
            <select
              id="severity"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">Alle</option>
              <option value="error">Fehler</option>
              <option value="warning">Warnung</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          {formatCount(filteredReasons.length, "Eintrag", "Einträge")} gefunden
        </div>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {Object.entries(groupedByCode).map(([code, groupReasons]) => {
          const firstReason = groupReasons[0];
          const totalCount = groupReasons.reduce((sum, r) => sum + r.count, 0);

          return (
            <div
              key={code}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => onSelect?.(firstReason)}
                className="w-full text-left hover:bg-gray-50 transition-colors"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900 font-mono">{code}</h3>
                        <StatusChip status={firstReason.severity} size="sm" />
                      </div>
                      <p className="text-gray-600 mt-1">{firstReason.description}</p>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                        <span>Betroffene Validatoren:</span>
                        <span className="font-medium text-gray-700">
                          {firstReason.affectedValidators.join(", ")}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
                      <div className="text-sm text-gray-500">
                        {totalCount === 1 ? "Vorkommen" : "Vorkommen"}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          );
        })}

        {filteredReasons.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Keine Reason Codes gefunden</p>
          </div>
        )}
      </div>
    </div>
  );
}
