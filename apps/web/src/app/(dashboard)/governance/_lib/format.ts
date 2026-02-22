/**
 * Format Utilities for Governance Dashboard
 * String-only formatting, no Date objects
 */

// No unused imports

/**
 * Format status to display color
 * Maps various status values to display categories
 */
export function getStatusColor(status: string): "green" | "yellow" | "red" | "gray" {
  switch (status) {
    case "success":
    case "ok":
      return "green";
    case "warning":
      return "yellow";
    case "error":
      return "red";
    case "unknown":
    case "pending":
    default:
      return "gray";
  }
}

/**
 * Format status to German label
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case "success":
      return "Erfolgreich";
    case "ok":
      return "OK";
    case "warning":
      return "Warnung";
    case "error":
      return "Fehler";
    case "unknown":
      return "Unbekannt";
    case "pending":
      return "Ausstehend";
    default:
      return status;
  }
}

/**
 * Format ISO timestamp to readable string
 * Displays ISO string as-is, no Date parsing
 */
export function formatTimestamp(isoString: string): string {
  // Display ISO string directly without Date parsing
  // Format: 2026-02-22T14:30:00.000Z -> 2026-02-22 14:30:00 UTC
  if (!isoString || typeof isoString !== "string") {
    return "Ungültig";
  }

  try {
    // Simple string manipulation, no Date object creation
    const parts = isoString.split("T");
    if (parts.length !== 2) {
      return isoString;
    }

    const date = parts[0];
    const timeWithZone = parts[1];
    const time = timeWithZone.replace(/\.\d+Z$/, "");

    return `${date} ${time} UTC`;
  } catch {
    return isoString;
  }
}

/**
 * Format duration in milliseconds to readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = Math.round(ms / 100) / 10;
  return `${seconds}s`;
}

/**
 * Format success rate percentage
 */
export function formatSuccessRate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

/**
 * Format count with German pluralization
 */
export function formatCount(count: number, singular: string, plural: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 3) + "...";
}
