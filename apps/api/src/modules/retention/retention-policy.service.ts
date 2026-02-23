import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';

export interface RetentionRule {
  duration: string;
  justification: string;
  action: 'delete' | 'archive_and_delete' | 'compress_and_retain' | 'archive_inactive';
  priority: 'critical' | 'high' | 'normal' | 'low';
  archive_location?: string;
  inactive_threshold_days?: number;
  immutable?: boolean;
  condition?: string;
}

export interface RetentionPolicy {
  version: string;
  retention_rules: Record<string, RetentionRule>;
  audit_proof: {
    algorithm: string;
    encoding: string;
    include_record_count: boolean;
    include_date_range: boolean;
    hmac_secret_env?: string;
  };
  dry_run: {
    enabled_by_default: boolean;
    log_output: boolean;
    max_records_to_preview: number;
  };
}

@Injectable()
export class RetentionPolicyService {
  private readonly logger = new Logger(RetentionPolicyService.name);
  private policy: RetentionPolicy | null = null;
  private readonly policyPath: string;

  constructor() {
    this.policyPath = join(process.cwd(), 'ops', 'agent-team', 'retention_policy.yaml');
  }

  /**
   * Load and parse retention policy from YAML
   */
  loadPolicy(): RetentionPolicy {
    if (this.policy) {
      return this.policy;
    }

    try {
      const content = readFileSync(this.policyPath, 'utf-8');
      this.policy = yaml.load(content) as RetentionPolicy;
      this.logger.log(`Loaded retention policy v${this.policy.version}`);
      return this.policy;
    } catch (error) {
      this.logger.error('Failed to load retention policy', error);
      throw new Error('Retention policy not found or invalid');
    }
  }

  /**
   * Get retention rule for a specific category
   */
  getRule(category: string): RetentionRule | undefined {
    const policy = this.loadPolicy();
    return policy.retention_rules[category];
  }

  /**
   * Get all retention rules
   */
  getAllRules(): Record<string, RetentionRule> {
    const policy = this.loadPolicy();
    return policy.retention_rules;
  }

  /**
   * Parse duration string (e.g., "7y", "90d", "1y") to days
   */
  parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([yd])$/);
    if (!match) {
      throw new Error(`Invalid duration format: ${duration}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    if (unit === 'y') {
      return value * 365; // Approximate
    }
    return value;
  }

  /**
   * Check if dry run mode is enabled
   */
  isDryRunEnabled(): boolean {
    const policy = this.loadPolicy();
    return process.env.RETENTION_DRY_RUN === 'true' || policy.dry_run.enabled_by_default;
  }
}
