/**
 * Decision Compiler
 * 
 * Pipeline for decision validation:
 * 1. Schema Validation
 * 2. Layer Purity Check
 * 3. Policy Rule Check
 * 4. Autonomy Escalation Check
 * 5. Conflict Detection
 */

import type {
  Decision,
  ValidationResult,
  Layer,
} from '../types/governance.types.js';
import { PolicyEngine } from '../policy/policy-engine.js';
import { AutonomyGuard } from '../policy/autonomy-guard.js';
import { DecisionHistoryStore } from '../history/decision-history-store.js';
import crypto from 'node:crypto';

export class DecisionCompiler {
  private policyEngine: PolicyEngine;
  private autonomyGuard: AutonomyGuard;
  private historyStore: DecisionHistoryStore;

  constructor(
    policyEngine: PolicyEngine,
    autonomyGuard: AutonomyGuard,
    historyStore: DecisionHistoryStore
  ) {
    this.policyEngine = policyEngine;
    this.autonomyGuard = autonomyGuard;
    this.historyStore = historyStore;
  }

  /**
   * Compiles and validates a decision through the full pipeline.
   */
  async compile(decision: Partial<Decision>): Promise<ValidationResult> {
    const reasons: string[] = [];

    // 1. Schema Validation
    if (!decision.id || !decision.layer || !decision.rationale || !decision.owner) {
      reasons.push('Decision missing required fields: id, layer, rationale, owner');
      return {
        status: 'blocked',
        reasons,
        requiresReview: true,
      };
    }

    // 2. Layer Purity Check
    if (!this.isValidLayer(decision.layer)) {
      reasons.push(`Invalid layer: ${decision.layer}. Must be strategy, architecture, implementation, or governance`);
    }

    // 3. Policy Rule Check
    const policyCheck = this.policyEngine.checkDecision(decision as Decision);
    if (!policyCheck.allowed) {
      reasons.push(`Policy violation: ${policyCheck.reason}`);
    }

    // 4. Autonomy Escalation Check
    const autonomyCheck = this.autonomyGuard.checkEscalation(decision as Decision);
    if (autonomyCheck.requiresEscalation) {
      reasons.push(`Autonomy escalation required: ${autonomyCheck.reason}`);
      return {
        status: 'blocked',
        reasons,
        requiresReview: true,
      };
    }

    // 5. Conflict Detection
    const conflicts = await this.detectConflicts(decision as Decision);
    if (conflicts.length > 0) {
      return {
        status: 'conflict',
        reasons: conflicts,
        requiresReview: true,
      };
    }

    if (reasons.length > 0) {
      return {
        status: 'blocked',
        reasons,
        requiresReview: true,
      };
    }

    return {
      status: 'pass',
    };
  }

  /**
   * Validates layer value
   */
  private isValidLayer(layer: string): layer is Layer {
    return ['strategy', 'architecture', 'implementation', 'governance'].includes(layer);
  }

  /**
   * Detects conflicts with existing decisions.
   * 
   * Minimal conflict rule:
   * - Same layer
   * - Overlapping scope (prefix match OR shared path)
   * - Different decision key (or different decision string)
   * - Within time window (30 days default)
   */
  private async detectConflicts(decision: Decision): Promise<string[]> {
    const conflicts: string[] = [];

    // Derive decision key if not provided
    const decisionKey = decision.key || this.deriveDecisionKey(decision);

    // Get decisions from same layer
    const sameLayerDecisions = await this.historyStore.list({
      layer: decision.layer,
    });

    // Time window: 30 days
    const timeWindowMs = 30 * 24 * 60 * 60 * 1000;
    const decisionTime = new Date(decision.timestamp).getTime();

    for (const existingDecision of sameLayerDecisions) {
      const existingTime = new Date(existingDecision.timestamp || existingDecision.date || '').getTime();
      const timeDiff = decisionTime - existingTime;

      // Check if within time window
      if (timeDiff < 0 || timeDiff > timeWindowMs) {
        continue;
      }

      // Check scope overlap
      const hasScopeOverlap = this.hasScopeOverlap(decision, existingDecision);
      if (!hasScopeOverlap) {
        continue;
      }

      // Check if decision key differs
      const existingKey = existingDecision.key || this.deriveDecisionKey(existingDecision);
      if (decisionKey === existingKey) {
        continue; // Same decision, not a conflict
      }

      // Conflict detected
      conflicts.push(
        `Conflicts with decision ${existingDecision.id} (${existingDecision.timestamp}): ` +
        `Same layer (${decision.layer}), overlapping scope, but different decision key. ` +
        `Existing: ${existingKey}, New: ${decisionKey}`
      );
    }

    return conflicts;
  }

  /**
   * Derives a decision key from decision content.
   * Uses decision string if available, otherwise hashes rationale + implications.
   */
  private deriveDecisionKey(decision: Decision): string {
    if (decision.decision) {
      return crypto.createHash('sha256').update(decision.decision).digest('hex').substring(0, 16);
    }
    const content = `${decision.rationale}${decision.implications}`;
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Checks if two decisions have overlapping scope.
   */
  private hasScopeOverlap(decision1: Decision, decision2: Decision): boolean {
    // If both have explicit scope arrays, check for overlap
    if (decision1.scope && decision2.scope) {
      for (const scope1 of decision1.scope) {
        for (const scope2 of decision2.scope) {
          if (this.pathsOverlap(scope1, scope2)) {
            return true;
          }
        }
      }
      return false;
    }

    // Fallback: check if decision strings mention similar paths
    // This is a simplified heuristic
    const text1 = JSON.stringify(decision1).toLowerCase();
    const text2 = JSON.stringify(decision2).toLowerCase();

    // Extract potential paths (simplified)
    const pathPattern = /[\w\-/]+\.(ts|js|tsx|jsx|md|yaml|yml|json)/g;
    const paths1 = text1.match(pathPattern) || [];
    const paths2 = text2.match(pathPattern) || [];

    for (const path1 of paths1) {
      for (const path2 of paths2) {
        if (this.pathsOverlap(path1, path2)) {
          return true;
        }
      }
    }

    // If no explicit scope and no paths found, assume overlap (conservative)
    return true;
  }

  /**
   * Checks if two paths overlap (prefix match or shared path).
   */
  private pathsOverlap(path1: string, path2: string): boolean {
    // Normalize paths
    const normalized1 = path1.replace(/\\/g, '/').toLowerCase();
    const normalized2 = path2.replace(/\\/g, '/').toLowerCase();

    // Check if one is a prefix of the other
    if (normalized1.startsWith(normalized2) || normalized2.startsWith(normalized1)) {
      return true;
    }

    // Check if they share a common path segment
    const segments1 = normalized1.split('/');
    const segments2 = normalized2.split('/');

    for (const seg1 of segments1) {
      if (seg1 && segments2.includes(seg1)) {
        return true;
      }
    }

    return false;
  }
}

