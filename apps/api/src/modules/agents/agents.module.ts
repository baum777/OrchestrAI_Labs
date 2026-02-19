import { Module } from "@nestjs/common";
import { DbModule, PG_POOL } from "../../db/db.module";
import { AgentsController } from "./agents.controller";
import { PostgresActionLogger } from "../../runtime/postgres-action-logger";
import { PostgresReviewStore } from "../../runtime/postgres-review-store";
import { Orchestrator } from "@agent-runtime/orchestrator/orchestrator";
import { createOrchestrator } from "./agents.runtime";
import {
  createPolicyEngine,
  createConnectorRegistry,
  createCapabilityRegistry,
  createLicenseManager,
} from "./customer-data.providers";
import { ConsentService } from "../users/consent.service";
import { UserRolesService } from "../users/user-roles.service";
import { UsersModule } from "../users/users.module";
import type { Pool } from "pg";
import { PolicyEngine } from "@governance/policy/policy-engine";
import type { LicenseManager } from "@governance/license/license-manager";
import type {
  MultiSourceConnectorRegistry,
  CapabilityRegistry,
} from "@agent-system/customer-data";

@Module({
  imports: [DbModule, UsersModule],
  controllers: [AgentsController],
  providers: [
    PostgresActionLogger,
    PostgresReviewStore,
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
    {
      provide: "MultiSourceConnectorRegistry",
      useFactory: createConnectorRegistry,
    },
    {
      provide: "CapabilityRegistry",
      useFactory: createCapabilityRegistry,
    },
    {
      provide: Orchestrator,
      useFactory: (
        logger: PostgresActionLogger,
        reviewStore: PostgresReviewStore,
        pool: Pool,
        policyEngine: PolicyEngine,
        connectorRegistry: MultiSourceConnectorRegistry,
        capabilityRegistry: CapabilityRegistry,
        licenseManager: LicenseManager
      ) =>
        createOrchestrator(logger, reviewStore, pool, policyEngine, connectorRegistry, capabilityRegistry, undefined, licenseManager),
      inject: [
        PostgresActionLogger,
        PostgresReviewStore,
        PG_POOL,
        PolicyEngine,
        "MultiSourceConnectorRegistry",
        "CapabilityRegistry",
        "LicenseManager",
      ],
    },
  ],
})
export class AgentsModule {}

