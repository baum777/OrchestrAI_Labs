/**
 * Conflict Detector
 * 
 * Detects conflicts between autonomy rules, policy rules, and workstream requirements.
 */

import type {
  Workstream,
  ValidationResult,
  AutonomyPolicy,
  PolicyRule,
} from '../types/governance.types.js';

export class ConflictDetector {
  /**
   * Detects conflicts between workstream autonomy tier and policy rules.
   */
  detectAutonomyConflicts(
    workstream: Workstream,
    autonomyPolicy: AutonomyPolicy,
    policyRules: PolicyRule[]
  ): ValidationResult {
    const reasons: string[] = [];

    // Check if workstream requires approval but autonomy tier suggests autonomous execution
    if (workstream.autonomyTier === 4) {
      // Tier 4 = autonomous-with-limits
      // Check if any policy rule would block this
      const matchingRules = policyRules.filter(rule => this.matchesPolicyRule(workstream, rule));
      if (matchingRules.length > 0) {
        reasons.push(
          `Autonomy tier 4 (autonomous) conflicts with policy rules requiring approval: ${matchingRules.map(r => r.id).join(', ')}`
        );
      }
    }

    // Check if workstream scope matches deny patterns
    for (const rule of policyRules) {
      if (rule.deny_if_matches) {
        for (const pattern of rule.deny_if_matches) {
          if (workstream.scope.some(scope => this.matchesPattern(scope, pattern))) {
            reasons.push(
              `Workstream scope matches denied pattern: ${pattern} (policy rule: ${rule.id})`
            );
          }
        }
      }
    }

    if (reasons.length > 0) {
      return {
        status: 'conflict',
        reasons,
        requiresReview: true,
      };
    }

    return {
      status: 'pass',
    };
  }

  /**
   * Checks if workstream matches a policy rule.
   */
  private matchesPolicyRule(workstream: Workstream, rule: PolicyRule): boolean {
    // Check if scope matches any touched paths
    if (rule.match.touches_paths_any) {
      const patterns = rule.match.touches_paths_any as string[];
      return workstream.scope.some(scope => 
        patterns.some(pattern => this.matchesPattern(scope, pattern))
      );
    }

    // Check file count threshold
    if (rule.match.files_changed_gt) {
      const threshold = rule.match.files_changed_gt as number;
      if (workstream.scope.length > threshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Simple pattern matching (supports ** and * wildcards).
   */
  private matchesPattern(path: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\//g, '\\/');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }
}

