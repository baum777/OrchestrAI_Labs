import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module";
import { UsersModule } from "../users/users.module";
import { UserRolesService } from "../users/user-roles.service";
import { ConsentService } from "../users/consent.service";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsAuthGuard } from "../../auth/analytics-auth.guard";
import { PolicyEngine } from "@governance/policy/policy-engine";
import {
  createPolicyEngine,
  createLicenseManager,
} from "../agents/customer-data.providers";
import type { LicenseManager } from "@governance/license/license-manager";

@Module({
  imports: [DbModule, UsersModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsAuthGuard,
    {
      provide: "LicenseManager",
      useFactory: createLicenseManager,
    },
    {
      provide: PolicyEngine,
      useFactory: (
        licenseManager: LicenseManager,
        consentService: ConsentService,
        userRolesService: UserRolesService
      ) =>
        createPolicyEngine(licenseManager, consentService, userRolesService),
      inject: ["LicenseManager", ConsentService, UserRolesService],
    },
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
