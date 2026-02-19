/**
 * KPI Parser
 * 
 * Analyzes mathematical trends in marketing KPIs and translates them
 * into human-readable problem statements.
 */

import type { Clock } from "@agent-system/governance-v2/runtime/clock";

export interface KPIMetric {
  name: string;
  value: number;
  previousValue?: number;
  timestamp: string;
  unit?: string;
}

export interface KPITrend {
  metric: string;
  delta: number;
  deltaPercent: number;
  direction: "up" | "down" | "stable";
  severity: "low" | "medium" | "high" | "critical";
}

export interface SemanticTranslation {
  problem: string;
  context: string;
  urgency: "low" | "medium" | "high";
  suggestedFocus: string[];
}

export class KPIParser {
  private readonly clock: Clock;

  constructor(clock: Clock) {
    this.clock = clock;
  }

  /**
   * Calculate trends from current and previous metric values.
   */
  calculateTrends(metrics: KPIMetric[]): KPITrend[] {
    const trends: KPITrend[] = [];

    for (const metric of metrics) {
      if (metric.previousValue === undefined) {
        continue;
      }

      const delta = metric.value - metric.previousValue;
      const deltaPercent = metric.previousValue !== 0
        ? (delta / metric.previousValue) * 100
        : 0;

      const direction = Math.abs(deltaPercent) < 1
        ? "stable"
        : deltaPercent > 0
        ? "up"
        : "down";

      const severity = this.determineSeverity(Math.abs(deltaPercent), metric.name);

      trends.push({
        metric: metric.name,
        delta,
        deltaPercent,
        direction,
        severity,
      });
    }

    return trends;
  }

  /**
   * Translate KPI trends into human-readable problem statements.
   */
  translateToSemantics(metrics: KPIMetric[]): SemanticTranslation {
    const trends = this.calculateTrends(metrics);
    const criticalTrends = trends.filter((t) => t.severity === "critical" || t.severity === "high");
    const negativeTrends = trends.filter((t) => t.direction === "down");

    if (criticalTrends.length === 0 && negativeTrends.length === 0) {
      return {
        problem: "KPIs zeigen stabile oder positive Entwicklung",
        context: "Alle Metriken sind im erwarteten Bereich",
        urgency: "low",
        suggestedFocus: ["Weiterführung der aktuellen Strategie", "Optimierung bestehender Kanäle"],
      };
    }

    const problems: string[] = [];
    const focusAreas: string[] = [];

    // Analyze specific metric types
    for (const trend of criticalTrends) {
      const translation = this.translateMetricToProblem(trend);
      problems.push(translation.problem);
      focusAreas.push(...translation.focus);
    }

    // General patterns
    const conversionRateTrend = trends.find((t) => t.metric.toLowerCase().includes("conversion"));
    if (conversionRateTrend && conversionRateTrend.direction === "down" && conversionRateTrend.severity !== "low") {
      problems.push("Vertrauensverlust im Checkout-Prozess");
      focusAreas.push("Checkout-Optimierung", "Trust-Signale", "Payment-Optionen");
    }

    const cpcTrend = trends.find((t) => t.metric.toLowerCase().includes("cpc") || t.metric.toLowerCase().includes("cost"));
    if (cpcTrend && cpcTrend.direction === "up" && cpcTrend.severity !== "low") {
      problems.push("Steigende Werbekosten ohne entsprechende Skalierung");
      focusAreas.push("Bid-Optimierung", "Keyword-Refinement", "Audience-Targeting");
    }

    const ctrTrend = trends.find((t) => t.metric.toLowerCase().includes("ctr"));
    if (ctrTrend && ctrTrend.direction === "down" && ctrTrend.severity !== "low") {
      problems.push("Nachlassende Relevanz der Werbeanzeigen");
      focusAreas.push("Ad-Copy-Optimierung", "Creative-Testing", "Landing-Page-Alignment");
    }

    const urgency = criticalTrends.length > 0 ? "high" : negativeTrends.length > 2 ? "medium" : "low";

    return {
      problem: problems.length > 0 ? problems.join(". ") : "Leichte Abweichungen in den KPIs",
      context: `Analysiert wurden ${trends.length} Metriken. ${criticalTrends.length} kritische Trends identifiziert.`,
      urgency,
      suggestedFocus: [...new Set(focusAreas)], // Remove duplicates
    };
  }

  /**
   * Translate a specific metric trend to a problem statement.
   */
  private translateMetricToProblem(trend: KPITrend): { problem: string; focus: string[] } {
    const metricLower = trend.metric.toLowerCase();
    const absPercent = Math.abs(trend.deltaPercent);

    if (metricLower.includes("conversion") || metricLower.includes("conv")) {
      if (trend.direction === "down") {
        return {
          problem: `Conversion-Rate um ${absPercent.toFixed(1)}% gesunken`,
          focus: ["Checkout-Analyse", "User-Journey-Optimierung", "A/B-Testing"],
        };
      }
    }

    if (metricLower.includes("cpc") || metricLower.includes("cost per click")) {
      if (trend.direction === "up") {
        return {
          problem: `CPC um ${absPercent.toFixed(1)}% gestiegen`,
          focus: ["Bid-Management", "Keyword-Optimierung", "Quality Score"],
        };
      }
    }

    if (metricLower.includes("ctr") || metricLower.includes("click through")) {
      if (trend.direction === "down") {
        return {
          problem: `CTR um ${absPercent.toFixed(1)}% gesunken`,
          focus: ["Ad-Copy", "Creative-Optimierung", "Audience-Targeting"],
        };
      }
    }

    if (metricLower.includes("roas") || metricLower.includes("roi")) {
      if (trend.direction === "down") {
        return {
          problem: `ROAS um ${absPercent.toFixed(1)}% gesunken`,
          focus: ["Budget-Optimierung", "Campaign-Struktur", "Attribution-Analyse"],
        };
      }
    }

    // Generic fallback
    return {
      problem: `${trend.metric} zeigt ${trend.direction === "down" ? "negative" : "positive"} Entwicklung (${absPercent.toFixed(1)}%)`,
      focus: ["Metrik-Analyse", "Root-Cause-Analysis"],
    };
  }

  /**
   * Determine severity based on delta percentage and metric type.
   */
  private determineSeverity(deltaPercent: number, metricName: string): "low" | "medium" | "high" | "critical" {
    const metricLower = metricName.toLowerCase();

    // Conversion and revenue metrics are more critical
    const isCriticalMetric = metricLower.includes("conversion") ||
      metricLower.includes("revenue") ||
      metricLower.includes("roas") ||
      metricLower.includes("roi");

    if (isCriticalMetric) {
      if (deltaPercent >= 20) return "critical";
      if (deltaPercent >= 10) return "high";
      if (deltaPercent >= 5) return "medium";
      return "low";
    }

    // Other metrics
    if (deltaPercent >= 30) return "critical";
    if (deltaPercent >= 15) return "high";
    if (deltaPercent >= 5) return "medium";
    return "low";
  }
}


