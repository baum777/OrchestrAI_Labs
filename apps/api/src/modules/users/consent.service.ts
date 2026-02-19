/**
 * Consent Service
 * 
 * DSGVO-compliant consent management for user data processing.
 * Implements Art. 6 DSGVO (lawfulness of processing) and Art. 7 DSGVO (conditions for consent).
 */

import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { PG_POOL } from "../../db/db.module";
import type { Clock } from "@agent-system/governance-v2/runtime/clock";
import { SystemClock } from "@agent-system/governance-v2/runtime/clock";

export type ConsentType = 
  | "data_processing"
  | "marketing"
  | "analytics"
  | "customer_data_access";

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  grantedAt: string | null;
  revokedAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConsentInput {
  userId: string;
  consentType: ConsentType;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ConsentService {
  private readonly clock: Clock;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    clock?: Clock
  ) {
    this.clock = clock ?? new SystemClock();
  }

  /**
   * Grants consent for a user.
   * Implements DSGVO Art. 7 (conditions for consent).
   */
  async grantConsent(input: CreateConsentInput): Promise<ConsentRecord> {
    const id = `consent_${crypto.randomUUID()}`;
    const now = this.clock.now().toISOString();

    await this.pool.query(
      `
      INSERT INTO user_consents 
        (id, user_id, consent_type, granted, granted_at, revoked_at, ip_address, user_agent, created_at, updated_at)
      VALUES 
        ($1, $2, $3, TRUE, $4, NULL, $5, $6, $7, $8)
      ON CONFLICT (user_id, consent_type) 
      DO UPDATE SET
        granted = TRUE,
        granted_at = $4,
        revoked_at = NULL,
        ip_address = $5,
        user_agent = $6,
        updated_at = $8
      `,
      [
        id,
        input.userId,
        input.consentType,
        now,
        input.ipAddress ?? null,
        input.userAgent ?? null,
        now,
        now,
      ]
    );

    return this.getConsent(input.userId, input.consentType);
  }

  /**
   * Revokes consent for a user.
   * Implements DSGVO Art. 7(3) (right to withdraw consent).
   */
  async revokeConsent(userId: string, consentType: ConsentType): Promise<ConsentRecord> {
    const now = this.clock.now().toISOString();

    await this.pool.query(
      `
      UPDATE user_consents
      SET 
        granted = FALSE,
        revoked_at = $3,
        updated_at = $3
      WHERE user_id = $1 AND consent_type = $2
      `,
      [userId, consentType, now]
    );

    return this.getConsent(userId, consentType);
  }

  /**
   * Gets current consent status for a user.
   */
  async getConsent(userId: string, consentType: ConsentType): Promise<ConsentRecord> {
    const { rows } = await this.pool.query(
      `
      SELECT 
        id, user_id, consent_type, granted, granted_at, revoked_at,
        ip_address, user_agent, created_at, updated_at
      FROM user_consents
      WHERE user_id = $1 AND consent_type = $2
      `,
      [userId, consentType]
    );

    if (rows.length === 0) {
      // No consent record exists (implicit: no consent)
      return {
        id: "",
        userId,
        consentType,
        granted: false,
        grantedAt: null,
        revokedAt: null,
        ipAddress: null,
        userAgent: null,
        createdAt: this.clock.now().toISOString(),
        updatedAt: this.clock.now().toISOString(),
      };
    }

    const row = rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      consentType: row.consent_type,
      granted: row.granted,
      grantedAt: row.granted_at,
      revokedAt: row.revoked_at,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Checks if user has granted consent.
   * Returns true only if consent exists AND is currently granted.
   */
  async hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const consent = await this.getConsent(userId, consentType);
    return consent.granted;
  }

  /**
   * Implements ConsentStore interface for PolicyEngine integration.
   * Checks if user has granted consent for data processing (string overload).
   */
  async hasConsentForPolicyEngine(userId: string, consentType: string): Promise<boolean> {
    return this.hasConsent(userId, consentType as ConsentType);
  }

  /**
   * Gets all consents for a user.
   */
  async getAllConsents(userId: string): Promise<ConsentRecord[]> {
    const { rows } = await this.pool.query(
      `
      SELECT 
        id, user_id, consent_type, granted, granted_at, revoked_at,
        ip_address, user_agent, created_at, updated_at
      FROM user_consents
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      consentType: row.consent_type,
      granted: row.granted,
      grantedAt: row.granted_at,
      revokedAt: row.revoked_at,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}

