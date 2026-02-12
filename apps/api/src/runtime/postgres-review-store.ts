import { Inject, Injectable } from "@nestjs/common";
import type { ReviewRequest } from "@agent-runtime/orchestrator/orchestrator";
import type { Permission } from "@shared/types/agent";
import { PG_POOL } from "../db/db.module";
import type { Pool } from "pg";
import crypto from "node:crypto";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

@Injectable()
export class PostgresReviewStore {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(req: ReviewRequest & { projectId?: string; clientId?: string; userId?: string }): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO review_requests
        (id, project_id, client_id, user_id, agent_id, permission, payload_json, status, reviewer_roles, created_at)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7::jsonb,'pending',$8::jsonb,$9::timestamptz)
      `,
      [
        req.id,
        req.projectId ?? null,
        req.clientId ?? null,
        req.userId ?? "unknown",
        req.agentId,
        req.permission,
        JSON.stringify(req.payload ?? null),
        JSON.stringify(req.reviewerRoles ?? []),
        req.createdAt,
      ]
    );
  }

  async getApprovedForCommit(input: { reviewId: string; token: string }): Promise<{
    ok: boolean;
    reason?: string;
    permission?: Permission;
    agentId?: string;
    payload?: unknown;
  }> {
    const tokenHash = sha256(input.token);

    const { rows } = await this.pool.query(
      `
      SELECT id, agent_id, permission, payload_json, status, commit_token_hash, commit_token_used
      FROM review_requests
      WHERE id = $1
      LIMIT 1
      `,
      [input.reviewId]
    );

    if (rows.length === 0) return { ok: false, reason: "Review not found" };
    const r = rows[0];

    if (r.status !== "approved") return { ok: false, reason: "Review not approved" };
    if (!r.commit_token_hash) return { ok: false, reason: "No commit token issued" };
    if (r.commit_token_used) return { ok: false, reason: "Commit token already used" };
    if (r.commit_token_hash !== tokenHash) return { ok: false, reason: "Invalid commit token" };

    return {
      ok: true,
      agentId: r.agent_id,
      permission: r.permission,
      payload: r.payload_json,
    };
  }

  async markTokenUsed(reviewId: string): Promise<void> {
    const { rowCount } = await this.pool.query(
      `
      UPDATE review_requests
      SET commit_token_used = TRUE
      WHERE id = $1 AND status = 'approved' AND commit_token_used = FALSE
      `,
      [reviewId]
    );
    if (rowCount !== 1) {
      throw new Error("Failed to mark commit token used (already used or not approved)");
    }
  }
}

