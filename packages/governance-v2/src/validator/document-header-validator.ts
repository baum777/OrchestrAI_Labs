/**
 * Document Header Validator
 * 
 * Validates governance document headers (Markdown files).
 * Checks for required fields: Version, Owner, Layer, Last Updated, Definition of Done.
 * Validates timestamp format and future timestamps.
 */

import type { ValidationResult } from '../types/governance.types.js';
import type { Clock } from '../runtime/clock.js';
import { SystemClock } from '../runtime/clock.js';
import fs from 'node:fs';

export interface DocumentHeader {
  version?: string;
  owner?: string;
  layer?: string;
  lastUpdated?: string;
  definitionOfDone?: string;
}

export class DocumentHeaderValidator {
  private clock: Clock;
  private maxSkewMinutes: number;
  private staleWarningHours: number;

  constructor(clock?: Clock, maxSkewMinutes?: number, staleWarningHours?: number) {
    this.clock = clock ?? new SystemClock();
    this.maxSkewMinutes = maxSkewMinutes ?? parseInt(process.env.LAST_UPDATED_MAX_SKEW_MIN ?? '5', 10);
    this.staleWarningHours = staleWarningHours ?? 24;
  }

  /**
   * Validates a markdown document for required governance header fields.
   * Parses the header section (first 20 lines) for required fields.
   */
  validateDocument(filePath: string): ValidationResult {
    const reasons: string[] = [];

    if (!fs.existsSync(filePath)) {
      return {
        status: 'blocked',
        reasons: ['Document file does not exist'],
        requiresReview: true,
      };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const header = this.parseHeader(content);

    // Check for required fields
    if (!header.version || header.version.trim() === '') {
      reasons.push('missing_header_version');
    }

    if (!header.owner || header.owner.trim() === '') {
      reasons.push('missing_owner');
    }

    if (!header.layer || header.layer.trim() === '') {
      reasons.push('missing_layer_tag');
    }

    if (!header.lastUpdated || header.lastUpdated.trim() === '') {
      reasons.push('missing_last_updated');
    }

    if (!header.definitionOfDone || header.definitionOfDone.trim() === '') {
      reasons.push('missing_dod');
    }

    // Validate layer value
    if (header.layer && !this.isValidLayer(header.layer)) {
      reasons.push('invalid_layer_tag');
    }

    // Validate timestamp format and future timestamps
    if (header.lastUpdated) {
      const timestampValidation = this.validateTimestamp(header.lastUpdated);
      if (timestampValidation) {
        reasons.push(timestampValidation);
      }
    }

    if (reasons.length > 0) {
      return {
        status: 'blocked',
        reasons,
        requiresReview: true,
      };
    }

    return {
      status: 'pass',
    };
  }

  /**
   * Validates document content string directly.
   */
  validateContent(content: string): ValidationResult {
    const reasons: string[] = [];
    const header = this.parseHeader(content);

    if (!header.version || header.version.trim() === '') {
      reasons.push('missing_header_version');
    }

    if (!header.owner || header.owner.trim() === '') {
      reasons.push('missing_owner');
    }

    if (!header.layer || header.layer.trim() === '') {
      reasons.push('missing_layer_tag');
    }

    if (!header.lastUpdated || header.lastUpdated.trim() === '') {
      reasons.push('missing_last_updated');
    }

    if (!header.definitionOfDone || header.definitionOfDone.trim() === '') {
      reasons.push('missing_dod');
    }

    if (header.layer && !this.isValidLayer(header.layer)) {
      reasons.push('invalid_layer_tag');
    }

    // Validate timestamp format and future timestamps
    if (header.lastUpdated) {
      const timestampValidation = this.validateTimestamp(header.lastUpdated);
      if (timestampValidation) {
        reasons.push(timestampValidation);
      }
    }

    if (reasons.length > 0) {
      return {
        status: 'blocked',
        reasons,
        requiresReview: true,
      };
    }

    return {
      status: 'pass',
    };
  }

  /**
   * Parses header section from markdown content.
   * Looks for fields in format: **Field:** value
   */
  private parseHeader(content: string): DocumentHeader {
    const header: DocumentHeader = {};
    const lines = content.split('\n').slice(0, 30); // First 30 lines

    for (const line of lines) {
      // Match **Version:** X.Y.Z
      const versionMatch = line.match(/\*\*Version:\*\*\s*(.+)/);
      if (versionMatch) {
        header.version = versionMatch[1].trim();
      }

      // Match **Owner:** @role_id
      const ownerMatch = line.match(/\*\*Owner:\*\*\s*(.+)/);
      if (ownerMatch) {
        header.owner = ownerMatch[1].trim();
      }

      // Match **Layer:** strategy | architecture | implementation | governance
      const layerMatch = line.match(/\*\*Layer:\*\*\s*(.+)/);
      if (layerMatch) {
        header.layer = layerMatch[1].trim();
      }

      // Match **Last Updated:** YYYY-MM-DD
      const lastUpdatedMatch = line.match(/\*\*Last Updated:\*\*\s*(.+)/);
      if (lastUpdatedMatch) {
        header.lastUpdated = lastUpdatedMatch[1].trim();
      }

      // Match **Definition of Done:**
      // Then capture all lines until next **Field:** or ---
      if (line.includes('**Definition of Done:**')) {
        const dodLines: string[] = [];
        const startIndex = lines.indexOf(line);
        for (let i = startIndex + 1; i < lines.length; i++) {
          const nextLine = lines[i];
          if (nextLine.match(/\*\*.*:\*\*/) || nextLine.startsWith('---')) {
            break;
          }
          dodLines.push(nextLine);
        }
        header.definitionOfDone = dodLines.join('\n').trim();
      }
    }

    return header;
  }

  /**
   * Validates layer value
   */
  private isValidLayer(layer: string): boolean {
    return ['strategy', 'architecture', 'implementation', 'governance'].includes(layer.toLowerCase());
  }

  /**
   * Validates timestamp format and checks for future timestamps.
   * Returns validation reason if invalid, null if valid.
   */
  private validateTimestamp(timestamp: string): string | null {
    // Try to parse as ISO-8601
    const date = new Date(timestamp);
    
    if (isNaN(date.getTime())) {
      return 'invalid_last_updated_format';
    }

    // Check if timestamp is in the future beyond allowed skew
    const now = this.clock.now();
    const diffMs = date.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes > this.maxSkewMinutes) {
      return 'last_updated_in_future';
    }

    return null;
  }
}

