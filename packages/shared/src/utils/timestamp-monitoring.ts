/**
 * Timestamp Correction Monitoring
 * 
 * Tracks timestamp correction events for observability and governance review.
 * Implements timestamp_correction_rate metric.
 */

import type { TimestampCorrectionEvent } from './timestamp-integrity.js';

export interface TimestampCorrectionMetrics {
  totalCorrections: number;
  correctionsByLayer: Record<string, number>;
  correctionsByEntity: Record<string, number>;
  lastCorrection?: TimestampCorrectionEvent;
  correctionRate: number; // Corrections per hour (if time window provided)
}

class TimestampMonitoring {
  private corrections: TimestampCorrectionEvent[] = [];
  private readonly maxHistory = 10000; // Keep last 10k corrections

  /**
   * Record a timestamp correction event.
   */
  recordCorrection(event: TimestampCorrectionEvent): void {
    this.corrections.push(event);
    
    // Trim history if too large
    if (this.corrections.length > this.maxHistory) {
      this.corrections = this.corrections.slice(-this.maxHistory);
    }
  }

  /**
   * Get correction metrics for a time window.
   * @param from - Start time (ISO-8601)
   * @param to - End time (ISO-8601)
   */
  getMetrics(from?: string, to?: string): TimestampCorrectionMetrics {
    let filtered = this.corrections;

    if (from || to) {
      const fromDate = from ? new Date(from) : new Date(0);
      const toDate = to ? new Date(to) : new Date();
      
      filtered = this.corrections.filter((e) => {
        const eventDate = new Date(e.timestamp);
        return eventDate >= fromDate && eventDate <= toDate;
      });
    }

    const correctionsByLayer: Record<string, number> = {};
    const correctionsByEntity: Record<string, number> = {};

    for (const event of filtered) {
      correctionsByLayer[event.source_layer] = (correctionsByLayer[event.source_layer] || 0) + 1;
      correctionsByEntity[event.entity] = (correctionsByEntity[event.entity] || 0) + 1;
    }

    // Calculate correction rate (corrections per hour)
    let correctionRate = 0;
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      const hours = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60);
      if (hours > 0) {
        correctionRate = filtered.length / hours;
      }
    }

    return {
      totalCorrections: filtered.length,
      correctionsByLayer,
      correctionsByEntity,
      lastCorrection: filtered[filtered.length - 1],
      correctionRate,
    };
  }

  /**
   * Check if correction rate exceeds threshold.
   * @param threshold - Maximum corrections per hour (default: 10)
   * @param from - Start time (ISO-8601)
   * @param to - End time (ISO-8601)
   */
  exceedsThreshold(threshold: number = 10, from?: string, to?: string): boolean {
    const metrics = this.getMetrics(from, to);
    return metrics.correctionRate > threshold;
  }

  /**
   * Clear all correction history.
   */
  clear(): void {
    this.corrections = [];
  }
}

// Singleton instance
export const timestampMonitoring = new TimestampMonitoring();

