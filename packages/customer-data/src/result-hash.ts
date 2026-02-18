/**
 * Result Hash Generation
 * 
 * Deterministic hash generation for replay verification.
 * Excludes PII fields.
 */

import crypto from "node:crypto";

/**
 * Generates deterministic hash of result data.
 * Excludes PII fields and normalizes structure.
 * 
 * @param data - Result data to hash
 * @param excludeFields - Fields to exclude from hash (PII, sensitive data)
 * @returns SHA256 hash (hex string)
 */
export function generateResultHash(
  data: unknown,
  excludeFields?: string[]
): string {
  const cleaned = excludePII(data, excludeFields);
  const normalized = normalizeForHash(cleaned);
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Excludes PII and sensitive fields from data.
 */
function excludePII(data: unknown, excludeFields?: string[]): unknown {
  if (!excludeFields || excludeFields.length === 0) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => excludePII(item, excludeFields));
  }
  
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    const cleaned: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (!excludeFields.includes(key)) {
        cleaned[key] = excludePII(value, excludeFields);
      }
    }
    
    return cleaned;
  }
  
  return data;
}

/**
 * Normalizes data structure for deterministic hashing.
 * Sorts object keys, handles arrays consistently.
 */
function normalizeForHash(data: unknown): string {
  if (data === null || data === undefined) {
    return "null";
  }
  
  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
    return String(data);
  }
  
  if (Array.isArray(data)) {
    const normalized = data.map(normalizeForHash);
    return `[${normalized.join(",")}]`;
  }
  
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const pairs = keys.map(key => `${key}:${normalizeForHash(obj[key])}`);
    return `{${pairs.join(",")}}`;
  }
  
  return String(data);
}

