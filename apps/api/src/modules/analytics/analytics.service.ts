import { Inject, Injectable, Optional } from "@nestjs/common";
import { PG_POOL } from "../../db/db.module";
import type { Pool } from "pg";
import type { Clock } from "@agent-system/governance-v2/runtime/clock";
import { SystemClock } from "@agent-system/governance-v2/runtime/clock";

export type AnalyticsOverview = {
  totalEvents: number;
  totalRuns: number;
  skillExecuted: number;
  skillBlocked: number;
  reviewRequired: number;
  timeGapDetected: number;
  policyViolations: number;
  skillSuccessRate: number;
  reviewRate: number;
  timeGapRate: number;
};

export type SkillStats = {
  skillId: string;
  executed: number;
  blocked: number;
  blockReasons: Array<{ reason: string; count: number }>;
  avgDurationMs: number | null;
  lastSeenAt: string | null;
};

export type ReviewsStats = {
  totalReviews: number;
  approved: number;
  rejected: number;
  pending: number;
  commitTokenUsed: number;
  commitConversion: number;
};

export type GovernanceStats = {
  blockedByAction: Array<{ action: string; count: number }>;
  topBlockReasons: Array<{ reason: string; count: number }>;
  policyViolations: number;
  decisionFinalizedCount: number;
};

export type TimeStats = {
  timeGapDetected: number;
  lastTimeGapAt: string | null;
  dailyTrend: Array<{ date: string; count: number }>;
};

