/**
 * Constraint Enforcement
 * 
 * Enforces maxRows, allowedFields, and rejects raw SQL attempts.
 */

import type { CapabilityMap, OperationCapability } from "./capability.schema.js";

export type SanitizedParams = {
  operationId: string;
  params: Record<string, unknown>;
  constraints: {
    maxRows: number;              // Applied from capability or default (200)
    allowedFields?: string[];     // If specified, only these fields
    denyFields?: string[];        // Fields to exclude
  };
};

const FORBIDDEN_SQL_KEYWORDS = ["sql", "query", "statement", "raw"];

/**
 * Checks if payload contains raw SQL attempts.
 */
export function containsRawSql(params: unknown): boolean {
  if (typeof params !== "object" || params === null) {
    return false;
  }
  
  const obj = params as Record<string, unknown>;
  
  // Check keys (case-insensitive)
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    if (FORBIDDEN_SQL_KEYWORDS.some(kw => lowerKey.includes(kw))) {
      return true;
    }
  }
  
  // Recursively check values
  for (const value of Object.values(obj)) {
    if (typeof value === "object" && value !== null) {
      if (containsRawSql(value)) {
        return true;
      }
    } else if (typeof value === "string") {
      const lowerValue = value.toLowerCase();
      if (FORBIDDEN_SQL_KEYWORDS.some(kw => lowerValue.includes(kw))) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Applies constraints from capability map.
 */
export function applyConstraints(
  params: Record<string, unknown>,
  capability: CapabilityMap,
  operationId: string
): SanitizedParams {
  const operation = capability.operations[operationId];
  if (!operation) {
    throw new Error(`Operation ${operationId} not found in capability map`);
  }
  
  // Apply maxRows
  const defaultMaxRows = capability.defaultMaxRows ?? 200;
  const operationMaxRows = operation.maxRows ?? defaultMaxRows;
  const requestedMaxRows = typeof params.maxRows === "number" ? params.maxRows : defaultMaxRows;
  const maxRows = Math.min(requestedMaxRows, operationMaxRows, defaultMaxRows);
  
  // Extract constraints
  const allowedFields = operation.allowedFields;
  const denyFields = operation.denyFields ?? [];
  
  // Remove unknown keys if paramsSchema is defined
  let cleanedParams = { ...params };
  if (operation.paramsSchema) {
    const schemaProps = operation.paramsSchema.properties;
    cleanedParams = Object.keys(cleanedParams).reduce((acc, key) => {
      if (key in schemaProps || key === "maxRows" || key === "fields") {
        acc[key] = cleanedParams[key];
      }
      return acc;
    }, {} as Record<string, unknown>);
  }
  
  return {
    operationId,
    params: cleanedParams,
    constraints: {
      maxRows,
      allowedFields,
      denyFields,
    },
  };
}

/**
 * Validates allowedFields constraint.
 */
export function validateAllowedFields(
  requestedFields: string[] | undefined,
  allowedFields: string[] | undefined
): void {
  if (!requestedFields || !allowedFields) {
    return; // No constraint
  }
  
  const invalidFields = requestedFields.filter(f => !allowedFields.includes(f));
  if (invalidFields.length > 0) {
    throw new Error(`Fields not allowed: ${invalidFields.join(", ")}`);
  }
}

