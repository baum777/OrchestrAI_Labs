/**
 * Decision History Store
 * 
 * File-based append-only store for decisions.
 * Uses JSONL format (one JSON per line) for deterministic, diff-friendly storage.
 */

import type { Decision } from '../types/governance.types.js';
import fs from 'node:fs';
import path from 'node:path';
import { resolveRepoRoot } from '../utils/repo-root.js';

export interface DecisionFilter {
  layer?: string;
  owner?: string;
  since?: string; // ISO timestamp
  scopePrefix?: string;
}

export class DecisionHistoryStore {
  private readonly filePath: string;

  constructor(filePath?: string) {
    if (filePath) {
      this.filePath = filePath;
    } else {
      const repoRoot = resolveRepoRoot();
      this.filePath = path.join(repoRoot, 'ops/agent-team/team_decisions.jsonl');
    }
  }

  /**
   * Appends a decision to the history store (append-only).
   */
  async append(decision: Decision): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(this.filePath);
    await fs.promises.mkdir(dir, { recursive: true });

    // Append as JSONL (one JSON per line)
    const line = JSON.stringify(decision) + '\n';
    await fs.promises.appendFile(this.filePath, line, 'utf-8');
  }

  /**
   * Lists decisions matching the filter.
   * Returns decisions sorted by timestamp (oldest first).
   */
  async list(filter?: DecisionFilter): Promise<Decision[]> {
    if (!fs.existsSync(this.filePath)) {
      return [];
    }

    const content = await fs.promises.readFile(this.filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim() !== '');

    const decisions: Decision[] = [];

    for (const line of lines) {
      try {
        const decision = JSON.parse(line) as Decision;
        
        // Apply filters
        if (filter) {
          if (filter.layer && decision.layer !== filter.layer) {
            continue;
          }
          if (filter.owner && decision.owner !== filter.owner) {
            continue;
          }
          if (filter.since && decision.timestamp < filter.since) {
            continue;
          }
          if (filter.scopePrefix) {
            // Check if decision has scope information
            // For now, we check if decision string contains the prefix
            // This is a simplified check - can be enhanced if Decision type includes scope
            const decisionText = JSON.stringify(decision).toLowerCase();
            if (!decisionText.includes(filter.scopePrefix.toLowerCase())) {
              continue;
            }
          }
        }

        decisions.push(decision);
      } catch (error) {
        // Skip invalid lines (corrupted entries)
        console.warn(`Skipping invalid decision line: ${line.substring(0, 50)}...`, error);
      }
    }

    // Sort by timestamp (oldest first)
    return decisions.sort((a, b) => {
      const timeA = a.timestamp || a.date || '';
      const timeB = b.timestamp || b.date || '';
      return timeA.localeCompare(timeB);
    });
  }

  /**
   * Gets the latest decision by layer.
   */
  async getLatestByLayer(layer: string): Promise<Decision | null> {
    const decisions = await this.list({ layer });
    return decisions.length > 0 ? decisions[decisions.length - 1] : null;
  }

  /**
   * Gets all decisions by owner.
   */
  async getByOwner(owner: string): Promise<Decision[]> {
    return this.list({ owner });
  }

  /**
   * Gets decisions by scope path prefix.
   * Note: This is a simplified implementation that searches in decision text.
   * Can be enhanced if Decision type includes explicit scope field.
   */
  async getByScopePathPrefix(prefix: string): Promise<Decision[]> {
    return this.list({ scopePrefix: prefix });
  }
}

