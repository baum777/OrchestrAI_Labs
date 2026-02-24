/**
 * Retrieval Contract
 *
 * Defines the citation metadata required for all RAG retrievals.
 * Ensures deterministic, auditable knowledge usage.
 */

import type { Clock } from '@agent-system/governance-v2/runtime/clock';

/**
 * Citation metadata attached to every retrieved chunk
 */
export interface CitationMetadata {
  /** Unique document identifier */
  doc_id: string;
  
  /** Chunk identifier within document */
  chunk_id: string;
  
  /** Retrieval relevance score (0.0 - 1.0) */
  score: number;
  
  /** ACL scope for this chunk */
  acl_scope: string;
  
  /** Document title (truncated, no PII) */
  title_preview?: string;
  
  /** Chunk position in document */
  position?: {
    page?: number;
    start_line?: number;
    end_line?: number;
  };
  
  /** Retrieval timestamp (deterministic from clock) */
  retrieved_at: string;
  
  /** Source knowledge base */
  knowledge_source: 'decisions' | 'reviews' | 'logs' | 'documents' | 'vector_store';
  
  /** Tenant isolation verified flag */
  tenant_isolated: boolean;
}

/**
 * A retrieved chunk with full citation metadata
 */
export interface RetrievedChunk {
  /** Chunk content (sanitized) */
  content: string;
  
  /** Citation metadata */
  citation: CitationMetadata;
  
  /** Original query that produced this chunk */
  query: string;
}

/**
 * Retrieval result containing chunks and summary metadata
 */
export interface RetrievalResult {
  /** Retrieved chunks ordered by relevance */
  chunks: RetrievedChunk[];
  
  /** Total chunks available (before limit) */
  total_available: number;
  
  /** Query used for retrieval */
  query: string;
  
  /** Retrieval latency in ms */
  latency_ms: number;
  
  /** Whether citations are complete for all chunks */
  citations_complete: boolean;
  
  /** Any warnings (missing citations, etc.) */
  warnings?: string[];
}

/**
 * Retrieval options
 */
export interface RetrievalOptions {
  /** Maximum chunks to return */
  limit?: number;
  
  /** Minimum relevance score threshold */
  min_score?: number;
  
  /** Tenant ID for isolation */
  tenant_id: string;
  
  /** User ID for ACL checks */
  user_id?: string;
  
  /** Sources to search (allowlist) */
  sources?: Array<'decisions' | 'reviews' | 'logs' | 'documents'>;
  
  /** Require citations in result */
  require_citations?: boolean;
}

/**
 * Contract validation functions
 */
export class RetrievalContract {
  /**
   * Validate that all chunks have complete citations
   */
  static validateCitations(result: RetrievalResult): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!result.chunks || result.chunks.length === 0) {
      return { valid: true, errors }; // Empty result is valid
    }

    for (const chunk of result.chunks) {
      if (!chunk.citation) {
        errors.push(`Missing citation for chunk from query: ${result.query}`);
        continue;
      }

      const citation = chunk.citation;

      // Required fields
      if (!citation.doc_id || citation.doc_id.trim() === '') {
        errors.push('Missing required field: doc_id');
      }
      if (!citation.chunk_id || citation.chunk_id.trim() === '') {
        errors.push('Missing required field: chunk_id');
      }
      if (typeof citation.score !== 'number' || citation.score < 0 || citation.score > 1) {
        errors.push(`Invalid score: ${citation.score} (must be 0.0-1.0)`);
      }
      if (!citation.acl_scope || citation.acl_scope.trim() === '') {
        errors.push('Missing required field: acl_scope');
      }
      if (citation.tenant_isolated !== true) {
        errors.push('Tenant isolation not verified');
      }

      // Format validation
      if (citation.doc_id.length > 256) {
        errors.push('doc_id exceeds max length (256)');
      }
      if (citation.chunk_id.length > 256) {
        errors.push('chunk_id exceeds max length (256)');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Check for cross-tenant leakage
   */
  static validateTenantIsolation(result: RetrievalResult, expectedTenantId: string): { isolated: boolean; violations: string[] } {
    const violations: string[] = [];

    for (const chunk of result.chunks) {
      if (!chunk.citation.tenant_isolated) {
        violations.push(`Chunk ${chunk.citation.chunk_id} lacks tenant isolation verification`);
      }
      
      // Check doc_id doesn't contain other tenant references (basic heuristic)
      if (chunk.citation.doc_id.includes('tenant-') && !chunk.citation.doc_id.includes(expectedTenantId)) {
        violations.push(`Potential cross-tenant reference in doc_id: ${chunk.citation.doc_id}`);
      }
    }

    return { isolated: violations.length === 0, violations };
  }

  /**
   * Create a deterministic citation hash for audit logging
   */
  static createAuditHash(chunk: RetrievedChunk): string {
    const data = `${chunk.citation.doc_id}:${chunk.citation.chunk_id}:${chunk.citation.retrieved_at}`;
    return `audit-${Buffer.from(data).toString('base64').substring(0, 16)}`;
  }
}

/**
 * Default citation fields for mock/placeholder chunks
 */
export const createDefaultCitation = (
  docId: string,
  chunkId: string,
  tenantId: string,
  score: number = 0.5,
  clock: Clock
): CitationMetadata => ({
  doc_id: docId,
  chunk_id: chunkId,
  score,
  acl_scope: `tenant:${tenantId}:read`,
  tenant_isolated: true,
  knowledge_source: 'documents',
  retrieved_at: clock.now().toISOString(),
});
