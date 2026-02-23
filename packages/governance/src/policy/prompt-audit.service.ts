import { Injectable, Inject, Logger } from '@nestjs/common';
import { PG_POOL } from '../../../apps/api/src/db/db.module';
import type { Pool } from 'pg';
import { createHash } from 'crypto';

@Injectable()
export class PromptAuditService {
  private readonly logger = new Logger(PromptAuditService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  /**
   * Log prompt firewall decision
   * Stores hash and truncated preview, NOT raw prompt
   */
  async logDecision(
    promptHash: string,
    promptPreview: string,
    riskScore: number,
    blocked: boolean,
    reasons: string[],
    tenantId?: string,
    userId?: string,
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO prompt_audit
         (prompt_hash, prompt_preview, risk_score, blocked, reasons, tenant_id, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          promptHash,
          promptPreview,
          riskScore,
          blocked,
          JSON.stringify(reasons),
          tenantId || 'anonymous',
          userId || 'anonymous',
        ]
      );

      if (blocked) {
        this.logger.warn(`Blocked high-risk prompt: hash=${promptHash.substring(0, 16)}... risk=${riskScore}`);
      }
    } catch (error) {
      this.logger.error(`Failed to log prompt audit: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Hash a prompt for audit trail
   */
  hashPrompt(prompt: string): string {
    return createHash('sha256').update(prompt).digest('hex');
  }
}
