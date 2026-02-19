/**
 * Data Deletion Service
 * 
 * Implements DSGVO Art. 17 (right to erasure / "right to be forgotten").
 * Anonymizes user data in audit logs instead of physical deletion (for compliance).
 */

import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { PG_POOL } from "../../db/db.module";
import type { ActionLogger } from "@agent-runtime/orchestrator/orchestrator";
import type { Clock } from "@agent-system/governance-v2/runtime/clock";
import { SystemClock } from "@agent-system/governance-v2/runtime/clock";

@Injectable()
export class DataDeletionService {
  private readonly clock: Clock;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly logger: ActionLogger,
    clock?: Clock
  ) {
    this.clock = clock ?? new SystemClock();
  }

  /**
   * Deletes user data and anonymizes audit logs.
   * Implements DSGVO Art. 17 (right to erasure).
   * 
   * @param userId - User ID to delete
   * @param requestorUserId - User ID requesting deletion (for audit)
   * @returns Deletion summary
   */
  async deleteUserData(userId: string, requestorUserId: string): Promise<{
    ok: boolean;
    deleted: {
      decisions: number;
      reviews: number;
      anonymizedLogs: number;
    };
  }> {
    const now = this.clock.now().toISOString();

    await this.pool.query("BEGIN");

    try {
      // 1. Delete decisions where user is owner
      const { rowCount: decisionsDeleted } = await this.pool.query(
        `DELETE FROM decisions WHERE owner = $1`,
        [userId]
      );

      // 2. Delete review requests where user is involved
      const { rowCount: reviewsDeleted } = await this.pool.query(
        `DELETE FROM review_requests WHERE user_id = $1`,
        [userId]
      );

      // 3. Anonymize action_logs (soft-delete for audit compliance)
      // Replace userId with anonymized identifier
      const { rowCount: logsAnonymized } = await this.pool.query(
        `
        UPDATE action_logs 
        SET 
          user_id = 'deleted_user_' || id::text,
          input_json = jsonb_set(
            COALESCE(input_json, '{}'::jsonb),
            '{userId}',
            to_jsonb('deleted_user_' || id::text)
          ),
          output_json = jsonb_set(
            COALESCE(output_json, '{}'::jsonb),
            '{userId}',
            to_jsonb('deleted_user_' || id::text)
          )
        WHERE user_id = $1
        `,
        [userId]
      );

      // 4. Log deletion operation
      await this.logger.append({
        agentId: "system",
        userId: requestorUserId,
        action: "data_deletion.executed",
        input: {
          deletedUserId: userId,
          requestorUserId,
        },
        output: {
          decisionsDeleted,
          reviewsDeleted,
          logsAnonymized,
        },
        ts: now,
        blocked: false,
      });

      await this.pool.query("COMMIT");

      return {
        ok: true,
        deleted: {
          decisions: decisionsDeleted ?? 0,
          reviews: reviewsDeleted ?? 0,
          anonymizedLogs: logsAnonymized ?? 0,
        },
      };
    } catch (error) {
      await this.pool.query("ROLLBACK");
      throw error;
    }
  }

  /**
   * Checks if user data exists for deletion.
   */
  async hasUserData(userId: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `
      SELECT 
        (SELECT COUNT(*) FROM decisions WHERE owner = $1) as decisions_count,
        (SELECT COUNT(*) FROM review_requests WHERE user_id = $1) as reviews_count,
        (SELECT COUNT(*) FROM action_logs WHERE user_id = $1) as logs_count
      `,
      [userId]
    );

    const counts = rows[0];
    return (
      (parseInt(counts.decisions_count) > 0) ||
      (parseInt(counts.reviews_count) > 0) ||
      (parseInt(counts.logs_count) > 0)
    );
  }
}

