import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { PolicyErrorFilter } from "./filters/policy-error.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new PolicyErrorFilter());
  await app.listen(4000);
}

bootstrap();

