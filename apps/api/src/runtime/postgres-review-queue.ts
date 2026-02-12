import { Inject, Injectable } from "@nestjs/common";
import type { ReviewQueue, ReviewRequest } from "@agent-runtime/orchestrator/orchestrator";
import { PG_POOL } from "../db/db.module";
import type { Pool } from "pg";

@Injectable()
export class PostgresReviewQueue implements ReviewQueue {
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
}

