/**
 * Log Retention Configuration
 * 
 * ISO 27001: A.12.4.1 (Event logging) - Log retention policies
 * 
 * Defines retention periods for different log types:
 * - Audit logs: 7 years (legal/compliance requirement)
 * - Application logs: 90 days (operational requirement)
 */

export interface LogRetentionConfig {
  /**
   * Retention period for audit logs (in days)
   * Default: 7 years (2555 days)
   */
  auditLogRetentionDays: number;
  
  /**
   * Retention period for application logs (in days)
   * Default: 90 days
   */
  appLogRetentionDays: number;
  
  /**
   * Enable automatic archival (move old logs to archive)
   * Default: false (manual archival)
   */
  enableAutoArchival: boolean;
  
  /**
   * Archive location (if auto-archival enabled)
   */
  archiveLocation?: string;
}

/**
 * Default log retention configuration
 */
export const DEFAULT_LOG_RETENTION_CONFIG: LogRetentionConfig = {
  auditLogRetentionDays: 2555, // 7 years
  appLogRetentionDays: 90, // 90 days
  enableAutoArchival: false, // Manual archival for now
};

/**
 * Get log retention config from environment variables
 */
export function getLogRetentionConfig(): LogRetentionConfig {
  return {
    auditLogRetentionDays: parseInt(
      process.env.AUDIT_LOG_RETENTION_DAYS || String(DEFAULT_LOG_RETENTION_CONFIG.auditLogRetentionDays),
      10
    ),
    appLogRetentionDays: parseInt(
      process.env.APP_LOG_RETENTION_DAYS || String(DEFAULT_LOG_RETENTION_CONFIG.appLogRetentionDays),
      10
    ),
    enableAutoArchival: process.env.ENABLE_AUTO_ARCHIVAL === "true",
    archiveLocation: process.env.ARCHIVE_LOCATION,
  };
}

/**
 * Calculate cutoff date for log retention
 */
export function getRetentionCutoffDate(retentionDays: number): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  return cutoff;
}

