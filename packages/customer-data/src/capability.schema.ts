/**
 * Capability Map Schema
 * 
 * Defines allowed operations, constraints, and source mappings per clientId.
 */

export type CapabilityMap = {
  clientId: string;
  operations: Record<string, OperationCapability>;
  defaultMaxRows?: number;  // Override global default (200), can only be lower
  sources?: Record<string, SourceConfig>;  // Source configurations for multi-source
};

export type OperationCapability = {
  operationId: string;
  description?: string;
  source: string;                  // Required: source identifier (postgres, rest_crm, etc.)
  allowedFields?: string[];         // If specified, only these fields can be requested
  denyFields?: string[];           // Fields to always exclude
  maxRows?: number;                // Override for this operation (can only be lower than default)
  paramsSchema?: OperationSchema;
};

export type OperationSchema = {
  type: "object";
  properties: Record<string, {
    type: string;
    required?: boolean;
    enum?: string[];
    minLength?: number;
    format?: string;
  }>;
};

export type SourceConfig = {
  type: ConnectorType;
  config: Record<string, unknown>;
  healthCheck?: {
    endpoint?: string;
    intervalMs?: number;
  };
};

export type ConnectorType = 
  | "postgres"
  | "rest_api"
  | "graphql"
  | "custom";

/**
 * Validates capability map structure.
 */
export function validateCapabilityMap(capability: unknown): capability is CapabilityMap {
  if (typeof capability !== "object" || capability === null) {
    return false;
  }
  
  const cap = capability as Record<string, unknown>;
  
  if (typeof cap.clientId !== "string") {
    return false;
  }
  
  if (typeof cap.operations !== "object" || cap.operations === null) {
    return false;
  }
  
  // Validate operations
  for (const [key, op] of Object.entries(cap.operations)) {
    if (typeof op !== "object" || op === null) {
      return false;
    }
    const operation = op as Record<string, unknown>;
    if (typeof operation.operationId !== "string" || operation.operationId !== key) {
      return false;
    }
    if (typeof operation.source !== "string") {
      return false;
    }
  }
  
  return true;
}

