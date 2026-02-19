/**
 * Timestamp Integrity Utility
 * 
 * Provides deterministic timestamp validation and self-healing for timestamp inconsistencies.
 * Enforces: updatedAt >= createdAt (always)
 * 
 * Source of truth: UTC ISO-8601 via Clock abstraction.
 */

import { SystemClock, type Clock } from '@agent-system/governance-v2';

export interface TimestampPair {
  createdAt: string;
  updatedAt: string;
}

export interface TimestampIntegrityResult {
  valid: boolean;
  corrected?: TimestampPair;
  warnings: string[];
  errors: string[];
}

export interface TimestampCorrectionEvent {
  entity: string;
  previous_createdAt: string;
  previous_updatedAt: string;
  corrected_updatedAt: string;
  source_layer: string;
  timestamp: string;
}

/**
 * Callback for timestamp correction events.
 * Emit this event when self-healing occurs.
 */
export type TimestampCorrectionCallback = (event: TimestampCorrectionEvent) => void;

let correctionCallback: TimestampCorrectionCallback | null = null;

/**
 * Register callback for timestamp correction events.
 * Used for monitoring and observability.
 */
export function registerTimestampCorrectionCallback(callback: TimestampCorrectionCallback): void {
  correctionCallback = callback;
}

/**
 * Validates timestamp integrity: updatedAt must be >= createdAt
 * 
 * @param createdAt - ISO-8601 timestamp string
 * @param updatedAt - ISO-8601 timestamp string
 * @param clock - Clock instance for current time reference (optional, for warnings)
 * @param entity - Entity identifier for event emission (optional)
 * @param sourceLayer - Source layer for event emission (optional)
 * @returns Validation result with corrections if needed
 */
export function validateTimestampIntegrity(
  createdAt: string,
  updatedAt: string,
  clock?: Clock,
  entity?: string,
  sourceLayer?: string
): TimestampIntegrityResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const clockForParse = clock ?? new SystemClock();

  // Parse timestamps via Clock (governance compliance)
  const createdAtDate = clockForParse.parseISO(createdAt);
  const updatedAtDate = clockForParse.parseISO(updatedAt);

  // Check if timestamps are valid
  if (isNaN(createdAtDate.getTime())) {
    errors.push(`Invalid createdAt format: ${createdAt}`);
    return { valid: false, warnings, errors };
  }

  if (isNaN(updatedAtDate.getTime())) {
    errors.push(`Invalid updatedAt format: ${updatedAt}`);
    return { valid: false, warnings, errors };
  }

    // Core integrity check: updatedAt must be >= createdAt
    if (updatedAtDate.getTime() < createdAtDate.getTime()) {
      errors.push(
        `Timestamp integrity violation: updatedAt (${updatedAt}) is before createdAt (${createdAt})`
      );
      
      // Self-healing: set updatedAt = createdAt
      const corrected: TimestampPair = {
        createdAt,
        updatedAt: createdAt, // Self-heal: updatedAt = createdAt
      };

      // Emit correction event for monitoring
      if (correctionCallback && entity && sourceLayer && clock) {
        const event: TimestampCorrectionEvent = {
          entity,
          previous_createdAt: createdAt,
          previous_updatedAt: updatedAt,
          corrected_updatedAt: corrected.updatedAt,
          source_layer: sourceLayer,
          timestamp: clock.now().toISOString(),
        };
        correctionCallback(event);
      }

      return {
        valid: false,
        corrected,
        warnings: [...warnings, 'Self-healed: updatedAt set to createdAt'],
        errors,
      };
    }

  // Optional: Warn if updatedAt is significantly in the future
  if (clock) {
    const now = clock.now();
    const futureDiff = updatedAtDate.getTime() - now.getTime();
    const futureMinutes = Math.floor(futureDiff / (1000 * 60));

    if (futureMinutes > 5) {
      warnings.push(
        `updatedAt is ${futureMinutes} minutes in the future (beyond 5 min skew tolerance)`
      );
    }
  }

  return {
    valid: true,
    warnings,
    errors,
  };
}

/**
 * Enforces timestamp integrity by correcting inconsistencies.
 * Returns corrected timestamps if needed, otherwise returns original.
 * 
 * @param createdAt - ISO-8601 timestamp string
 * @param updatedAt - ISO-8601 timestamp string
 * @returns Corrected timestamp pair
 */
export function enforceTimestampIntegrity(
  createdAt: string,
  updatedAt: string
): TimestampPair {
  const result = validateTimestampIntegrity(createdAt, updatedAt);

  if (result.valid) {
    return { createdAt, updatedAt };
  }

  if (result.corrected) {
    return result.corrected;
  }

  // Fallback: if validation failed but no correction, return original
  // (should not happen, but defensive programming)
  return { createdAt, updatedAt };
}

/**
 * Generates a new timestamp pair for document creation.
 * Both timestamps are set to current time.
 * 
 * @param clock - Clock instance (required)
 * @returns Timestamp pair with createdAt = updatedAt = now
 */
export function generateCreationTimestamps(clock: Clock): TimestampPair {
  const now = clock.now().toISOString();
  return {
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Generates updated timestamp for document modification.
 * Preserves original createdAt, sets updatedAt to current time.
 * 
 * @param originalCreatedAt - Original creation timestamp
 * @param clock - Clock instance (required)
 * @returns Timestamp pair with preserved createdAt and new updatedAt
 */
export function generateUpdateTimestamps(
  originalCreatedAt: string,
  clock: Clock
): TimestampPair {
  const now = clock.now().toISOString();
  return {
    createdAt: originalCreatedAt,
    updatedAt: now,
  };
}

