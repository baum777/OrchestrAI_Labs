import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module";
import { ProjectsContextController } from "./projects.context.controller";
import { ProjectsService } from "./projects.service";
import { ProjectPhaseStore } from "./project-phase.store";
import { PostgresActionLogger } from "../../runtime/postgres-action-logger";

@Module({
  imports: [DbModule],
  controllers: [ProjectsContextController],
  providers: [ProjectsService, ProjectPhaseStore, PostgresActionLogger],
  exports: [ProjectsService],
})
export class ProjectsModule {}

