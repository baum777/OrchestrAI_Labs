/**
 * Workstream Validator
 * 
 * Validates workstreams against governance rules before execution.
 * Blocks start on violation.
 */

import type {
  Workstream,
  ValidationResult,
  AutonomyTier,
  Layer,
} from '../types/governance.types.js';

export class WorkstreamValidator {
  /**
   * Validates a workstream against all governance rules.
   * Returns blocked status if any critical violation is found.
   */
  validate(workstream: Partial<Workstream>): ValidationResult {
    const reasons: string[] = [];

    // Owner validation
    if (!workstream.owner || workstream.owner.trim() === '') {
      reasons.push('Owner must be set');
    }

    // Scope validation
    if (!workstream.scope || workstream.scope.length === 0) {
      reasons.push('Scope must not be empty');
    }

    // Structural Model validation
    if (!workstream.structuralModel || workstream.structuralModel.trim() === '') {
      reasons.push('Structural Model must be present');
    }

    // Risks validation
    if (!workstream.risks || workstream.risks.length === 0) {
      reasons.push('Risks must be structured (can be empty array if no risks)');
    } else {
      // Validate risk structure
      for (const risk of workstream.risks) {
        if (!risk.id || !risk.description || !risk.impact || !risk.mitigation) {
          reasons.push('Risk structure incomplete: id, description, impact, mitigation required');
          break;
        }
      }
    }

    // Layer validation
    if (!workstream.layer || !this.isValidLayer(workstream.layer)) {
      reasons.push(`Layer must be one of: strategy, architecture, implementation, governance`);
    }

    // Autonomy Tier validation
    if (workstream.autonomyTier !== undefined && !this.isValidAutonomyTier(workstream.autonomyTier)) {
      reasons.push('Autonomy Tier must be 1, 2, 3, or 4');
    }

    // DoD validation
    if (!workstream.definitionOfDone || workstream.definitionOfDone.trim() === '') {
      reasons.push('Definition of Done must be present');
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
   * Validates autonomy tier value
   */
  private isValidAutonomyTier(tier: number): tier is AutonomyTier {
    return [1, 2, 3, 4].includes(tier);
  }
}

