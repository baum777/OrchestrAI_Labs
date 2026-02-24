/**
 * Rerank Interface
 *
 * Provides pluggable reranking for RAG retrieval results.
 * Default: NoOpReranker (disabled by default for deterministic behavior).
 */

import { RetrievedChunk } from '../retrieval/retrieval-contract';
import type { Clock } from '@agent-system/governance-v2/runtime/clock';
import { SystemClock } from '@agent-system/governance-v2/runtime/clock';

/**
 * Reranker interface - implement to provide custom reranking
 */
export interface Reranker {
  /** Unique identifier for this reranker */
  readonly name: string;
  
  /** Whether this reranker is enabled */
  readonly enabled: boolean;
  
  /**
   * Rerank chunks based on query relevance
   * @param query Original search query
   * @param chunks Retrieved chunks to rerank
   * @returns Reranked chunks (may be subset or reordered)
   */
  rerank(query: string, chunks: RetrievedChunk[]): Promise<RerankResult>;
}

/**
 * Rerank operation result
 */
export interface RerankResult {
  /** Reranked/reordered chunks */
  chunks: RetrievedChunk[];
  
  /** Reranking latency in ms */
  latency_ms: number;
  
  /** Whether reranking was applied */
  reranked: boolean;
  
  /** Reranker used */
  reranker_name: string;
}

/**
 * NoOp Reranker - default implementation that passes through unchanged
 * Disabled by default (enabled=false) to maintain deterministic baseline
 */
export class NoOpReranker implements Reranker {
  readonly name = 'noop';
  readonly enabled = false; // Feature flag: OFF by default
  
  async rerank(_query: string, chunks: RetrievedChunk[]): Promise<RerankResult> {
    return {
      chunks,
      latency_ms: 0,
      reranked: false,
      reranker_name: this.name,
    };
  }
}

/**
 * Score Threshold Reranker - filters chunks below minimum score
 * Disabled by default, can be enabled via configuration
 */
export class ScoreThresholdReranker implements Reranker {
  readonly name = 'score_threshold';
  readonly enabled: boolean;
  private minScore: number;
  private clock: Clock;

  constructor(minScore: number = 0.7, enabled: boolean = false, clock?: Clock) {
    this.minScore = minScore;
    this.enabled = enabled;
    this.clock = clock ?? new SystemClock();
  }

  async rerank(_query: string, chunks: RetrievedChunk[]): Promise<RerankResult> {
    if (!this.enabled) {
      return {
        chunks,
        latency_ms: 0,
        reranked: false,
        reranker_name: this.name,
      };
    }

    const startTime = this.clock.now().getTime();
    const filtered = chunks.filter(c => c.citation.score >= this.minScore);

    return {
      chunks: filtered,
      latency_ms: this.clock.now().getTime() - startTime,
      reranked: true,
      reranker_name: this.name,
    };
  }
}

/**
 * Composite Reranker - chains multiple rerankers
 */
export class CompositeReranker implements Reranker {
  readonly name: string;
  readonly enabled: boolean;
  private rerankers: Reranker[];
  
  constructor(name: string, rerankers: Reranker[], enabled: boolean = false) {
    this.name = name;
    this.rerankers = rerankers.filter(r => r.enabled);
    this.enabled = enabled && this.rerankers.length > 0;
  }
  
  async rerank(query: string, chunks: RetrievedChunk[]): Promise<RerankResult> {
    if (!this.enabled || this.rerankers.length === 0) {
      return {
        chunks,
        latency_ms: 0,
        reranked: false,
        reranker_name: this.name,
      };
    }
    
    let currentChunks = chunks;
    let totalLatency = 0;
    
    for (const reranker of this.rerankers) {
      const result = await reranker.rerank(query, currentChunks);
      currentChunks = result.chunks;
      totalLatency += result.latency_ms;
    }
    
    return {
      chunks: currentChunks,
      latency_ms: totalLatency,
      reranked: true,
      reranker_name: this.name,
    };
  }
}

/**
 * Reranker Registry - factory and registry for reranker instances
 */
export class RerankerRegistry {
  private rerankers: Map<string, Reranker> = new Map();
  private defaultReranker: Reranker;
  
  constructor() {
    // Default: NoOp (disabled)
    this.defaultReranker = new NoOpReranker();
    this.rerankers.set('noop', this.defaultReranker);
    
    // Register available rerankers (all disabled by default)
    this.rerankers.set('score_threshold', new ScoreThresholdReranker(0.7, false));
  }
  
  /**
   * Get reranker by name, or default if not found
   */
  get(name?: string): Reranker {
    if (!name) return this.defaultReranker;
    return this.rerankers.get(name) ?? this.defaultReranker;
  }
  
  /**
   * Register a custom reranker
   */
  register(reranker: Reranker): void {
    this.rerankers.set(reranker.name, reranker);
  }
  
  /**
   * Get default reranker (NoOp)
   */
  getDefault(): Reranker {
    return this.defaultReranker;
  }
  
  /**
   * List available reranker names
   */
  list(): string[] {
    return Array.from(this.rerankers.keys());
  }
}

// Global registry instance
export const rerankerRegistry = new RerankerRegistry();
