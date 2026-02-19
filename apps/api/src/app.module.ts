import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { DbModule } from "./db/db.module";
import { AgentsModule } from "./modules/agents/agents.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { KnowledgeModule } from "./modules/knowledge/knowledge.module";
import { DecisionsModule } from "./modules/decisions/decisions.module";
import { LogsModule } from "./modules/logs/logs.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { MonitoringModule } from "./modules/monitoring/monitoring.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { UsersModule } from "./modules/users/users.module";
import { HealthController } from "./health/health.controller";
import { AuditLogMiddleware } from "./middleware/audit-log.middleware";
import { SecurityHeadersMiddleware } from "./middleware/security-headers.middleware";
import { PostgresActionLogger } from "./runtime/postgres-action-logger";
import { LogRetentionJob } from "./jobs/log-retention.job";

@Module({
  imports: [
    ScheduleModule.forRoot(), // Enable scheduled jobs
    DbModule,
    AgentsModule,
    ProjectsModule,
    KnowledgeModule,
    DecisionsModule,
    LogsModule,
    ReviewsModule,
    MonitoringModule,
    AnalyticsModule,
    UsersModule,
  ],
  controllers: [HealthController],
  providers: [PostgresActionLogger, AuditLogMiddleware, SecurityHeadersMiddleware, LogRetentionJob], // Provide all for DI
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Apply security headers first (before audit logging)
    consumer
      .apply(SecurityHeadersMiddleware)
      .forRoutes("*");
    
    // Apply audit logging middleware to all routes
    consumer
      .apply(AuditLogMiddleware)
      .forRoutes("*");
  }
}

