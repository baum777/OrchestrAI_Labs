/**
 * Governance Scorecard Engine
 * 
 * Calculates governance metrics:
 * - Layer Purity
 * - Workstream Completeness
 * - Escalation Discipline
 * - Decision Traceability
 * - DoD Enforcement
 * - Clarification Compliance
 */

import type {
  GovernanceScorecard,
  Workstream,
  Decision,
} from '../types/governance.types.js';
import { WorkstreamValidator } from '../validator/workstream-validator.js';

export class ScorecardEngine {
  private validator: WorkstreamValidator;

  constructor() {
    this.validator = new WorkstreamValidator();
  }

  /**
   * Calculates governance scorecard for a set of workstreams and decisions.
   */
  calculateScorecard(
    workstreams: Workstream[],
    decisions: Decision[]
  ): GovernanceScorecard {
    const layerPurity = this.calculateLayerPurity(workstreams, decisions);
    const workstreamCompleteness = this.calculateWorkstreamCompleteness(workstreams);
    const escalationDiscipline = this.calculateEscalationDiscipline(workstreams, decisions);
    const decisionTraceability = this.calculateDecisionTraceability(decisions);
    const dodEnforcement = this.calculateDoDEnforcement(workstreams);
    const clarificationCompliance = this.calculateClarificationCompliance(workstreams);

    const totalScore = layerPurity + workstreamCompleteness + escalationDiscipline +
      decisionTraceability + dodEnforcement + clarificationCompliance;

    return {
      layerPurity,
      workstreamCompleteness,
      escalationDiscipline,
      decisionTraceability,
      dodEnforcement,
      clarificationCompliance,
      totalScore: (totalScore / 12) * 10, // Normalize to 0-10
    };
  }

  /**
   * Calculates layer purity score (0-2).
   * Checks if workstreams/decisions stay within their assigned layer.
   */
  private calculateLayerPurity(workstreams: Workstream[], decisions: Decision[]): number {
    if (workstreams.length === 0 && decisions.length === 0) {
      return 2; // Perfect if nothing to check
    }

    let violations = 0;
    const total = workstreams.length + decisions.length;

    // Check workstreams for layer violations
    for (const ws of workstreams) {
      // Implementation details in strategy layer = violation
      if (ws.layer === 'strategy' && this.containsImplementationDetails(ws)) {
        violations++;
      }
      // Architecture decisions in implementation layer = violation
      if (ws.layer === 'implementation' && this.containsArchitectureDetails(ws)) {
        violations++;
      }
    }

    // Check decisions for layer violations
    for (const decision of decisions) {
      if (decision.layer === 'strategy' && this.containsImplementationDetails(decision)) {
        violations++;
      }
    }

    const purity = 1 - (violations / total);
    return Math.max(0, purity * 2);
  }

  /**
   * Calculates workstream completeness score (0-2).
   */
  private calculateWorkstreamCompleteness(workstreams: Workstream[]): number {
    if (workstreams.length === 0) {
      return 2; // Perfect if nothing to check
    }

    let complete = 0;
    for (const ws of workstreams) {
      const validation = this.validator.validate(ws);
      if (validation.status === 'pass') {
        complete++;
      }
    }

    return (complete / workstreams.length) * 2;
  }

  /**
   * Calculates escalation discipline score (0-2).
   */
  private calculateEscalationDiscipline(workstreams: Workstream[], decisions: Decision[]): number {
    // Placeholder: check if escalations are properly logged and tracked
    // In production, check against escalation logs
    return 2; // Assume perfect for now
  }

  /**
   * Calculates decision traceability score (0-2).
   */
  private calculateDecisionTraceability(decisions: Decision[]): number {
    if (decisions.length === 0) {
      return 2;
    }

    let traceable = 0;
    for (const decision of decisions) {
      if (decision.id && decision.owner && decision.timestamp && decision.rationale) {
        traceable++;
      }
    }

    return (traceable / decisions.length) * 2;
  }

  /**
   * Calculates DoD enforcement score (0-2).
   */
  private calculateDoDEnforcement(workstreams: Workstream[]): number {
    if (workstreams.length === 0) {
      return 2;
    }

    let withDoD = 0;
    for (const ws of workstreams) {
      if (ws.definitionOfDone && ws.definitionOfDone.trim() !== '') {
        withDoD++;
      }
    }

    return (withDoD / workstreams.length) * 2;
  }

  /**
   * Calculates clarification compliance score (0-2).
   */
  private calculateClarificationCompliance(workstreams: Workstream[]): number {
    // Placeholder: check if clarification requests were properly handled
    // In production, check against clarification logs
    return 2; // Assume perfect for now
  }

  /**
   * Checks if workstream/decision contains implementation details.
   */
  private containsImplementationDetails(item: Workstream | Decision): boolean {
    const text = JSON.stringify(item).toLowerCase();
    const implementationKeywords = ['function', 'class', 'interface', 'import', 'export', 'api', 'endpoint'];
    return implementationKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Checks if workstream contains architecture details.
   */
  private containsArchitectureDetails(ws: Workstream): boolean {
    const text = JSON.stringify(ws).toLowerCase();
    const architectureKeywords = ['architecture', 'design pattern', 'system design', 'component diagram'];
    return architectureKeywords.some(keyword => text.includes(keyword));
  }
}

