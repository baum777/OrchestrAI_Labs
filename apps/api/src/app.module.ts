import { Module } from "@nestjs/common";
import { DbModule } from "./db/db.module";
import { AgentsModule } from "./modules/agents/agents.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { KnowledgeModule } from "./modules/knowledge/knowledge.module";
import { DecisionsModule } from "./modules/decisions/decisions.module";
import { LogsModule } from "./modules/logs/logs.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { MonitoringModule } from "./modules/monitoring/monitoring.module";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [
    DbModule,
    AgentsModule,
    ProjectsModule,
    KnowledgeModule,
    DecisionsModule,
    LogsModule,
    ReviewsModule,
    MonitoringModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

