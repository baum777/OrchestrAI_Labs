import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module";
import { PostgresActionLogger } from "../../runtime/postgres-action-logger";
import { ConsentService } from "./consent.service";
import { ConsentController } from "./consent.controller";
import { DataDeletionService } from "./data-deletion.service";
import { DataDeletionController } from "./data-deletion.controller";
import { UserRolesService } from "./user-roles.service";

@Module({
  imports: [DbModule],
  controllers: [ConsentController, DataDeletionController],
  providers: [ConsentService, DataDeletionService, UserRolesService, PostgresActionLogger],
  exports: [ConsentService, UserRolesService], // Export for use in other modules (e.g., PolicyEngine)
})
export class UsersModule {}

