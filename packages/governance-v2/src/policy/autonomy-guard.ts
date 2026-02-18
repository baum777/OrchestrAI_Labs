/**
 * Autonomy Guard
 * 
 * Enforces autonomy policy and checks for escalation requirements.
 */

import type {
  Decision,
  Workstream,
  AutonomyPolicy,
} from '../types/governance.types.js';

export class AutonomyGuard {
  private autonomyPolicy: AutonomyPolicy;

  constructor(autonomyPolicy: AutonomyPolicy) {
    this.autonomyPolicy = autonomyPolicy;
  }

  /**
   * Checks if a decision requires escalation based on autonomy policy.
   */
  checkEscalation(decision: Decision): {
    requiresEscalation: boolean;
    reason?: string;
  } {
    // Check hard rules
    for (const rule of this.autonomyPolicy.hard_rules) {
      if (this.violatesHardRule(decision, rule.id)) {
        return {
          requiresEscalation: true,
          reason: `Violates hard rule: ${rule.description}`,
        };
      }
    }

    return {
      requiresEscalation: false,
    };
  }

  /**
   * Checks if a workstream requires escalation.
   */
  checkWorkstreamEscalation(workstream: Workstream): {
    requiresEscalation: boolean;
    reason?: string;
  } {
    // Check if autonomy tier requires approval
    if (workstream.autonomyTier === 1) {
      // Tier 1 = read-only, no escalation needed
      return { requiresEscalation: false };
    }

    if (workstream.autonomyTier === 3 || workstream.autonomyTier === 4) {
      // Tier 3/4 may require approval based on policy rules
      // This is checked by ConflictDetector
      return { requiresEscalation: false };
    }

    return { requiresEscalation: false };
  }

  /**
   * Checks if decision violates a hard rule.
   */
  private violatesHardRule(decision: Decision, ruleId: string): boolean {
    switch (ruleId) {
      case 'no_secrets':
        // Check if decision involves secrets
        return (
          decision.rationale.toLowerCase().includes('.env') ||
          decision.rationale.toLowerCase().includes('secret') ||
          decision.implications.toLowerCase().includes('.env') ||
          decision.implications.toLowerCase().includes('secret')
        );

      case 'confirm_destructive': {
        const destructiveKeywords = ['delete', 'remove', 'drop', 'destroy', 'reset', 'rebase'];
        return destructiveKeywords.some(keyword =>
          decision.rationale.toLowerCase().includes(keyword) ||
          decision.implications.toLowerCase().includes(keyword)
        );
      }

      default:
        return false;
    }
  }
}

