"use client";

import { AdvisorCard } from "../governance/AdvisorCard";
import type { PolicyViolationAdvice } from "@shared/types/governance";

export function GovernanceShieldSection() {
  // Example PII leak scenario
  const piiLeakAdvice: PolicyViolationAdvice = {
    code: "PII_LEAK_DETECTED",
    advisorTitle: "PII-Leak Blockiert",
    humanExplanation:
      "Der Agent versuchte, Kundendaten (E-Mail-Adressen, Telefonnummern) ohne entsprechende Berechtigung zu exportieren. Die Governance-Engine hat diese Aktion proaktiv blockiert.",
    remedyStep:
      "Stellen Sie sicher, dass der Agent über die notwendigen Berechtigungen verfügt oder verwenden Sie die Redaction-Funktion für PII-Felder.",
    safetyLevel: "critical",
  };

  return (
    <div className="grid md:grid-cols-2 gap-12 items-center">
      <div>
        <div className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-semibold mb-4">
          Governance-Shield
        </div>
        <h3 className="text-3xl font-bold text-gray-900 mb-4">
          Proaktiver Schutz vor PII-Leaks
        </h3>
        <p className="text-lg text-gray-600 mb-6">
          Unsere Governance-Engine blockiert automatisch den Zugriff auf sensible Daten, bevor
          sie verarbeitet werden können. Keine manuelle Überprüfung erforderlich.
        </p>
        <ul className="space-y-3 text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Automatische Erkennung von PII-Feldern (E-Mail, Telefon, Adresse)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Policy-basierte Blockierung vor Datenzugriff</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Menschliche Erklärungen für jede Blockierung</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Audit-Log für Compliance-Nachweis</span>
          </li>
        </ul>
      </div>
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          Live-Beispiel: PII-Leak Blockierung
        </h4>
        <AdvisorCard advice={piiLeakAdvice} />
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>Was passiert:</strong> Ein Agent versucht, Kundendaten zu exportieren.
            Die Governance-Engine erkennt PII-Felder und blockiert die Aktion automatisch.
            Der AdvisorCard zeigt dem Benutzer eine klare Erklärung und nächste Schritte.
          </p>
        </div>
      </div>
    </div>
  );
}

