import { Pool } from "pg";

export type EscalationLogRow = {
  id: number;
  action: string;
  blocked: boolean;
  reason: string | null;
  input: unknown;
  ts: string;
};

export async function readEscalations(params: {
  databaseUrl: string;
  projectId: string;
  sinceTs: string;
  limit?: number;
}): Promise<EscalationLogRow[]> {
  const pool = new Pool({ connectionString: params.databaseUrl });
  try {
    const limit = params.limit ?? 50;
    const { rows } = await pool.query<{
      id: number;
      action: string;
      blocked: boolean;
      reason: string | null;
      input: unknown;
      ts: string;
    }>(
      `
      SELECT
        id,
        action,
        blocked,
        reason,
        input_json AS input,
        created_at AS ts
      FROM action_logs
      WHERE project_id = $1
        AND action = 'escalation'
        AND created_at >= $2::timestamptz
      ORDER BY created_at DESC
      LIMIT $3
      `,
      [params.projectId, params.sinceTs, limit]
    );

    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      blocked: r.blocked,
      reason: r.reason,
      input: r.input,
      ts: typeof r.ts === "string" ? r.ts : String(r.ts),
    }));
  } finally {
    await pool.end();
  }
}