@Injectable()
export class AnalyticsService {
  private readonly clock: Clock;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Optional() clock?: Clock
  ) {
    this.clock = clock ?? new SystemClock();
  }

  private resolveDateRange(from?: string, to?: string): {
    fromIso: string;
    toIso: string;
  } {
    const f = from?.trim() || undefined;
    const t = to?.trim() || undefined;
    const now = this.clock.now();
    const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fromIso = f ?? defaultFrom.toISOString();
    const toIso = t ?? now.toISOString();

    const fromMs = Date.parse(fromIso);
    const toMs = Date.parse(toIso);
    if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
      throw new Error("Invalid date format: from and to must be UTC ISO 8601");
    }
    const rangeDays = (toMs - fromMs) / (24 * 60 * 60 * 1000);
    if (rangeDays > 90) {
      throw new Error("Date range must not exceed 90 days");
    }
    if (fromMs > toMs) {
      throw new Error("from must be before to");
    }

    return { fromIso, toIso };
  }

  private buildFilters(
    startIdx: number,
    projectId?: string,
    clientId?: string,
    agentId?: string
  ): { clause: string; params: string[] } {
    const conditions: string[] = [];
    const params: string[] = [];
    let idx = startIdx;
    if (projectId) {
      conditions.push(`al.project_id = $${idx}`);
      params.push(projectId);
      idx++;
    }
    if (clientId) {
      conditions.push(`al.client_id = $${idx}`);
      params.push(clientId);
      idx++;
    }
    if (agentId) {
      conditions.push(`al.agent_id = $${idx}`);
      params.push(agentId);
      idx++;
    }
    const clause =
      conditions.length > 0 ? ` AND ${conditions.join(" AND ")}` : "";
    return { clause, params };
  }

  async getOverview(
    from?: string,
    to?: string,
    projectId?: string,
    clientId?: string,
    agentId?: string
  ): Promise<AnalyticsOverview> {
    const { fromIso, toIso } = this.resolveDateRange(from, to);
    const { clause: filterClause, params: filterParams } = this.buildFilters(
      3,
      projectId,
      clientId,
      agentId
    );
    const params = [fromIso, toIso, ...filterParams];
    const baseWhereAl =
      `FROM action_logs al WHERE al.created_at >= $1::timestamptz AND al.created_at <= $2::timestamptz`;

    const [totalRes, runsRes, skillExecRes, skillBlockRes, reviewReqRes, timeGapRes, policyRes] =
      await Promise.all([
        this.pool.query<{ count: string }>(
          `SELECT COUNT(*)::text as count ${baseWhereAl}${filterClause}`,
          params
        ),
        this.pool.query<{ count: string }>(
          `SELECT COUNT(*)::text as count ${baseWhereAl} AND al.action IN ('agent.run', 'agent.executed', 'agent.executed.commit', 'agent.executed.draft_only')${filterClause}`,
          params
        ),
        this.pool.query<{ count: string }>(
          `SELECT COUNT(*)::text as count ${baseWhereAl} AND al.action = 'skill.executed'${filterClause}`,
          params
        ),
        this.pool.query<{ count: string }>(
          `SELECT COUNT(*)::text as count ${baseWhereAl} AND al.action LIKE 'skill.blocked.%'${filterClause}`,
          params
        ),
        this.pool.query<{ count: string }>(
          `SELECT COUNT(*)::text as count ${baseWhereAl} AND al.action = 'agent.blocked.review_required'${filterClause}`,
          params
        ),
        this.pool.query<{ count: string }>(
          `SELECT COUNT(*)::text as count ${baseWhereAl} AND al.action = 'TIME_GAP_DETECTED'${filterClause}`,
          params
        ),
        this.pool.query<{ count: string }>(
          `SELECT COUNT(*)::text as count ${baseWhereAl} AND (al.action = 'escalation' OR al.action = 'review.access.denied')${filterClause}`,
          params
        ),
      ]);

    const totalEvents = parseInt(totalRes.rows[0]?.count ?? "0", 10);
    const totalRuns = parseInt(runsRes.rows[0]?.count ?? "0", 10);
    const skillExecuted = parseInt(skillExecRes.rows[0]?.count ?? "0", 10);
    const skillBlocked = parseInt(skillBlockRes.rows[0]?.count ?? "0", 10);
    const reviewRequired = parseInt(reviewReqRes.rows[0]?.count ?? "0", 10);
    const timeGapDetected = parseInt(timeGapRes.rows[0]?.count ?? "0", 10);
    const policyViolations = parseInt(policyRes.rows[0]?.count ?? "0", 10);

    const skillTotal = skillExecuted + skillBlocked;
    const skillSuccessRate = skillTotal > 0 ? skillExecuted / skillTotal : 0;

    const reviewDenom = totalRuns + reviewRequired || 1;
    const reviewRate = reviewRequired / reviewDenom;

    const timeGapDenom = totalRuns + timeGapDetected || 1;
    const timeGapRate = timeGapDetected / timeGapDenom;

    return {
      totalEvents,
      totalRuns,
      skillExecuted,
      skillBlocked,
      reviewRequired,
      timeGapDetected,
      policyViolations,
      skillSuccessRate: Math.round(skillSuccessRate * 10000) / 10000,
      reviewRate: Math.round(reviewRate * 10000) / 10000,
      timeGapRate: Math.round(timeGapRate * 10000) / 10000,
    };
  }

  async getSkills(
    from?: string,
    to?: string,
    projectId?: string,
    clientId?: string,
    agentId?: string
  ): Promise<SkillStats[]> {
    const { fromIso, toIso } = this.resolveDateRange(from, to);
    const { clause: filterClause, params: filterParams } = this.buildFilters(
      3,
      projectId,
      clientId,
      agentId
    );
    const params = [fromIso, toIso, ...filterParams];
    const baseWhere = `al.created_at >= $1::timestamptz AND al.created_at <= $2::timestamptz${filterClause}`;

    const skillsRes = await this.pool.query<{
      skill_id: string;
      executed: string;
      blocked: string;
      avg_duration: string | null;
      last_seen: string | null;
    }>(
      `SELECT
        COALESCE(al.output_json->>'skillId', al.input_json->>'skillId', 'unknown') as skill_id,
        COUNT(*) FILTER (WHERE al.action = 'skill.executed')::text as executed,
        COUNT(*) FILTER (WHERE al.action LIKE 'skill.blocked.%')::text as blocked,
        AVG((al.output_json->>'skillDurationMs')::numeric) FILTER (WHERE al.action = 'skill.executed')::text as avg_duration,
        MAX(al.created_at)::text as last_seen
      FROM action_logs al
      WHERE ${baseWhere}
        AND (al.action = 'skill.executed' OR al.action LIKE 'skill.blocked.%')
      GROUP BY COALESCE(al.output_json->>'skillId', al.input_json->>'skillId')`,
      params
    );

    const result: SkillStats[] = [];
    for (const row of skillsRes.rows) {
      const skillId = row.skill_id ?? "unknown";
      const executed = parseInt(row.executed ?? "0", 10);
      const blocked = parseInt(row.blocked ?? "0", 10);

      const reasonsRes = await this.pool.query<{ reason: string; cnt: string }>(
        `SELECT COALESCE(al.reason, 'unknown') as reason, COUNT(*)::text as cnt
         FROM action_logs al
         WHERE al.created_at >= $1::timestamptz AND al.created_at <= $2::timestamptz
           AND al.action LIKE 'skill.blocked.%'
           AND (COALESCE(al.output_json->>'skillId', al.input_json->>'skillId') = $3 OR (al.output_json->>'skillId' IS NULL AND al.input_json->>'skillId' IS NULL AND $3 = 'unknown'))
         GROUP BY al.reason`,
        [fromIso, toIso, skillId]
      );

      const blockReasons = reasonsRes.rows
        .map((r) => ({ reason: r.reason ?? "unknown", count: parseInt(r.cnt, 10) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      const avgDuration =
        row.avg_duration != null ? parseFloat(row.avg_duration) : null;

      result.push({
        skillId,
        executed,
        blocked,
        blockReasons,
        avgDurationMs: avgDuration,
        lastSeenAt: row.last_seen ?? null,
      });
    }
    return result;
  }

  async getReviews(
    from?: string,
    to?: string,
    projectId?: string,
    clientId?: string
  ): Promise<ReviewsStats> {
    const { fromIso, toIso } = this.resolveDateRange(from, to);
    const conditions: string[] = [
      "created_at >= $1::timestamptz",
      "created_at <= $2::timestamptz",
    ];
    const params: (string | undefined)[] = [fromIso, toIso];
    let idx = 3;
    if (projectId) {
      conditions.push(`project_id = $${idx}`);
      params.push(projectId);
      idx++;
    }
    if (clientId) {
      conditions.push(`client_id = $${idx}`);
      params.push(clientId);
      idx++;
    }

    const where = "WHERE " + conditions.join(" AND ");

    const [statusRes, tokenRes] = await Promise.all([
      this.pool.query<{ status: string; count: string }>(
        `SELECT status, COUNT(*)::text as count FROM review_requests ${where} GROUP BY status`,
        params
      ),
      this.pool.query<{ used: string; total: string }>(
        `SELECT
          COUNT(*) FILTER (WHERE commit_token_used = true)::text as used,
          COUNT(*) FILTER (WHERE status = 'approved')::text as total
         FROM review_requests ${where}`,
        params
      ),
    ]);

    let approved = 0,
      rejected = 0,
      pending = 0;
    for (const r of statusRes.rows) {
      const c = parseInt(r.count, 10);
      if (r.status === "approved") approved = c;
      else if (r.status === "rejected") rejected = c;
      else if (r.status === "pending") pending = c;
    }
    const totalReviews = approved + rejected + pending;

    const tokenUsed = parseInt(tokenRes.rows[0]?.used ?? "0", 10);
    const approvedTotal = parseInt(tokenRes.rows[0]?.total ?? "0", 10);
    const commitConversion = approvedTotal > 0 ? tokenUsed / approvedTotal : 0;

    return {
      totalReviews,
      approved,
      rejected,
      pending,
      commitTokenUsed: tokenUsed,
      commitConversion: Math.round(commitConversion * 10000) / 10000,
    };
  }

  async getGovernance(
    from?: string,
    to?: string,
    projectId?: string,
    clientId?: string,
    agentId?: string
  ): Promise<GovernanceStats> {
    const { fromIso, toIso } = this.resolveDateRange(from, to);
    const { clause: filterClause, params: filterParams } = this.buildFilters(
      3,
      projectId,
      clientId,
      agentId
    );
    const params = [fromIso, toIso, ...filterParams];
    const baseWhere = `al.created_at >= $1::timestamptz AND al.created_at <= $2::timestamptz AND al.blocked = true${filterClause}`;

    const [blockedRes, reasonsRes, policyRes, finalRes] = await Promise.all([
      this.pool.query<{ action: string; count: string }>(
        `SELECT al.action, COUNT(*)::text as count FROM action_logs al WHERE ${baseWhere} GROUP BY al.action ORDER BY count DESC`,
        params
      ),
      this.pool.query<{ reason: string; count: string }>(
        `SELECT COALESCE(al.reason, 'unknown') as reason, COUNT(*)::text as count FROM action_logs al WHERE ${baseWhere} AND al.reason IS NOT NULL GROUP BY al.reason ORDER BY count DESC LIMIT 10`,
        params
      ),
      this.pool.query<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM action_logs al WHERE al.created_at >= $1::timestamptz AND al.created_at <= $2::timestamptz AND (al.action = 'escalation' OR al.action = 'review.access.denied')${filterClause}`,
        params
      ),
      this.pool.query<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM action_logs al WHERE al.created_at >= $1::timestamptz AND al.created_at <= $2::timestamptz AND al.action = 'decision.finalized'${filterClause}`,
        params
      ),
    ]);

    return {
      blockedByAction: blockedRes.rows.map((r) => ({
        action: r.action,
        count: parseInt(r.count, 10),
      })),
      topBlockReasons: reasonsRes.rows.map((r) => ({
        reason: r.reason,
        count: parseInt(r.count, 10),
      })),
      policyViolations: parseInt(policyRes.rows[0]?.count ?? "0", 10),
      decisionFinalizedCount: parseInt(finalRes.rows[0]?.count ?? "0", 10),
    };
  }

  async getTime(
    from?: string,
    to?: string,
    projectId?: string,
    clientId?: string,
    agentId?: string
  ): Promise<TimeStats> {
    const { fromIso, toIso } = this.resolveDateRange(from, to);
    const { clause: filterClause, params: filterParams } = this.buildFilters(
      3,
      projectId,
      clientId,
      agentId
    );
    const params = [fromIso, toIso, ...filterParams];

    const [countRes, lastRes, trendRes] = await Promise.all([
      this.pool.query<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM action_logs al WHERE al.created_at >= $1::timestamptz AND al.created_at <= $2::timestamptz AND al.action = 'TIME_GAP_DETECTED'${filterClause}`,
        params
      ),
      this.pool.query<{ last: string }>(
        `SELECT MAX(al.created_at)::text as last FROM action_logs al WHERE al.created_at >= $1::timestamptz AND al.created_at <= $2::timestamptz AND al.action = 'TIME_GAP_DETECTED'${filterClause}`,
        params
      ),
      this.pool.query<{ date: string; count: string }>(
        `SELECT date_trunc('day', al.created_at)::date::text as date, COUNT(*)::text as count
         FROM action_logs al
         WHERE al.created_at >= $1::timestamptz AND al.created_at <= $2::timestamptz AND al.action = 'TIME_GAP_DETECTED'${filterClause}
         GROUP BY date_trunc('day', al.created_at) ORDER BY date`,
        params
      ),
    ]);

    return {
      timeGapDetected: parseInt(countRes.rows[0]?.count ?? "0", 10),
      lastTimeGapAt: lastRes.rows[0]?.last ?? null,
      dailyTrend: trendRes.rows.map((r) => ({
        date: r.date,
        count: parseInt(r.count, 10),
      })),
    };
  }
}
