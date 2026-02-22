/**
 * Date Formatting Utilities
 *
 * Provides timezone-aware date formatting for display purposes.
 * Source of truth: UTC ISO-8601 via Clock abstraction.
 * Display: Berlin timezone (Europe/Berlin) for German locale.
 *
 * All public functions accept ISO string + Clock (no Date in signatures).
 */

import type { Clock } from "@agent-system/governance-v2/runtime/clock";
import { SystemClock } from "@agent-system/governance-v2/runtime/clock";

/**
 * Formats an ISO-8601 timestamp to Berlin date format (DD.MM.YYYY).
 *
 * @param iso - ISO-8601 timestamp string (e.g., "2026-02-18T23:30:00.000Z")
 * @param clock - Clock for parsing (use SystemClock or FakeClock in tests)
 * @returns Formatted date string in Berlin timezone (e.g., "19.02.2026")
 *
 * @example
 * ```ts
 * formatBerlinDate("2026-02-18T23:30:00.000Z", clock); // Returns "19.02.2026" (Berlin 00:30 next day)
 * ```
 */
export function formatBerlinDate(iso: string, clock: Clock = new SystemClock()): string {
  const date = clock.parseISO(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO-8601 timestamp: ${iso}`);
  }
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * Formats an ISO-8601 timestamp to Berlin date-time format (DD.MM.YYYY HH:mm).
 *
 * @param iso - ISO-8601 timestamp string (e.g., "2026-02-18T23:30:00.000Z")
 * @param clock - Clock for parsing (use SystemClock or FakeClock in tests)
 * @returns Formatted date-time string in Berlin timezone (e.g., "19.02.2026 00:30")
 */
export function formatBerlinDateTime(iso: string, clock: Clock = new SystemClock()): string {
  const date = clock.parseISO(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO-8601 timestamp: ${iso}`);
  }
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
 * Alias for formatBerlinDate for backward compatibility.
 *
 * @param isoString - ISO-8601 timestamp string (e.g., "2026-02-18T23:30:00.000Z")
 * @param clock - Clock for parsing (default: SystemClock)
 * @returns Formatted date string in Berlin timezone (e.g., "19.02.2026")
 */
export function formatBerlinDateFromISO(
  isoString: string,
  clock: Clock = new SystemClock()
): string {
  return formatBerlinDate(isoString, clock);
}

