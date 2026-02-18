/**
 * Customer Data Plane Providers
 * 
 * Factory functions for PolicyEngine, ConnectorRegistry, and CapabilityRegistry.
 */

import { PolicyEngine } from "@governance/policy/policy-engine";
import { SystemClock } from "@agent-system/governance-v2/runtime/clock";
import { InMemoryLicenseManager, type LicenseManager } from "@governance/license/license-manager";
import {
  InMemoryMultiSourceConnectorRegistry,
  InMemoryCapabilityRegistry,
  type MultiSourceConnectorRegistry,
  type CapabilityRegistry,
} from "@agent-system/customer-data";

/**
 * Create LicenseManager instance.
 */
export function createLicenseManager(): LicenseManager {
  return new InMemoryLicenseManager();
}

/**
 * Create PolicyEngine instance with LicenseManager.
 */
export function createPolicyEngine(licenseManager?: LicenseManager): PolicyEngine {
  return new PolicyEngine(new SystemClock(), licenseManager);
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

