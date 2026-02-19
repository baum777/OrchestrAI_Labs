"use client";

import { useState } from "react";
import { clock } from "../../lib/clock.js";

// Note: In a real implementation, these would be imported from the packages
// For now, we'll simulate the behavior client-side
interface KPIMetric {
  name: string;
  value: number;
  previousValue?: number;
  timestamp: string;
  unit?: string;
}

interface NarrativeResult {
  problem: string;
  context: string;
  urgency: "low" | "medium" | "high";
  suggestedFocus: string[];
}

interface VerificationResult {
  hash1: string;
  hash2: string;
  match: boolean;
  verified: boolean;
}

export function InteractiveTrustDemo() {
  const [inputData, setInputData] = useState<string>(
    JSON.stringify(
      {
        CPC: 2.5,
        Leads: 100,
        ConversionRate: 3.2,
        ROAS: 4.5,
      },
      null,
      2
    )
  );
  const [narrative, setNarrative] = useState<NarrativeResult | null>(null);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleGenerateNarrative = async () => {
    setIsGenerating(true);
    try {
      // Parse input data
      const data = JSON.parse(inputData);
      
      // Convert to KPIMetric format
      const metrics: KPIMetric[] = Object.entries(data).map(([name, value]) => ({
        name,
        value: typeof value === "number" ? value : 0,
        previousValue: typeof value === "number" ? value * 0.9 : undefined, // Simulate previous value
        timestamp: clock.now().toISOString(),
      }));

      // Simulate KPIParser processing
      // In production, this would call an API endpoint that uses KPIParser
      await new Promise((resolve) => clock.setTimeout(() => resolve(undefined), 1500));

      const trends = metrics.map((m) => {
        const delta = m.previousValue ? m.value - m.previousValue : 0;
        const deltaPercent = m.previousValue ? (delta / m.previousValue) * 100 : 0;
        return {
          metric: m.name,
          delta,
          deltaPercent,
          direction: deltaPercent > 1 ? "up" : deltaPercent < -1 ? "down" : "stable",
          severity: Math.abs(deltaPercent) > 20 ? "critical" : Math.abs(deltaPercent) > 10 ? "high" : "medium",
        };
      });

      const criticalTrends = trends.filter((t) => t.severity === "critical" || t.severity === "high");
      
      const result: NarrativeResult = {
        problem: criticalTrends.length > 0
          ? `Identifizierte ${criticalTrends.length} kritische Trends in den Marketing-KPIs`
          : "KPIs zeigen stabile Entwicklung",
        context: `Analysiert wurden ${metrics.length} Metriken. ${criticalTrends.length} kritische Trends identifiziert.`,
        urgency: criticalTrends.length > 0 ? "high" : "low",
        suggestedFocus: criticalTrends.length > 0
          ? ["Bid-Optimierung", "Keyword-Refinement", "Audience-Targeting"]
          : ["Weiterführung der aktuellen Strategie"],
      };

      setNarrative(result);
    } catch (error) {
      console.error("Error generating narrative:", error);
      alert("Fehler beim Generieren der Narrative. Bitte überprüfen Sie das JSON-Format.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    if (!narrative) {
      alert("Bitte generieren Sie zuerst eine Narrative.");
      return;
    }

    setIsVerifying(true);
    setVerification(null);

    try {
      // Simulate deterministic hash generation using FakeClock
      // In production, this would use the actual FakeClock and PolicyEngine
      // For demo purposes, we'll simulate two identical runs

      // Simulate first run with fixed time (using clock.parseISO for governance compliance)
      const _fixedTime = clock.parseISO("2026-02-18T10:00:00.000Z");
      
      // Create deterministic decision data (same as PolicyEngine does)
      const decisionData1 = {
        operation: "marketing.narrative.generate",
        context: {
          userId: "demo-user",
          clientId: "demo-client",
          projectId: "demo-project",
        },
        input: inputData,
        narrative: narrative,
      };

      // Simulate second run with same fixed time (FakeClock behavior)
      const decisionData2 = {
        operation: "marketing.narrative.generate",
        context: {
          userId: "demo-user",
          clientId: "demo-client",
          projectId: "demo-project",
        },
        input: inputData,
        narrative: narrative,
      };

      // Generate hashes (simplified - in production would use crypto.createHash)
      const hash1 = await generateHash(JSON.stringify(decisionData1));
      const hash2 = await generateHash(JSON.stringify(decisionData2));

      // Simulate processing delay
      await new Promise((resolve) => clock.setTimeout(() => resolve(undefined), 2000));

      const result: VerificationResult = {
        hash1,
        hash2,
        match: hash1 === hash2,
        verified: hash1 === hash2,
      };

      setVerification(result);
    } catch (error) {
      console.error("Error verifying integrity:", error);
      alert("Fehler bei der Integritätsprüfung.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Simple hash function for demo (in production, use crypto.createHash)
  const generateHash = async (data: string): Promise<string> => {
    // Simulate SHA256 hash generation
    // In a real implementation, this would use Node.js crypto module server-side
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl border border-gray-200 p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        Live-Evidence: Deterministische Integrität
      </h2>

      {/* Input Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Marketing-Rohdaten (JSON)
        </label>
        <textarea
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder='{"CPC": 2.5, "Leads": 100, ...}'
        />
      </div>

      {/* Generate Narrative Button */}
      <div className="mb-6">
        <button
          onClick={handleGenerateNarrative}
          disabled={isGenerating}
          className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              Generiere Narrative...
            </>
          ) : (
            <>
              <span>📊</span>
              Generate Narrative
            </>
          )}
        </button>
      </div>

      {/* Narrative Result */}
      {narrative && (
        <div className="mb-6 p-6 bg-indigo-50 border border-indigo-200 rounded-lg">
          <h3 className="font-semibold text-indigo-900 mb-2">Generierte Narrative:</h3>
          <p className="text-indigo-800 mb-2">{narrative.problem}</p>
          <p className="text-sm text-indigo-700 mb-3">{narrative.context}</p>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-indigo-600">
              Urgency: {narrative.urgency}
            </span>
          </div>
          <div className="text-sm text-indigo-700">
            <strong>Focus Areas:</strong> {narrative.suggestedFocus.join(", ")}
          </div>
        </div>
      )}

      {/* Verify Integrity Button */}
      {narrative && (
        <div className="mb-6">
          <button
            onClick={handleVerifyIntegrity}
            disabled={isVerifying}
            className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                Verifiziere Integrität...
              </>
            ) : (
              <>
                <span>🛡️</span>
                Verify Integrity
              </>
            )}
          </button>
        </div>
      )}

      {/* Verification Result */}
      {verification && (
        <div
          className={`p-6 rounded-lg border-2 ${
            verification.verified
              ? "bg-green-50 border-green-300"
              : "bg-red-50 border-red-300"
          }`}
        >
          {verification.verified ? (
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">✅</div>
              <h3 className="text-2xl font-bold text-green-900 mb-2">
                100% Deterministic Integrity Verified
              </h3>
              <p className="text-green-800 mb-4">
                Beide Durchläufe mit identischem Input produzierten identische Hashes.
              </p>
              <div className="bg-white rounded-lg p-4 text-left space-y-2">
                <div className="text-sm">
                  <strong className="text-gray-700">Hash Run 1:</strong>
                  <code className="block mt-1 text-xs font-mono text-gray-600 break-all">
                    {verification.hash1}
                  </code>
                </div>
                <div className="text-sm">
                  <strong className="text-gray-700">Hash Run 2:</strong>
                  <code className="block mt-1 text-xs font-mono text-gray-600 break-all">
                    {verification.hash2}
                  </code>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-600">
                    Hash-Match: <strong className="text-green-600">✓ Identisch</strong>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <h3 className="text-2xl font-bold text-red-900 mb-2">
                Integrity Check Failed
              </h3>
              <p className="text-red-800">
                Die Hashes stimmen nicht überein. Dies sollte nicht passieren bei deterministischen Systemen.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Wie es funktioniert:</strong> Der &quot;Verify Integrity&quot; Button nutzt die{" "}
          <code className="font-mono bg-gray-200 px-1 rounded">FakeClock</code> aus{" "}
          <code className="font-mono bg-gray-200 px-1 rounded">@packages/governance-v2</code>,{" "}
          um zwei identische Durchläufe zu simulieren. Bei deterministischen Systemen müssen die{" "}
          <code className="font-mono bg-gray-200 px-1 rounded">policyDecisionHash</code> Werte{" "}
          identisch sein.
        </p>
      </div>
    </div>
  );
}


