/**
 * Marketer Agent
 * 
 * Analytic-Creative Hybrid Agent that translates KPIs into marketing narratives.
 * Uses data-driven copywriting with story frameworks (PAS, AIDA).
 */

import type { KPIParser, SemanticTranslation } from "../utils/kpi-parser.js";
import type { Clock } from "@agent-system/governance-v2/runtime/clock";

export interface MarketerAgentInput {
  kpiMetrics: Array<{
    name: string;
    value: number;
    previousValue?: number;
    timestamp: string;
    unit?: string;
  }>;
  targetAudience?: string;
  campaignGoal?: string;
  framework?: "PAS" | "AIDA" | "auto";
}

export interface MarketerAgentOutput {
  narrative: string;
  framework: string;
  keyInsights: string[];
  callToAction: string;
  semanticTranslation: SemanticTranslation;
}

export class MarketerAgent {
  private readonly kpiParser: KPIParser;
  private readonly clock: Clock;

  constructor(kpiParser: KPIParser, clock: Clock) {
    this.kpiParser = kpiParser;
    this.clock = clock;
  }

  /**
   * Generate marketing narrative from KPIs.
   */
  async generateNarrative(input: MarketerAgentInput): Promise<MarketerAgentOutput> {
    // Step 1: Parse KPIs to semantics
    const semanticTranslation = this.kpiParser.translateToSemantics(input.kpiMetrics);

    // Step 2: Determine framework
    const framework = input.framework === "auto"
      ? this.selectFramework(semanticTranslation)
      : input.framework ?? "PAS";

    // Step 3: Generate narrative using framework
    const narrative = this.buildNarrative(semanticTranslation, framework, input);

    // Step 4: Extract key insights
    const keyInsights = this.extractInsights(semanticTranslation, input.kpiMetrics);

    // Step 5: Generate CTA
    const callToAction = this.generateCTA(semanticTranslation, framework);

    return {
      narrative,
      framework,
      keyInsights,
      callToAction,
      semanticTranslation,
    };
  }

  /**
   * Select appropriate framework based on semantic translation.
   */
  private selectFramework(semantic: SemanticTranslation): "PAS" | "AIDA" {
    // Use PAS for problem-focused narratives, AIDA for awareness-building
    if (semantic.urgency === "high" || semantic.problem.includes("Verlust") || semantic.problem.includes("gesunken")) {
      return "PAS";
    }
    return "AIDA";
  }

  /**
   * Build narrative using selected framework.
   */
  private buildNarrative(
    semantic: SemanticTranslation,
    framework: "PAS" | "AIDA",
    input: MarketerAgentInput
  ): string {
    const audience = input.targetAudience ?? "Ihre Zielgruppe";
    const goal = input.campaignGoal ?? "Marketing-Performance verbessern";

    if (framework === "PAS") {
      return this.buildPASNarrative(semantic, audience, goal);
    } else {
      return this.buildAIDANarrative(semantic, audience, goal);
    }
  }

  /**
   * Build Problem-Agitation-Solution narrative.
   */
  private buildPASNarrative(semantic: SemanticTranslation, audience: string, goal: string): string {
    const problem = semantic.problem;
    const agitation = this.agitateProblem(problem, semantic.urgency);
    const solution = semantic.suggestedFocus.join(", ");

    return `PROBLEM: ${problem}

${agitation}

LÖSUNG: Durch ${solution} können Sie ${goal} erreichen. Die Daten zeigen klar, dass ${semantic.context.toLowerCase()}.`;
  }

  /**
   * Build AIDA narrative.
   */
  private buildAIDANarrative(semantic: SemanticTranslation, audience: string, goal: string): string {
    const attention = `Ihre Marketing-Daten zeigen: ${semantic.problem}`;
    const interest = `Was bedeutet das für ${audience}? ${semantic.context}`;
    const desire = `Durch ${semantic.suggestedFocus.slice(0, 2).join(" und ")} können Sie diese Herausforderung in eine Chance verwandeln.`;
    const action = semantic.suggestedFocus[0] ?? "Optimierung";

    return `ATTENTION: ${attention}

INTEREST: ${interest}

DESIRE: ${desire}

ACTION: Fokussieren Sie sich auf ${action} für sofortige Verbesserungen.`;
  }

  /**
   * Agitate the problem to create urgency.
   */
  private agitateProblem(problem: string, urgency: "low" | "medium" | "high"): string {
    const urgencyPhrases = {
      high: "Dieses Problem verschärft sich kontinuierlich und erfordert sofortiges Handeln.",
      medium: "Ohne Intervention könnte sich dieser Trend weiter verschlechtern.",
      low: "Frühzeitige Optimierung kann größere Probleme verhindern.",
    };

    return `AGITATION: ${urgencyPhrases[urgency]} ${problem} beeinflusst direkt Ihre Marketing-Performance und damit Ihre Geschäftsergebnisse.`;
  }

  /**
   * Extract key insights from semantic translation and metrics.
   */
  private extractInsights(
    semantic: SemanticTranslation,
    metrics: MarketerAgentInput["kpiMetrics"]
  ): string[] {
    const insights: string[] = [];

    insights.push(`Hauptproblem: ${semantic.problem}`);
    insights.push(`Dringlichkeit: ${semantic.urgency === "high" ? "Hoch" : semantic.urgency === "medium" ? "Mittel" : "Niedrig"}`);

    if (semantic.suggestedFocus.length > 0) {
      insights.push(`Fokusbereiche: ${semantic.suggestedFocus.slice(0, 3).join(", ")}`);
    }

    const criticalMetrics = metrics.filter((m) => {
      if (m.previousValue === undefined) return false;
      const deltaPercent = Math.abs(((m.value - m.previousValue) / m.previousValue) * 100);
      return deltaPercent >= 10;
    });

    if (criticalMetrics.length > 0) {
      insights.push(`${criticalMetrics.length} Metriken zeigen signifikante Veränderungen`);
    }

    return insights;
  }

  /**
   * Generate call-to-action based on semantic translation.
   */
  private generateCTA(semantic: SemanticTranslation, framework: "PAS" | "AIDA"): string {
    const primaryFocus = semantic.suggestedFocus[0] ?? "Optimierung";

    if (semantic.urgency === "high") {
      return `Sofortige Maßnahme erforderlich: Starten Sie mit ${primaryFocus} und überwachen Sie die Ergebnisse wöchentlich.`;
    }

    if (framework === "PAS") {
      return `Lösen Sie das Problem durch ${primaryFocus}. Implementieren Sie die vorgeschlagenen Maßnahmen und messen Sie den Fortschritt.`;
    }

    return `Beginnen Sie mit ${primaryFocus} für nachhaltige Verbesserungen Ihrer Marketing-Performance.`;
  }
}


