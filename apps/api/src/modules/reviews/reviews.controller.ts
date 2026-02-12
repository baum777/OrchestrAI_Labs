import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import { PG_POOL } from "../../db/db.module";
import type { Pool } from "pg";
import crypto from "node:crypto";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

@Controller("reviews")
export class ReviewsController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get()
  async list(@Query("status") status?: string) {
    const s = status ?? "pending";
    const { rows } = await this.pool.query(
      `SELECT id, project_id, client_id, user_id, agent_id, permission, status, reviewer_roles, created_at, resolved_at, commit_token_used
       FROM review_requests WHERE status = $1 ORDER BY created_at DESC LIMIT 200`,
      [s]
    );
    return rows;
  }

  @Post(":id/approve")
  async approve(@Param("id") id: string, @Body() body: { reviewerUserId: string; comment?: string }) {
    const token = generateToken();
    const tokenHash = sha256(token);

    await this.pool.query("BEGIN");
    try {
      const { rowCount } = await this.pool.query(
        `UPDATE review_requests
           SET status='approved',
               resolved_at=now(),
               commit_token_hash=$2,
               commit_token_used=FALSE,
               commit_token_issued_at=now()
         WHERE id=$1 AND status='pending'`,
        [id, tokenHash]
      );

      if (rowCount !== 1) {
        await this.pool.query("ROLLBACK");
        return { ok: false, error: "Review not pending or not found" };
      }

      await this.pool.query(
        `INSERT INTO review_actions (review_id, reviewer_user_id, action, comment) VALUES ($1,$2,'approve',$3)`,
        [id, body.reviewerUserId, body.comment ?? null]
      );
      await this.pool.query("COMMIT");
      return { ok: true, reviewId: id, commitToken: token };
    } catch (e) {
      await this.pool.query("ROLLBACK");
      throw e;
    }
  }

  @Post(":id/reject")
  async reject(@Param("id") id: string, @Body() body: { reviewerUserId: string; comment?: string }) {
    await this.pool.query("BEGIN");
    try {
      await this.pool.query(
        `UPDATE review_requests SET status='rejected', resolved_at=now() WHERE id=$1 AND status='pending'`,
        [id]
      );
      await this.pool.query(
        `INSERT INTO review_actions (review_id, reviewer_user_id, action, comment) VALUES ($1,$2,'reject',$3)`,
        [id, body.reviewerUserId, body.comment ?? null]
      );
      await this.pool.query("COMMIT");
      return { ok: true };
    } catch (e) {
      await this.pool.query("ROLLBACK");
      throw e;
    }
  }
}

