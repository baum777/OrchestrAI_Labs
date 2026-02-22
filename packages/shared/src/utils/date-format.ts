/**
 * Date Formatting Utilities
 * 
 * Provides timezone-aware date formatting for display purposes.
 * Source of truth: UTC ISO-8601 via Clock abstraction.
 * Display: Berlin timezone (Europe/Berlin) for German locale.
 */

import type { Clock } from "@agent-system/governance-v2/runtime/clock";
import { SystemClock } from "@agent-system/governance-v2/runtime/clock";

/**
 * Formats a Date object to Berlin date format (DD.MM.YYYY).
 * 
 * @param date - Date object (UTC or any timezone)
 * @returns Formatted date string in Berlin timezone (e.g., "19.02.2026")
 * 
 * @example
 * ```ts
 * const utcDate = clock.parseISO("2026-02-18T23:30:00.000Z"); // UTC 23:30
 * formatBerlinDate(utcDate); // Returns "19.02.2026" (Berlin 00:30 next day)
 * ```
 * 
 * Note: This utility function accepts Date objects for formatting.
 * For production code, prefer Clock abstraction and pass Date objects from clock.now().
 */
export function formatBerlinDate(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * Formats a Date object to Berlin date-time format (DD.MM.YYYY HH:mm).
 * 
 * @param date - Date object (UTC or any timezone)
 * @returns Formatted date-time string in Berlin timezone (e.g., "19.02.2026 00:30")
 * 
 * Note: This utility function accepts Date objects for formatting.
 * For production code, prefer Clock abstraction and pass Date objects from clock.now().
 */
export function formatBerlinDateTime(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Formats an ISO-8601 timestamp string to Berlin date format.
 * 
 * @param isoString - ISO-8601 timestamp string (e.g., "2026-02-18T23:30:00.000Z")
 * @returns Formatted date string in Berlin timezone (e.g., "19.02.2026")
 * 
 * @throws Error if isoString is not a valid ISO-8601 timestamp
 * 
 * Note: Uses Clock.parseISO for governance compliance.
 * For production code, prefer passing Date objects directly to formatBerlinDate.
 */
export function formatBerlinDateFromISO(
  isoString: string,
  clock: Clock = new SystemClock()
): string {
  const date = clock.parseISO(isoString);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO-8601 timestamp: ${isoString}`);
  }
  return formatBerlinDate(date);
}

