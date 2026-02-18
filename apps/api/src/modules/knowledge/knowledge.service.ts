import { Inject, Injectable } from "@nestjs/common";
import { PG_POOL } from "../../db/db.module";
import type { Pool } from "pg";
import type { ActionLogger } from "@agent-runtime/orchestrator/orchestrator";
import type { Clock } from "@agent-system/governance-v2/runtime/clock";
import { SystemClock } from "@agent-system/governance-v2/runtime/clock";

export type SearchResult = {
  source: "decisions" | "reviews" | "logs";
  id: string;
  title?: string;
  snippet: string;
  ts: string;
};

export type SearchResponse = {
  range: null;
  query: {
    projectId: string;
    q: string;
    sources: string[];
    limit: number;
  };
  results: SearchResult[];
  meta: {
    hitCount: number;
    returned: number;
  };
};

@Injectable()
export class KnowledgeService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async search(
    projectId: string,
    q: string,
    sources: string[],
    limit: number,
    logger: ActionLogger,
    agentId: string,
    userId: string,
    clientId?: string
  ): Promise<SearchResponse> {
    const results: SearchResult[] = [];
    const sourcesSearched: string[] = [];

    // Search decisions
    if (sources.includes("decisions")) {
      const decisionResults = await this.searchDecisions(projectId, q, limit);
      results.push(...decisionResults);
      sourcesSearched.push("decisions");
    }

    // Search reviews
    if (sources.includes("reviews")) {
      const reviewResults = await this.searchReviews(projectId, q, limit);
      results.push(...reviewResults);
      sourcesSearched.push("reviews");
    }

    // Search logs
    if (sources.includes("logs")) {
      const logResults = await this.searchLogs(projectId, q, limit);
      results.push(...logResults);
      sourcesSearched.push("logs");
    }

    // Sort by timestamp (newest first) and limit
    results.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    const limitedResults = results.slice(0, limit);
    const hitCount = results.length;

    // Audit logging (required - blocks search if fails)
    try {
      await logger.append({
        agentId,
        userId,
        projectId,
        clientId,
        action: "knowledge.search",
        input: { projectId, q, sources, limit },
        output: {
          hitCount,
          returned: limitedResults.length,
          sourcesSearched,
        },
        ts: this.clock.now().toISOString(),
        blocked: false,
      });
    } catch (error) {
      throw new Error(
        `AUDIT_LOG_WRITE_FAILED: Cannot complete search without audit log. ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return {
      range: null,
      query: {
        projectId,
        q,
        sources,
        limit,
      },
      results: limitedResults,
      meta: {
        hitCount,
        returned: limitedResults.length,
      },
    };
  }

  private async searchDecisions(projectId: string, q: string, limit: number): Promise<SearchResult[]> {
    const searchTerm = `%${q}%`;
    const { rows } = await this.pool.query<{
      id: string;
      title: string;
      updated_at: string;
      searchable_text: string;
    }>(
      `
      SELECT
        id,
        title,
        updated_at,
        CONCAT(
          COALESCE(title, ''),
          ' ',
          COALESCE(goal, ''),
          ' ',
          COALESCE(client_context, ''),
          ' ',
          COALESCE(comms_context, ''),
          ' ',
          COALESCE(client_implications, ''),
          ' ',
          COALESCE(derivation, ''),
          ' ',
          COALESCE(assumptions::text, ''),
          ' ',
          COALESCE(risks::text, ''),
          ' ',
          COALESCE(next_steps::text, '')
        ) as searchable_text
      FROM decisions
      WHERE project_id = $1
        AND (
          title ILIKE $2
          OR goal ILIKE $2
          OR client_context ILIKE $2
          OR comms_context ILIKE $2
          OR client_implications ILIKE $2
          OR derivation ILIKE $2
          OR assumptions::text ILIKE $2
          OR risks::text ILIKE $2
          OR next_steps::text ILIKE $2
        )
      ORDER BY updated_at DESC
      LIMIT $3
      `,
      [projectId, searchTerm, limit]
    );

    return rows.map((row) => {
      const snippet = this.createSnippet(row.searchable_text, q);
      return {
        source: "decisions" as const,
        id: row.id,
        title: row.title,
        snippet,
        ts: row.updated_at,
      };
    });
  }

  private async searchReviews(projectId: string, q: string, limit: number): Promise<SearchResult[]> {
    const searchTerm = `%${q}%`;
    const { rows } = await this.pool.query<{
      review_id: string;
      status: string;
      created_at: string;
      comment: string | null;
      searchable_text: string;
    }>(
      `
      SELECT DISTINCT
        rr.id as review_id,
        rr.status,
        COALESCE(rr.resolved_at, rr.created_at) as created_at,
        ra.comment,
        CONCAT(
          COALESCE(rr.status, ''),
          ' ',
          COALESCE(ra.comment, '')
        ) as searchable_text
      FROM review_requests rr
      LEFT JOIN review_actions ra ON rr.id = ra.review_id
      WHERE rr.project_id = $1
        AND (
          rr.status ILIKE $2
          OR ra.comment ILIKE $2
        )
      ORDER BY COALESCE(rr.resolved_at, rr.created_at) DESC
      LIMIT $3
      `,
      [projectId, searchTerm, limit]
    );

    return rows.map((row) => {
      const snippet = this.createSnippet(row.searchable_text, q);
      return {
        source: "reviews" as const,
        id: row.review_id,
        title: `Review ${row.status}`,
        snippet,
        ts: row.created_at,
      };
    });
  }

  private async searchLogs(projectId: string, q: string, limit: number): Promise<SearchResult[]> {
    const searchTerm = `%${q}%`;
    const { rows } = await this.pool.query<{
      id: string;
      action: string;
      blocked: boolean;
      reason: string | null;
      created_at: string;
      searchable_text: string;
    }>(
      `
      SELECT
        id::text,
        action,
        blocked,
        reason,
        created_at,
        CONCAT(
          COALESCE(action, ''),
          ' ',
          COALESCE(reason, '')
        ) as searchable_text
      FROM action_logs
      WHERE project_id = $1
        AND (
          action ILIKE $2
          OR reason ILIKE $2
        )
      ORDER BY created_at DESC
      LIMIT $3
      `,
      [projectId, searchTerm, limit]
    );

    return rows.map((row) => {
      const snippet = this.createSnippet(row.searchable_text, q);
      return {
        source: "logs" as const,
        id: row.id,
        title: `${row.action}${row.blocked ? " (blocked)" : ""}`,
        snippet,
        ts: row.created_at,
      };
    });
  }

  private createSnippet(text: string, query: string, maxLength: number = 160): string {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) {
      return text.substring(0, maxLength).trim() + (text.length > maxLength ? "..." : "");
    }

    const start = Math.max(0, index - 40);
    const end = Math.min(text.length, index + query.length + 40);
    let snippet = text.substring(start, end);

    if (start > 0) snippet = "..." + snippet;
    if (end < text.length) snippet = snippet + "...";

    return snippet.substring(0, maxLength).trim();
  }
}

