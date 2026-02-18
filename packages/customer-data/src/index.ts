/**
 * Customer Data Plane Package
 * 
 * Provides interfaces and implementations for customer data access:
 * - CustomerConnector (transport abstraction)
 * - ConnectorRegistry (single and multi-source)
 * - CapabilityRegistry (operation allowlisting)
 * - Constraint enforcement
 * - Result hash generation
 */

export type {
  CustomerConnector,
  ReadConstraints,
  ReadModelResult,
  HealthStatus,
} from "./connector.js";

export type {
  CapabilityMap,
  OperationCapability,
  OperationSchema as CapabilityOperationSchema,
  SourceConfig,
  ConnectorType,
} from "./capability.schema.js";

export {
  validateCapabilityMap,
} from "./capability.schema.js";

export type {
  ConnectorRegistry,
  MultiSourceConnectorRegistry,
  CapabilityRegistry,
  OperationSchema,
} from "./registry.js";

export {
  InMemoryMultiSourceConnectorRegistry,
  InMemoryCapabilityRegistry,
} from "./registry.js";

export type {
  SanitizedParams,
} from "./constraints.js";

export {
  containsRawSql,
  applyConstraints,
  validateAllowedFields,
} from "./constraints.js";

export {
  generateResultHash,
} from "./result-hash.js";

