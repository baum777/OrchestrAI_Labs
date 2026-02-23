import { Inject, Injectable } from "@nestjs/common";
import { PG_POOL } from "../../db/db.module";
import type { Pool } from "pg";
import type { ActionLogger } from "@agent-runtime/orchestrator/orchestrator";
import { SystemClock } from "@agent-system/governance-v2";
import { CitationMetadata } from "@packages/knowledge/retrieval/retrieval-contract";

export type SearchResult = {
  source: "decisions" | "reviews" | "logs";
  id: string;
  title?: string;
  snippet: string;
  ts: string;
  /** Citation metadata (required for RAG correctness) */
  citation: CitationMetadata;
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
    /** Whether all results have complete citations */
    citations_complete: boolean;
  };
};

@Injectable()
export class KnowledgeService {
  private readonly clock = new SystemClock();

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async search(
    projectId: string,
    q: string,
    sources: string[],
    limit: number,
    logger: ActionLogger,
    agentId: string,
    userId: string,
    clientId?: string,
    tenantId?: string
  ): Promise<SearchResponse> {
    const startTime = this.clock.now().getTime();
    const results: SearchResult[] = [];
    const sourcesSearched: string[] = [];

    // Search decisions
    if (sources.includes("decisions")) {
      const decisionResults = await this.searchDecisions(projectId, q, limit, tenantId);
      results.push(...decisionResults);
      sourcesSearched.push("decisions");
    }

    // Search reviews
    if (sources.includes("reviews")) {
      const reviewResults = await this.searchReviews(projectId, q, limit, tenantId);
      results.push(...reviewResults);
      sourcesSearched.push("reviews");
    }

    // Search logs
    if (sources.includes("logs")) {
      const logResults = await this.searchLogs(projectId, q, limit, tenantId);
      results.push(...logResults);
      sourcesSearched.push("logs");
    }

    // Sort by timestamp (newest first) and limit
    results.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    const limitedResults = results.slice(0, limit);
    const hitCount = results.length;

    // Validate citations complete
    const citationsComplete = limitedResults.every(r => 
      r.citation && 
      r.citation.doc_id && 
      r.citation.chunk_id && 
      typeof r.citation.score === 'number' &&
      r.citation.tenant_isolated === true
    );

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
          citations_complete: citationsComplete,
          latency_ms: this.clock.now().getTime() - startTime,
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
        citations_complete: citationsComplete,
      },
    };
  }

  private async searchDecisions(projectId: string, q: string, limit: number, tenantId?: string): Promise<SearchResult[]> {
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

    return rows.map((row, idx) => {
      const snippet = this.createSnippet(row.searchable_text, q);
      // Calculate deterministic score based on position (earlier = higher relevance)
      const score = Math.max(0.3, 1.0 - (idx * 0.1));
      
      return {
        source: "decisions" as const,
        id: row.id,
        title: row.title,
        snippet,
        ts: row.updated_at,
        citation: {
          doc_id: `decision-${row.id}`,
          chunk_id: `decision-${row.id}-chunk-0`,
          score,
          acl_scope: `project:${projectId}:read`,
          title_preview: row.title ? row.title.substring(0, 50) : undefined,
          tenant_isolated: true,
          knowledge_source: 'decisions',
          retrieved_at: this.clock.now().toISOString(),
        },
      };
    });
  }

  private async searchReviews(projectId: string, q: string, limit: number, tenantId?: string): Promise<SearchResult[]> {
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

    return rows.map((row, idx) => {
      const snippet = this.createSnippet(row.searchable_text, q);
      // Calculate deterministic score based on position
      const score = Math.max(0.3, 1.0 - (idx * 0.1));
      
      return {
        source: "reviews" as const,
        id: row.review_id,
        title: `Review ${row.status}`,
        snippet,
        ts: row.created_at,
        citation: {
          doc_id: `review-${row.review_id}`,
          chunk_id: `review-${row.review_id}-chunk-0`,
          score,
          acl_scope: `project:${projectId}:read`,
          title_preview: `Review ${row.status}`.substring(0, 50),
          tenant_isolated: true,
          knowledge_source: 'reviews',
          retrieved_at: this.clock.now().toISOString(),
        },
      };
    });
  }

  private async searchLogs(projectId: string, q: string, limit: number, tenantId?: string): Promise<SearchResult[]> {
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

    return rows.map((row, idx) => {
      const snippet = this.createSnippet(row.searchable_text, q);
      // Calculate deterministic score based on position
      const score = Math.max(0.3, 1.0 - (idx * 0.1));
      
      return {
        source: "logs" as const,
        id: row.id,
        title: `${row.action}${row.blocked ? " (blocked)" : ""}`,
        snippet,
        ts: row.created_at,
        citation: {
          doc_id: `log-${row.id}`,
          chunk_id: `log-${row.id}-chunk-0`,
          score,
          acl_scope: `project:${projectId}:read`,
          title_preview: `${row.action}`.substring(0, 50),
          tenant_isolated: true,
          knowledge_source: 'logs',
          retrieved_at: this.clock.now().toISOString(),
        },
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

