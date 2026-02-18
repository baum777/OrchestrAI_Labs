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
} from "./customer-data.providers";
import type { Pool } from "pg";
import type { PolicyEngine } from "@governance/policy/policy-engine";
import type {
  MultiSourceConnectorRegistry,
  CapabilityRegistry,
} from "@agent-system/customer-data";

@Module({
  imports: [DbModule],
  controllers: [AgentsController],
  providers: [
    PostgresActionLogger,
    PostgresReviewStore,
    {
      provide: PolicyEngine,
      useFactory: createPolicyEngine,
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
        capabilityRegistry: CapabilityRegistry
      ) =>
        createOrchestrator(logger, reviewStore, pool, policyEngine, connectorRegistry, capabilityRegistry),
      inject: [
        PostgresActionLogger,
        PostgresReviewStore,
        PG_POOL,
        PolicyEngine,
        "MultiSourceConnectorRegistry",
        "CapabilityRegistry",
      ],
    },
  ],
})
export class AgentsModule {}

