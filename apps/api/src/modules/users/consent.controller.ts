/**
 * Consent Controller
 * 
 * DSGVO-compliant consent management API endpoints.
 * Implements Art. 6 DSGVO (lawfulness of processing) and Art. 7 DSGVO (conditions for consent).
 */

import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ConsentService, type ConsentType } from "./consent.service";

@Controller("users")
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  /**
   * Grant consent for a user.
   * POST /users/:userId/consent
   * 
   * Implements DSGVO Art. 7 (conditions for consent).
   */
  @Post(":userId/consent")
  async grantConsent(
    @Param("userId") userId: string,
    @Body() body: { consentType: ConsentType; ipAddress?: string; userAgent?: string }
  ) {
    const consent = await this.consentService.grantConsent({
      userId,
      consentType: body.consentType,
      ipAddress: body.ipAddress,
      userAgent: body.userAgent,
    });

    return {
      ok: true,
      consent,
    };
  }

  /**
   * Revoke consent for a user.
   * DELETE /users/:userId/consent/:consentType
   * 
   * Implements DSGVO Art. 7(3) (right to withdraw consent).
   */
  @Delete(":userId/consent/:consentType")
  async revokeConsent(
    @Param("userId") userId: string,
    @Param("consentType") consentType: ConsentType
  ) {
    const consent = await this.consentService.revokeConsent(userId, consentType);

    return {
      ok: true,
      consent,
    };
  }

  /**
   * Get consent status for a user.
   * GET /users/:userId/consent/:consentType
   */
  @Get(":userId/consent/:consentType")
  async getConsent(
    @Param("userId") userId: string,
    @Param("consentType") consentType: ConsentType
  ) {
    const consent = await this.consentService.getConsent(userId, consentType);

    return {
      ok: true,
      consent,
    };
  }

  /**
   * Get all consents for a user.
   * GET /users/:userId/consents
   */
  @Get(":userId/consents")
  async getAllConsents(@Param("userId") userId: string) {
    const consents = await this.consentService.getAllConsents(userId);

    return {
      ok: true,
      consents,
    };
  }
}

