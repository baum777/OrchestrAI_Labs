/**
 * Customer Data Plane Providers
 * 
 * Factory functions for PolicyEngine, ConnectorRegistry, and CapabilityRegistry.
 */

import { PolicyEngine } from "@governance/policy/policy-engine";
import { SystemClock } from "@agent-system/governance-v2/runtime/clock";
import {
  InMemoryMultiSourceConnectorRegistry,
  InMemoryCapabilityRegistry,
  type MultiSourceConnectorRegistry,
  type CapabilityRegistry,
} from "@agent-system/customer-data";

/**
 * Create PolicyEngine instance.
 */
export function createPolicyEngine(): PolicyEngine {
  return new PolicyEngine(new SystemClock());
}

/**
 * Create MultiSourceConnectorRegistry instance.
 */
export function createConnectorRegistry(): MultiSourceConnectorRegistry {
  return new InMemoryMultiSourceConnectorRegistry();
}

/**
 * Create CapabilityRegistry instance.
 */
export function createCapabilityRegistry(): CapabilityRegistry {
  return new InMemoryCapabilityRegistry();
}

