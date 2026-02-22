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
import { 
  validateTimestampIntegrity, 
  registerTimestampCorrectionCallback,
  timestampMonitoring,
  formatBerlinDate
} from '@agent-system/shared';
import fs from 'node:fs';

export interface DocumentHeader {
  version?: string;
  owner?: string;
  layer?: string;
  lastUpdated?: string;
  createdAt?: string; // German: "Erstellt"
  updatedAt?: string; // German: "Aktualisiert"
  definitionOfDone?: string;
}

export class DocumentHeaderValidator {
  private clock: Clock;
  private maxSkewMinutes: number;
  private staleWarningHours: number;
  private static monitoringInitialized: boolean = false;

  constructor(clock?: Clock, maxSkewMinutes?: number, staleWarningHours?: number) {
    this.clock = clock ?? new SystemClock();
    this.maxSkewMinutes = maxSkewMinutes ?? parseInt(process.env.LAST_UPDATED_MAX_SKEW_MIN ?? '5', 10);
    this.staleWarningHours = staleWarningHours ?? 24;
    
    // Register monitoring callback on first use (static to avoid duplicate registration)
    if (!DocumentHeaderValidator.monitoringInitialized) {
      registerTimestampCorrectionCallback((event) => {
        timestampMonitoring.recordCorrection(event);
      });
      DocumentHeaderValidator.monitoringInitialized = true;
    }
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

    // Validate timestamp integrity: createdAt and updatedAt (German format)
    if (header.createdAt || header.updatedAt) {
      const createdAt = header.createdAt || header.lastUpdated || '';
      const updatedAt = header.updatedAt || header.lastUpdated || '';

      if (createdAt && updatedAt) {
        // Normalize date-only strings (YYYY-MM-DD) to UTC midnight for deterministic comparison
        const normalizedCreatedAt = this.normalizeDateToUTC(createdAt);
        const normalizedUpdatedAt = this.normalizeDateToUTC(updatedAt);

        // Extract entity identifier from file path or content
        const entity = filePath || 'unknown';
        const sourceLayer = header.layer || 'unknown';

        const integrityResult = validateTimestampIntegrity(
          normalizedCreatedAt,
          normalizedUpdatedAt,
          this.clock,
          entity,
          sourceLayer
        );

        if (!integrityResult.valid) {
          reasons.push('timestamp_integrity_violation');
          // Log warnings and errors
          integrityResult.warnings.forEach(w => reasons.push(`warning: ${w}`));
          integrityResult.errors.forEach(e => reasons.push(`error: ${e}`));
        }
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
      reasons: [],
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

    // Validate timestamp integrity: createdAt and updatedAt (German format)
    if (header.createdAt || header.updatedAt) {
      const createdAt = header.createdAt || header.lastUpdated || '';
      const updatedAt = header.updatedAt || header.lastUpdated || '';

      if (createdAt && updatedAt) {
        // Normalize date-only strings (YYYY-MM-DD) to UTC midnight for deterministic comparison
        const normalizedCreatedAt = this.normalizeDateToUTC(createdAt);
        const normalizedUpdatedAt = this.normalizeDateToUTC(updatedAt);

        // Extract entity identifier from content (use first line or hash)
        const entity = content.split('\n')[0]?.substring(0, 50) || 'unknown';
        const sourceLayer = header.layer || 'unknown';

        const integrityResult = validateTimestampIntegrity(
          normalizedCreatedAt,
          normalizedUpdatedAt,
          this.clock,
          entity,
          sourceLayer
        );

        if (!integrityResult.valid) {
          reasons.push('timestamp_integrity_violation');
          // Log warnings and errors
          integrityResult.warnings.forEach(w => reasons.push(`warning: ${w}`));
          integrityResult.errors.forEach(e => reasons.push(`error: ${e}`));
        }
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
      reasons: [],
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

      // Match **Erstellt:** YYYY-MM-DD (German: "Created")
      const createdAtMatch = line.match(/\*\*Erstellt:\*\*\s*(.+)/);
      if (createdAtMatch) {
        header.createdAt = createdAtMatch[1].trim();
      }

      // Match **Aktualisiert:** YYYY-MM-DD (German: "Updated")
      const updatedAtMatch = line.match(/\*\*Aktualisiert:\*\*\s*(.+)/);
      if (updatedAtMatch) {
        header.updatedAt = updatedAtMatch[1].trim();
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
   * Normalizes a date string to UTC midnight ISO-8601 format.
   * Handles both date-only (YYYY-MM-DD) and full ISO timestamp formats.
   * Ensures deterministic comparison regardless of local timezone.
   */
  private normalizeDateToUTC(dateStr: string): string {
    // Check if it's already a full ISO timestamp (contains T and time components)
    if (dateStr.includes('T') && (dateStr.includes('Z') || dateStr.includes('+'))) {
      return dateStr; // Already a proper ISO timestamp
    }

    // Check if it's a date-only format (YYYY-MM-DD)
    const dateOnlyMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      // Return as UTC midnight ISO timestamp
      return `${year}-${month}-${day}T00:00:00.000Z`;
    }

    // For other formats, try to parse and convert to UTC
    const parsed = this.clock.parseISO(dateStr);
    if (isNaN(parsed.getTime())) {
      return dateStr; // Invalid date, return as-is for error handling
    }
    return parsed.toISOString();
  }

  /**
   * Checks if a timestamp is in valid ISO-8601 format.
   * Enforces strict format validation to prevent ambiguous date parsing.
   */
  private isValidISOTimestamp(timestamp: string): boolean {
    // Strict ISO-8601 regex: YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DD
    const isoRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
    if (!isoRegex.test(timestamp)) {
      return false;
    }

    // Additional validation: must be parseable
    const parsed = this.clock.parseISO(timestamp);
    return !isNaN(parsed.getTime());
  }

  /**
   * Validates timestamp format and checks for future timestamps.
   * Returns validation reason if invalid, null if valid.
   */
  private validateTimestamp(timestamp: string): string | null {
    // First, enforce strict ISO-8601 format
    if (!this.isValidISOTimestamp(timestamp)) {
      return 'invalid_last_updated_format';
    }

    const date = this.clock.parseISO(timestamp);

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

  /**
   * Validates that report date matches current Berlin date.
   * Used for reports that require fresh date (e.g., audit reports).
   * 
   * @param createdAt - ISO-8601 timestamp string from report header
   * @param requiresFreshDate - If true, validates date freshness (default: false)
   * @returns Validation reason if invalid, null if valid
   */
  validateReportFreshness(createdAt: string, requiresFreshDate: boolean = false): string | null {
    if (!requiresFreshDate) {
      return null; // Skip validation if not required
    }

    try {
      const createdAtDate = this.clock.parseISO(createdAt);
      if (isNaN(createdAtDate.getTime())) {
        return 'invalid_created_at_format';
      }

      const berlinToday = formatBerlinDate(this.clock.now().toISOString(), this.clock);
      const reportDate = formatBerlinDate(createdAt, this.clock);

      if (reportDate !== berlinToday) {
        return 'report_date_mismatch';
      }

      return null;
    } catch (error) {
      return 'report_date_validation_error';
    }
  }

  /**
   * Self-heals timestamp inconsistencies in document content.
   * Returns corrected content if changes were made.
   */
  selfHealTimestampIntegrity(content: string): { content: string; healed: boolean } {
    const header = this.parseHeader(content);
    
    if (!header.createdAt || !header.updatedAt) {
      return { content, healed: false };
    }

    // Extract entity identifier from content
    const entity = content.split('\n')[0]?.substring(0, 50) || 'unknown';
    const sourceLayer = header.layer || 'unknown';

    const integrityResult = validateTimestampIntegrity(
      header.createdAt, 
      header.updatedAt, 
      this.clock,
      entity,
      sourceLayer
    );
    
    if (integrityResult.valid || !integrityResult.corrected) {
      return { content, healed: false };
    }

    // Replace updatedAt with corrected value
    const corrected = integrityResult.corrected;
    const lines = content.split('\n');
    let healed = false;

    const correctedLines = lines.map(line => {
      // Match **Aktualisiert:** YYYY-MM-DD
      const updatedMatch = line.match(/(\*\*Aktualisiert:\*\*)\s*(.+)/);
      if (updatedMatch && header.updatedAt === updatedMatch[2].trim()) {
        healed = true;
        return `${updatedMatch[1]} ${corrected.updatedAt}`;
      }
      return line;
    });

    return {
      content: correctedLines.join('\n'),
      healed,
    };
  }
}

