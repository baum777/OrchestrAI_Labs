/**
 * Log Retention Job
 * 
 * Scheduled job to enforce log retention policies.
 * ISO 27001: A.12.4.1 (Event logging) - Log retention enforcement
 * 
 * Deletes audit logs older than retention period (default: 7 years).
 * Deletes application logs older than retention period (default: 90 days).
 */

import { Injectable, Inject, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PG_POOL } from "../db/db.module";
import type { Pool } from "pg";
import { getLogRetentionConfig, getRetentionCutoffDate } from "../config/log-retention.config";

@Injectable()
export class LogRetentionJob {
  private readonly logger = new Logger(LogRetentionJob.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Enforce log retention policy.
   * Runs daily at 2 AM UTC.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async enforceRetention(): Promise<void> {
    this.logger.log("Starting log retention enforcement job");

    try {
      const config = getLogRetentionConfig();
      const auditCutoff = getRetentionCutoffDate(config.auditLogRetentionDays);
      const appCutoff = getRetentionCutoffDate(config.appLogRetentionDays);

      // Delete application logs older than retention period
      const appResult = await this.pool.query(
        `
        DELETE FROM action_logs
        WHERE created_at < $1
          AND action NOT LIKE 'audit.%'
          AND action NOT LIKE 'http.%'
          AND action NOT IN ('escalation', 'policy.violation', 'customer_data.access')
        `,
        [appCutoff]
      );

      this.logger.log(
        `Deleted ${appResult.rowCount ?? 0} application logs older than ${config.appLogRetentionDays} days`
      );

      // For audit logs (7 years retention), we only delete if they're older than 7 years
      // and are not critical audit events
      const criticalAuditResult = await this.pool.query(
        `
        DELETE FROM action_logs
        WHERE created_at < $1
          AND (
            action LIKE 'audit.%'
            OR action LIKE 'http.%'
            OR action IN ('escalation', 'policy.violation', 'customer_data.access')
          )
        `,
        [auditCutoff]
      );

      this.logger.log(
        `Deleted ${criticalAuditResult.rowCount ?? 0} audit logs older than ${config.auditLogRetentionDays} days (7 years)`
      );

      this.logger.log("Log retention enforcement job completed successfully");
    } catch (error) {
      this.logger.error(
        `Log retention enforcement job failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined
      );
      // Don't throw - allow job to retry on next run
    }
  }

  /**
   * Manual trigger for log retention (for testing/admin use)
   */
  async runManually(): Promise<{ deletedAudit: number; deletedApp: number }> {
    this.logger.log("Manual log retention enforcement triggered");

    const config = getLogRetentionConfig();
    const auditCutoff = getRetentionCutoffDate(config.auditLogRetentionDays);
    const appCutoff = getRetentionCutoffDate(config.appLogRetentionDays);

    // Delete application logs
    const appResult = await this.pool.query(
      `
      DELETE FROM action_logs
      WHERE created_at < $1
        AND action NOT LIKE 'audit.%'
        AND action NOT LIKE 'http.%'
        AND action NOT IN ('escalation', 'policy.violation', 'customer_data.access')
      `,
      [appCutoff]
    );

    // Delete audit logs
    const auditResult = await this.pool.query(
      `
      DELETE FROM action_logs
      WHERE created_at < $1
        AND (
          action LIKE 'audit.%'
          OR action LIKE 'http.%'
          OR action IN ('escalation', 'policy.violation', 'customer_data.access')
        )
      `,
      [auditCutoff]
    );

      return {
        deletedAudit: auditResult.rowCount ?? 0,
        deletedApp: appResult.rowCount ?? 0,
      };
  }
}

