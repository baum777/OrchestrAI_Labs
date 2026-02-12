import { Module } from "@nestjs/common";
import { DbModule, PG_POOL } from "../../db/db.module";
import { AgentsController } from "./agents.controller";
import { PostgresActionLogger } from "../../runtime/postgres-action-logger";
import { PostgresReviewStore } from "../../runtime/postgres-review-store";
import { Orchestrator } from "@agent-runtime/orchestrator/orchestrator";
import { createOrchestrator } from "./agents.runtime";
import type { Pool } from "pg";

@Module({
  imports: [DbModule],
  controllers: [AgentsController],
  providers: [
    PostgresActionLogger,
    PostgresReviewStore,
    {
      provide: Orchestrator,
      useFactory: (logger: PostgresActionLogger, reviewStore: PostgresReviewStore, pool: Pool) =>
        createOrchestrator(logger, reviewStore, pool),
      inject: [PostgresActionLogger, PostgresReviewStore, PG_POOL],
    },
  ],
})
export class AgentsModule {}

