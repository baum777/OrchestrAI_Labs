import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module";
import { DecisionsController } from "./decisions.controller";
import { DecisionsService } from "./decisions.service";
import { PolicyEngine } from "@governance/policy/policy-engine";
import { UsersModule } from "../users/users.module";
import { createPolicyEngine, createLicenseManager } from "../agents/customer-data.providers";
import type { LicenseManager } from "@governance/license/license-manager";
import { ConsentService } from "../users/consent.service";
import { UserRolesService } from "../users/user-roles.service";

@Module({
  imports: [DbModule, UsersModule],
  controllers: [DecisionsController],
  providers: [
    DecisionsService,
    {
      provide: PolicyEngine,
      useFactory: (
        licenseManager: LicenseManager,
        consentService: ConsentService,
        userRolesService: UserRolesService
      ) => createPolicyEngine(licenseManager, consentService, userRolesService),
      inject: ["LicenseManager", ConsentService, UserRolesService],
    },
    {
      provide: "LicenseManager",
      useFactory: () => {
        return createLicenseManager();
      },
    },
  ],
  exports: [DecisionsService],
})
export class DecisionsModule {}

