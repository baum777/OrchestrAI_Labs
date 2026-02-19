/**
 * Report Generator
 * 
 * Generates governance reports with correct Berlin date formatting.
 * Ensures no UTC date-only slicing and fresh clock usage.
 */

import { SystemClock, type Clock } from '@agent-system/governance-v2/runtime/clock';
import { formatBerlinDate, formatBerlinDateFromISO } from '@agent-system/shared';
import fs from 'node:fs';
import path from 'node:path';

export interface ReportMetadata {
  title: string;
  version: string;
  owner: string;
  layer: string;
  auditor?: string;
  scope?: string;
  requiresFreshDate?: boolean;
}

export class ReportGenerator {
  private clock: Clock;
  private lastClockRefreshISO: string;
  private readonly TIME_GAP_THRESHOLD_MS = 50 * 60 * 1000; // 50 minutes

  constructor(clock?: Clock) {
    this.clock = clock ?? new SystemClock();
    this.lastClockRefreshISO = this.clock.now().toISOString();
  }

  /**
   * Ensures clock is fresh (not stale after time gap).
   * Refreshes clock if gap >= 50 minutes.
   */
  private ensureFreshClock(): void {
    const now = this.clock.now();
    const nowISO = now.toISOString();
    // eslint-disable-next-line no-restricted-globals
    const gapMs = new Date(nowISO).getTime() - new Date(this.lastClockRefreshISO).getTime();
    
    if (gapMs >= this.TIME_GAP_THRESHOLD_MS) {
      // Refresh clock after time gap
      this.clock = new SystemClock();
      this.lastClockRefreshISO = this.clock.now().toISOString();
    }
  }

  /**
   * Generates report header with correct Berlin date.
   * 
   * @param metadata - Report metadata
   * @returns Report header string
   */
  generateHeader(metadata: ReportMetadata): string {
    // Ensure fresh clock (no stale clock)
    this.ensureFreshClock();
    
    // Get current time (UTC ISO with time)
    const now = this.clock.now();
    const createdAt = now.toISOString();
    
    // Format Berlin date for display
    const berlinDate = formatBerlinDate(now);
    
    // Build header
    const lines: string[] = [];
    lines.push(`# ${metadata.title}`);
    lines.push('');
    lines.push(`**Datum:** ${berlinDate}`);
    
    if (metadata.auditor) {
      lines.push(`**Auditor:** ${metadata.auditor}`);
    }
    
    if (metadata.scope) {
      lines.push(`**Scope:** ${metadata.scope}`);
    }
    
    lines.push(`**Version:** ${metadata.version}`);
    lines.push(`**Owner:** ${metadata.owner}`);
    lines.push(`**Layer:** ${metadata.layer}`);
    lines.push(`**Erstellt:** ${createdAt}`);
    lines.push(`**Aktualisiert:** ${createdAt}`);
    
    if (metadata.requiresFreshDate) {
      lines.push(`**Requires Fresh Date:** true`);
    }
    
    lines.push('');
    lines.push('---');
    lines.push('');
    
    return lines.join('\n');
  }

  /**
   * Generates full report with header and content.
   * 
   * @param metadata - Report metadata
   * @param content - Report content (body)
   * @returns Full report string
   */
  generateReport(metadata: ReportMetadata, content: string): string {
    const header = this.generateHeader(metadata);
    return header + content;
  }

  /**
   * Generates report and writes to file.
   * 
   * @param filePath - Output file path
   * @param metadata - Report metadata
   * @param content - Report content
   */
  generateReportFile(
    filePath: string,
    metadata: ReportMetadata,
    content: string
  ): void {
    const report = this.generateReport(metadata, content);
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, report, 'utf-8');
  }

  /**
   * Updates existing report with fresh timestamp.
   * Preserves original createdAt if present.
   * 
   * @param filePath - Report file path
   * @param newContent - Updated content
   */
  updateReport(filePath: string, newContent: string): void {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Report file not found: ${filePath}`);
    }

    // Ensure fresh clock
    this.ensureFreshClock();
    
    const existingContent = fs.readFileSync(filePath, 'utf-8');
    
    // Generate new updatedAt
    const now = this.clock.now();
    const updatedAt = now.toISOString();
    const berlinDate = formatBerlinDate(now);
    
    // Update header
    let updatedContent = existingContent;
    
    // Update Datum
    updatedContent = updatedContent.replace(
      /\*\*Datum:\*\*\s*.+/,
      `**Datum:** ${berlinDate}`
    );
    
    // Update Aktualisiert (preserve Erstellt if exists)
    updatedContent = updatedContent.replace(
      /\*\*Aktualisiert:\*\*\s*.+/,
      `**Aktualisiert:** ${updatedAt}`
    );
    
    // Update content if provided
    if (newContent) {
      const headerEnd = updatedContent.indexOf('---', updatedContent.indexOf('---') + 3);
      if (headerEnd !== -1) {
        updatedContent = updatedContent.substring(0, headerEnd + 3) + '\n\n' + newContent;
      }
    }
    
    fs.writeFileSync(filePath, updatedContent, 'utf-8');
  }
}

