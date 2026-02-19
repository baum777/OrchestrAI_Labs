import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module";
import { ProjectsContextController } from "./projects.context.controller";
import { ProjectsService } from "./projects.service";
import { ProjectPhaseStore } from "./project-phase.store";
import { PostgresActionLogger } from "../../runtime/postgres-action-logger";
import { PolicyEngine } from "@governance/policy/policy-engine";
import { UsersModule } from "../users/users.module";
import { createPolicyEngine } from "../agents/customer-data.providers";
import type { LicenseManager } from "@governance/license/license-manager";
import { ConsentService } from "../users/consent.service";
import { UserRolesService } from "../users/user-roles.service";

@Module({
  imports: [DbModule, UsersModule],
  controllers: [ProjectsContextController],
  providers: [
    ProjectsService,
    ProjectPhaseStore,
    PostgresActionLogger,
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
        const { createLicenseManager } = require("../agents/customer-data.providers");
        return createLicenseManager();
      },
    },
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}

