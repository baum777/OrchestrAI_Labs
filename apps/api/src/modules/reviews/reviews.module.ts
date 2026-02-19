import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module";
import { ReviewsController } from "./reviews.controller";
import { PolicyEngine } from "@governance/policy/policy-engine";
import { UsersModule } from "../users/users.module";
import { UserRolesService } from "../users/user-roles.service";
import { createPolicyEngine } from "../agents/customer-data.providers";
import type { LicenseManager } from "@governance/license/license-manager";
import { ConsentService } from "../users/consent.service";

@Module({
  imports: [DbModule, UsersModule],
  controllers: [ReviewsController],
  providers: [
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
    {
      provide: "LicenseManager",
      useFactory: () => {
        // Use same factory as AgentsModule
        const { createLicenseManager } = require("../agents/customer-data.providers");
        return createLicenseManager();
      },
    },
  ],
})
export class ReviewsModule {}

