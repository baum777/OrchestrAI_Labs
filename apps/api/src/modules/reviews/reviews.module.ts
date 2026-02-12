import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module";
import { ReviewsController } from "./reviews.controller";

@Module({
  imports: [DbModule],
  controllers: [ReviewsController],
})
export class ReviewsModule {}

