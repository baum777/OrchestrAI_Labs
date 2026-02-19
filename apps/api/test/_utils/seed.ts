import crypto from "node:crypto";
import type { Pool } from "pg";
import type { Permission } from "@shared/types/agent";
import { SystemClock } from "@agent-system/governance-v2/runtime/clock";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function seedProject(pool: Pool, params: { projectId: string; clientId?: string }): Promise<void> {
  await pool.query(
    `
    INSERT INTO projects (id, client_id, name, description)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (id) DO NOTHING
    `,
    [params.projectId, params.clientId ?? null, `Test Project ${params.projectId}`, "Seeded by golden tests"]
  );
}

export type SeedReviewParams = {
  reviewId?: string;
  projectId: string;
  clientId?: string;
  userId?: string;
  agentId: string;
  permission: Permission;
  status: "pending" | "approved" | "rejected" | "cancelled";
  payload?: unknown;
  reviewerRoles?: string[];
  commitToken?: string;
  commitTokenUsed?: boolean;
};

export async function seedReviewRequest(pool: Pool, params: SeedReviewParams): Promise<{
  reviewId: string;
  commitToken?: string;
}> {
  const reviewId = params.reviewId ?? `rev_${crypto.randomUUID()}`;
  const clock = new SystemClock();
  const now = clock.now().toISOString();

  const commitToken = params.commitToken;
  const commitTokenHash = commitToken ? sha256(commitToken) : null;
  const commitTokenUsed = params.commitTokenUsed ?? false;
  const resolvedAt = params.status === "approved" || params.status === "rejected" || params.status === "cancelled" ? now : null;

  await pool.query(
    `
    INSERT INTO review_requests
      (id, project_id, client_id, user_id, agent_id, permission, payload_json, status, reviewer_roles,
       created_at, resolved_at, commit_token_hash, commit_token_used, commit_token_issued_at)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9::jsonb,$10::timestamptz,$11::timestamptz,$12,$13,$14::timestamptz)
    ON CONFLICT (id) DO NOTHING
    `,
    [
      reviewId,
      params.projectId,
      params.clientId ?? null,
      params.userId ?? "test_user",
      params.agentId,
      params.permission,
      JSON.stringify(params.payload ?? null),
      params.status,
      JSON.stringify(params.reviewerRoles ?? ["senior"]),
      now,
      resolvedAt,
      commitTokenHash,
      commitTokenUsed,
      commitToken ? now : null,
    ]
  );

  return { reviewId, commitToken };
}

