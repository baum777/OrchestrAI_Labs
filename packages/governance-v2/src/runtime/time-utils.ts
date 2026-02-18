/**
 * Time Utilities
 * 
 * Display-only formatting utilities.
 * Source of truth remains UTC ISO-8601.
 */

/**
 * Formats a Date to Europe/Berlin timezone for display only.
 * Never used as source of truth.
 */
export function formatBerlin(dt: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(dt);
}

/**
 * Calculates the gap in minutes between two ISO-8601 timestamps.
 */
export function calculateGapMinutes(lastSeenIso: string, nowIso: string): number {
  const lastSeen = new Date(lastSeenIso);
  const now = new Date(nowIso);
  
  if (isNaN(lastSeen.getTime()) || isNaN(now.getTime())) {
    throw new Error('Invalid ISO-8601 timestamp');
  }
  
  const diffMs = now.getTime() - lastSeen.getTime();
  return Math.floor(diffMs / (1000 * 60));
}

