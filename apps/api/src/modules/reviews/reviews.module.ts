import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module";
import { ReviewsController } from "./reviews.controller";
import { PolicyEngine } from "@governance/policy/policy-engine";

@Module({
  imports: [DbModule],
  controllers: [ReviewsController],
  providers: [PolicyEngine],
})
export class ReviewsModule {}

