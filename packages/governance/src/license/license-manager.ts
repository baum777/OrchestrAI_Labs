/**
 * License Manager
 * 
 * Manages client tier levels and premium feature access.
 * Core-Extension separation: Core only knows about interfaces, not implementations.
 */

export type ClientTier = "free" | "standard" | "premium";

export interface LicenseInfo {
  clientId: string;
  tier: ClientTier;
  features: string[];
  expiresAt?: string;
}

export interface LicenseManager {
  /**
   * Get license information for a client.
   */
  getLicense(clientId: string): LicenseInfo | null;

  /**
   * Check if a client has access to a premium feature.
   */
  hasFeatureAccess(clientId: string, feature: string): boolean;

  /**
   * Check if a client has a specific tier level.
   */
  hasTier(clientId: string, tier: ClientTier): boolean;
}

/**
 * In-memory implementation of LicenseManager.
 * In production, this would query a database or external license service.
 */
export class InMemoryLicenseManager implements LicenseManager {
  private licenses: Map<string, LicenseInfo> = new Map();

  constructor() {
    // Default licenses for testing
    this.licenses.set("test-agency-1", {
      clientId: "test-agency-1",
      tier: "standard",
      features: [],
    });
    this.licenses.set("acme-corp", {
      clientId: "acme-corp",
      tier: "premium",
      features: ["marketer"],
    });
  }

  getLicense(clientId: string): LicenseInfo | null {
    return this.licenses.get(clientId) ?? null;
  }

  hasFeatureAccess(clientId: string, feature: string): boolean {
    const license = this.getLicense(clientId);
    if (!license) return false;
    return license.features.includes(feature) || license.tier === "premium";
  }

  hasTier(clientId: string, tier: ClientTier): boolean {
    const license = this.getLicense(clientId);
    if (!license) return false;

    const tierOrder: Record<ClientTier, number> = {
      free: 0,
      standard: 1,
      premium: 2,
    };

    return tierOrder[license.tier] >= tierOrder[tier];
  }

  /**
   * Register or update a license (for testing/admin purposes).
   */
  setLicense(license: LicenseInfo): void {
    this.licenses.set(license.clientId, license);
  }
}

