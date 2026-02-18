/**
 * Policy Engine (V2)
 * 
 * Parses and enforces policy rules from:
 * - autonomy_policy.md
 * - policy_approval_rules.yaml
 * 
 * V2-First Architecture: Uses Clock abstraction for deterministic time handling.
 */

import type {
  Decision,
  PolicyRule,
  AutonomyPolicy,
} from '../types/governance.types.js';
import type { Clock } from '../runtime/clock.js';
import { SystemClock } from '../runtime/clock.js';
import fs from 'node:fs';
import path from 'node:path';
import { resolveRepoRoot } from '../utils/repo-root.js';

export class PolicyEngine {
  private policyRules: PolicyRule[] = [];
  private autonomyPolicy: AutonomyPolicy | null = null;
  private readonly clock: Clock;

  constructor(clock?: Clock) {
    this.clock = clock ?? new SystemClock();
  }

  /**
   * Loads policy rules from policy_approval_rules.yaml
   */
  async loadPolicyRules(rulesPath?: string): Promise<void> {
    const repoRoot = resolveRepoRoot();
    const defaultPath = path.join(repoRoot, 'ops/agent-team/policy_approval_rules.yaml');
    const filePath = rulesPath || defaultPath;

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      // Simple YAML parsing (for production, use a proper YAML parser)
      const parsed = this.parseYaml(content);
      this.policyRules = parsed.rules || [];
    } catch (error) {
      console.warn(`Failed to load policy rules from ${filePath}:`, error);
      this.policyRules = [];
    }
  }

  /**
   * Loads autonomy policy from autonomy_policy.md
   */
  async loadAutonomyPolicy(policyPath?: string): Promise<void> {
    const repoRoot = resolveRepoRoot();
    const defaultPath = path.join(repoRoot, 'ops/agent-team/autonomy_policy.md');
    const filePath = policyPath || defaultPath;

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      // Parse markdown structure (simplified)
      this.autonomyPolicy = this.parseAutonomyPolicy(content);
    } catch (error) {
      console.warn(`Failed to load autonomy policy from ${filePath}:`, error);
      this.autonomyPolicy = null;
    }
  }

  /**
   * Checks if a decision is allowed by policy rules.
   */
  checkDecision(decision: Decision): { allowed: boolean; reason?: string } {
    // Placeholder implementation
    // In production, check decision against policy rules
    return { allowed: true };
  }

  /**
   * Gets all policy rules.
   */
  getPolicyRules(): PolicyRule[] {
    return this.policyRules;
  }

  /**
   * Gets autonomy policy.
   */
  getAutonomyPolicy(): AutonomyPolicy | null {
    return this.autonomyPolicy;
  }

  /**
   * Simple YAML parser (for production, use js-yaml or similar).
   */
  private parseYaml(content: string): { rules?: PolicyRule[] } {
    // This is a simplified parser - in production, use a proper YAML library
    // For now, return empty rules
    return { rules: [] };
  }

  /**
   * Parses autonomy policy from markdown.
   */
  private parseAutonomyPolicy(content: string): AutonomyPolicy {
    // Simplified parser - extract ladder and defaults
    const ladder: Record<number, string> = {
      1: 'read-only',
      2: 'draft-only',
      3: 'execute-with-approval',
      4: 'autonomous-with-limits',
    };

    return {
      ladder,
      defaults: {
        repo_default_tier: 2,
        implementer_default_tier: 3,
      },
      hard_rules: [
        { id: 'no_secrets', description: 'Never read/write secrets or .env contents' },
        { id: 'confirm_destructive', description: 'Ask for explicit confirmation before destructive actions' },
        { id: 'policy_gate_required', description: 'If approval rules match, merge requires reviewer approval' },
      ],
    };
  }
}

