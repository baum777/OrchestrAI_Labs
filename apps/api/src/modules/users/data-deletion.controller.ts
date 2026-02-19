/**
 * Data Deletion Controller
 * 
 * API endpoints for DSGVO Art. 17 (right to erasure).
 */

import { Controller, Delete, Param, UseGuards, Req } from "@nestjs/common";
import { DataDeletionService } from "./data-deletion.service";
import { SelfOrAdminGuard } from "../../auth/self-or-admin.guard";

@Controller("users")
export class DataDeletionController {
  constructor(private readonly dataDeletionService: DataDeletionService) {}

  /**
   * Delete user data (DSGVO Art. 17).
   * DELETE /users/:userId/data
   * 
   * Requires authentication: requestorUserId must match userId or be admin.
   * 
   * Headers (MVP):
   * - X-User-Id: Requestor user ID
   * - X-User-Roles: Comma-separated roles (e.g., "admin,senior")
   * 
   * In production: Extract from JWT token.
   */
  @Delete(":userId/data")
  @UseGuards(SelfOrAdminGuard)
  async deleteUserData(
    @Param("userId") userId: string,
    @Req() request: { requestorUserId?: string; requestorRoles?: string[] }
  ) {
    const requestorUserId = request.requestorUserId ?? userId;

    // Check if user has data
    const hasData = await this.dataDeletionService.hasUserData(userId);
    if (!hasData) {
      return {
        ok: true,
        message: "No user data found",
        deleted: {
          decisions: 0,
          reviews: 0,
          anonymizedLogs: 0,
        },
      };
    }

    // Execute deletion
    const result = await this.dataDeletionService.deleteUserData(userId, requestorUserId);

    return result;
  }
}

