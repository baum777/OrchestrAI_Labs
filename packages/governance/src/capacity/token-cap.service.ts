/**
 * Token Cap Service
 *
 * Tracks daily token usage per tenant and enforces caps.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { PG_POOL } from '../../../apps/api/src/db/db.module';
import type { Pool } from 'pg';
import { SystemClock } from '../runtime/clock';
import type { Clock } from '../runtime/clock';

@Injectable()
export class TokenCapService {
  private readonly logger = new Logger(TokenCapService.name);
  private readonly clock: Clock;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    clock?: Clock,
  ) {
    this.clock = clock ?? new SystemClock();
  }

  /**
   * Check if tenant has remaining token budget
   */
  async checkBudget(tenantId: string, requestedTokens: number): Promise<{ allowed: boolean; remaining: number }> {
    const today = this.clock.now().toISOString().split('T')[0];

    // Get or create usage record
    const result = await this.pool.query(
      `INSERT INTO token_usage_daily (tenant_id, usage_date, tokens_used, tokens_remaining)
       VALUES ($1, $2, 0, (SELECT daily_tokens FROM tenant_quotas WHERE tenant_id = $3))
       ON CONFLICT (tenant_id, usage_date) DO UPDATE SET last_updated = NOW()
       RETURNING tokens_used, tokens_remaining`,
      [tenantId, today, tenantId]
    );

    const { tokens_remaining } = result.rows[0];

    if (tokens_remaining < requestedTokens) {
      // Log violation
      await this.pool.query(
        `INSERT INTO capacity_violations (tenant_id, violation_type, details)
         VALUES ($1, $2, $3)`,
        [tenantId, 'token_cap', JSON.stringify({ requested: requestedTokens, remaining: tokens_remaining })]
      );

      this.logger.warn(`Token cap exceeded for ${tenantId}: ${requestedTokens} requested, ${tokens_remaining} remaining`);
      return { allowed: false, remaining: tokens_remaining };
    }

    return { allowed: true, remaining: tokens_remaining };
  }

  /**
   * Consume tokens from budget
   */
  async consumeTokens(tenantId: string, tokens: number): Promise<void> {
    const today = this.clock.now().toISOString().split('T')[0];

    await this.pool.query(
      `UPDATE token_usage_daily
       SET tokens_used = tokens_used + $1,
           tokens_remaining = tokens_remaining - $1,
           last_updated = NOW()
       WHERE tenant_id = $2 AND usage_date = $3`,
      [tokens, tenantId, today]
    );
  }

  /**
   * Estimate tokens from prompt length (rough approximation)
   */
  estimateTokens(prompt: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(prompt.length / 4);
  }

  /**
   * Get current usage stats
   */
  async getUsageStats(tenantId: string): Promise<{ used: number; remaining: number; total: number } | null> {
    const today = this.clock.now().toISOString().split('T')[0];

    const result = await this.pool.query(
      `SELECT u.tokens_used, u.tokens_remaining, q.daily_tokens as total
       FROM token_usage_daily u
       JOIN tenant_quotas q ON u.tenant_id = q.tenant_id
       WHERE u.tenant_id = $1 AND u.usage_date = $2`,
      [tenantId, today]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      used: parseInt(result.rows[0].tokens_used),
      remaining: parseInt(result.rows[0].tokens_remaining),
      total: parseInt(result.rows[0].total),
    };
  }
}
