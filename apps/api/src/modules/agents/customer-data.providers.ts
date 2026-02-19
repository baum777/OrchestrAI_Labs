/**
 * Customer Data Plane Providers
 * 
 * Factory functions for PolicyEngine, ConnectorRegistry, and CapabilityRegistry.
 */

import { PolicyEngine, type ConsentStore } from "@governance/policy/policy-engine";
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
 * Create PolicyEngine instance with LicenseManager, ConsentStore, and PermissionResolver.
 */
export function createPolicyEngine(
  licenseManager?: LicenseManager,
  consentStore?: ConsentStore,
  permissionResolver?: import("@governance/policy/policy-engine").PermissionResolver
): PolicyEngine {
  return new PolicyEngine(new SystemClock(), licenseManager, consentStore, permissionResolver);
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

