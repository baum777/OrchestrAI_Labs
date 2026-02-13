import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module";
import { KnowledgeController } from "./knowledge.controller";
import { KnowledgeService } from "./knowledge.service";
import { PostgresActionLogger } from "../../runtime/postgres-action-logger";

@Module({
  imports: [DbModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, PostgresActionLogger],
})
export class KnowledgeModule {}

