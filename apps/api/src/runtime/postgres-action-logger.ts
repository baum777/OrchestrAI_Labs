import { Inject, Injectable } from "@nestjs/common";
import type { ActionLogger } from "@agent-runtime/orchestrator/orchestrator";
import { PG_POOL } from "../db/db.module";
import type { Pool } from "pg";

@Injectable()
export class PostgresActionLogger implements ActionLogger {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async append(entry: {
    agentId: string;
    userId: string;
    action: string;
    input: unknown;
    output: unknown;
    ts: string;
    blocked?: boolean;
    reason?: string;
    projectId?: string;
    clientId?: string;
    // Skill metadata (optional)
    skillId?: string;
    skillVersion?: string;
    skillRunId?: string;
    skillStatus?: string;
    skillDurationMs?: number;
    skillBlockReason?: string;
  }): Promise<void> {
    // Enrich output_json with skill metadata for observability
    const enrichedOutput = entry.output ? {
      ...(typeof entry.output === 'object' && entry.output !== null ? entry.output as Record<string, unknown> : {}),
      ...(entry.skillId ? { skillId: entry.skillId } : {}),
      ...(entry.skillVersion ? { skillVersion: entry.skillVersion } : {}),
      ...(entry.skillRunId ? { skillRunId: entry.skillRunId } : {}),
      ...(entry.skillStatus ? { skillStatus: entry.skillStatus } : {}),
      ...(entry.skillDurationMs !== undefined ? { skillDurationMs: entry.skillDurationMs } : {}),
      ...(entry.skillBlockReason ? { skillBlockReason: entry.skillBlockReason } : {}),
    } : entry.output;

    await this.pool.query(
      `
      INSERT INTO action_logs
        (project_id, client_id, user_id, agent_id, action, input_json, output_json, blocked, reason, created_at)
      VALUES
        ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10::timestamptz)
      `,
      [
        entry.projectId ?? null,
        entry.clientId ?? null,
        entry.userId,
        entry.agentId,
        entry.action,
        JSON.stringify(entry.input ?? null),
        JSON.stringify(enrichedOutput ?? null),
        entry.blocked ?? false,
        entry.reason ?? null,
        entry.ts,
      ]
    );
  }
}

