/**
 * CustomerConnector Interface
 * 
 * Transport abstraction for customer data access.
 * Supports multiple backends: PostgreSQL, REST API, GraphQL, custom.
 */

export interface CustomerConnector {
  /**
   * Execute a read-only operation identified by operationId.
   * @param operationId - Must be allowlisted in CapabilityRegistry
   * @param params - Operation-specific parameters (validated against capability schema)
   * @param constraints - Runtime constraints (maxRows, allowedFields)
   * @returns ReadModelResult with data, metadata, and execution metrics
   */
  executeReadModel(
    operationId: string,
    params: Record<string, unknown>,
    constraints: ReadConstraints
  ): Promise<ReadModelResult>;

  /**
   * Health check for connector.
   * @returns Health status
   */
  health(): Promise<HealthStatus>;
}

export type ReadConstraints = {
  maxRows: number;           // Default 200, capability can override lower
  allowedFields?: string[];  // If specified, only these fields returned
};

export type ReadModelResult = {
  data: unknown[];           // Array of result rows/objects
  metadata: {
    rowCount: number;        // Actual rows returned
    fieldsReturned: string[]; // Field names in result
    sourceType: string;      // e.g., "postgres", "rest_api", "graphql"
  };
  executionMetrics: {
    latencyMs: number;       // Execution time in milliseconds
  };
};

export type HealthStatus = {
  healthy: boolean;
  latencyMs?: number;
  error?: string;
  lastChecked?: string;
};

