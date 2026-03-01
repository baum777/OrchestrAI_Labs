/**
 * Retention Orchestrator Job
 *
 * Policy-driven data retention enforcement with audit proof generation.
 * ISO 27001: A.12.4.1 (Event logging) - Log retention enforcement
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PG_POOL } from '../db/db.module';
import type { Pool } from 'pg';
import { RetentionPolicyService } from '../modules/retention/retention-policy.service';
import { AuditProofService } from '../modules/retention/audit-proof.service';
import { SystemClock } from '@agent-system/governance-v2/runtime/clock';
import type { Clock } from '@agent-system/governance-v2/runtime/clock';

interface RetentionResult {
  category: string;
  recordsIdentified: number;
  recordsDeleted: number;
  archived: boolean;
  dryRun: boolean;
  proofStored: boolean;
}

@Injectable()
export class RetentionOrchestratorJob {
  private readonly logger = new Logger(RetentionOrchestratorJob.name);
  private readonly clock: Clock;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly policyService: RetentionPolicyService,
    private readonly auditProofService: AuditProofService,
    clock?: Clock,
  ) {
    this.clock = clock ?? new SystemClock();
  }

  /**
   * Enforce all retention policies.
   * Runs daily at 3 AM UTC.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async enforceRetention(): Promise<void> {
    this.logger.log('Starting retention orchestrator job');
    const dryRun = this.policyService.isDryRunEnabled();

    try {
      const results: RetentionResult[] = [];

      // Process each category
      results.push(await this.processActionLogs(dryRun, 'cron'));
      results.push(await this.processAppLogs(dryRun, 'cron'));
      results.push(await this.processUserSessions(dryRun));

      this.logSummary(results, dryRun);
      this.logger.log('Retention orchestrator job completed');
    } catch (error) {
      this.logger.error(
        `Retention job failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Don't throw - allow retry on next run
    }
  }

  /**
   * Process action_logs retention
   */
  private async processActionLogs(dryRun: boolean, triggeredBy: 'cron' | 'manual' | 'api'): Promise<RetentionResult> {
    const category = 'action_logs';
    const rule = this.policyService.getRule(category);

    if (!rule) {
      this.logger.warn(`No retention rule found for ${category}`);
      return { category, recordsIdentified: 0, recordsDeleted: 0, archived: false, dryRun, proofStored: false };
    }

    const retentionDays = this.policyService.parseDuration(rule.duration);
    const cutoff = this.clock.now();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    // Identify records
    const identifyResult = await this.pool.query(
      `SELECT id FROM action_logs WHERE created_at < $1`,
      [cutoff],
    );

    const recordIds = identifyResult.rows.map(r => r.id);
    const recordsIdentified = recordIds.length;

    if (dryRun) {
      this.logger.log(`[DRY RUN] Would delete ${recordsIdentified} action_logs older than ${retentionDays} days`);
      return { category, recordsIdentified, recordsDeleted: 0, archived: false, dryRun, proofStored: false };
    }

    // Generate audit proof before deletion
    const dateRangeStart = this.clock.parseISO(cutoff.toISOString());
    dateRangeStart.setFullYear(dateRangeStart.getFullYear() - 1); // Approximate

    const proof = this.auditProofService.generateProof({
      category,
      recordIds,
      dateRangeStart,
      dateRangeEnd: cutoff,
      policyVersion: this.policyService.loadPolicy().version,
      dryRun,
    });

    // Store audit proof
    await this.storeProof(category, proof, triggeredBy, dryRun);

    // Delete records
    const deleteResult = await this.pool.query(
      `DELETE FROM action_logs WHERE created_at < $1`,
      [cutoff],
    );

    const recordsDeleted = deleteResult.rowCount ?? 0;
    this.logger.log(`Deleted ${recordsDeleted} action_logs older than ${retentionDays} days`);

    return {
      category,
      recordsIdentified,
      recordsDeleted,
      archived: false,
      dryRun,
      proofStored: true,
    };
  }

  /**
   * Process application logs (subset of action_logs)
   */
  private async processAppLogs(dryRun: boolean, triggeredBy: 'cron' | 'manual' | 'api'): Promise<RetentionResult> {
    const category = 'app_logs';
    const rule = this.policyService.getRule(category);

    if (!rule) {
      return { category, recordsIdentified: 0, recordsDeleted: 0, archived: false, dryRun, proofStored: false };
    }

    const retentionDays = this.policyService.parseDuration(rule.duration);
    const cutoff = this.clock.now();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    // Identify non-audit logs
    const identifyResult = await this.pool.query(
      `SELECT id FROM action_logs 
       WHERE created_at < $1 
         AND action NOT LIKE 'audit.%'
         AND action NOT IN ('escalation', 'policy.violation', 'customer_data.access')`,
      [cutoff],
    );

    const recordIds = identifyResult.rows.map(r => r.id);

    if (dryRun) {
      this.logger.log(`[DRY RUN] Would delete ${recordIds.length} app_logs`);
      return { category, recordsIdentified: recordIds.length, recordsDeleted: 0, archived: false, dryRun, proofStored: false };
    }

    const proof = this.auditProofService.generateProof({
      category,
      recordIds,
      dateRangeStart: cutoff,
      dateRangeEnd: this.clock.now(),
      policyVersion: this.policyService.loadPolicy().version,
      dryRun,
    });

    await this.storeProof(category, proof, triggeredBy, dryRun);

    const deleteResult = await this.pool.query(
      `DELETE FROM action_logs 
       WHERE created_at < $1 
         AND action NOT LIKE 'audit.%'
         AND action NOT IN ('escalation', 'policy.violation', 'customer_data.access')`,
      [cutoff],
    );

    return {
      category,
      recordsIdentified: recordIds.length,
      recordsDeleted: deleteResult.rowCount ?? 0,
      archived: false,
      dryRun,
      proofStored: true,
    };
  }

  /**
   * Process user sessions
   */
  private async processUserSessions(dryRun: boolean, _triggeredBy: 'cron' | 'manual' | 'api'): Promise<RetentionResult> {
    // Placeholder for user session cleanup
    return { category: 'user_sessions', recordsIdentified: 0, recordsDeleted: 0, archived: false, dryRun, proofStored: false };
  }

  /**
   * Store proof in database
   */
  private async storeProof(
    category: string,
    proof: { batchChecksum: string; verificationHash: string; recordCount: number },
    triggeredBy: 'cron' | 'manual' | 'api',
    dryRun: boolean
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO retention_audit 
       (category, batch_checksum, record_count, date_range_start, date_range_end, 
        triggered_by, dry_run, verification_hash, policy_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        category,
        proof.batchChecksum,
        proof.recordCount,
        this.clock.now(),
        this.clock.now(),
        triggeredBy,
        dryRun,
        proof.verificationHash,
        this.policyService.loadPolicy().version,
      ]
    );
  }

  /**
   * Log summary of retention run
   */
  private logSummary(results: RetentionResult[], dryRun: boolean): void {
    this.logger.log(`=== Retention Run Summary (${dryRun ? 'DRY RUN' : 'LIVE'}) ===`);
    for (const r of results) {
      this.logger.log(`${r.category}: ${r.recordsDeleted} deleted (${r.recordsIdentified} identified)`);
    }
  }

  /**
   * Manual trigger with optional dry-run
   */
  async runManually(dryRun: boolean = false): Promise<RetentionResult[]> {
    this.logger.log(`Manual retention run (dryRun=${dryRun})`);

    const results: RetentionResult[] = [];
    results.push(await this.processActionLogs(dryRun, 'manual'));
    results.push(await this.processAppLogs(dryRun, 'manual'));
    results.push(await this.processUserSessions(dryRun));

    return results;
  }
}
