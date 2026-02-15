import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import supertest from "supertest";
import type { Pool } from "pg";
import { AppModule } from "../../src/app.module";
import { PG_POOL } from "../../src/db/db.module";

export async function createTestApp(options?: {
  pool?: Pool;
}): Promise<{
  app: INestApplication;
  request: ReturnType<typeof supertest>;
  close: () => Promise<void>;
  moduleRef: TestingModule;
}> {
  const builder = Test.createTestingModule({ imports: [AppModule] });

  if (options?.pool) {
    builder.overrideProvider(PG_POOL).useValue(options.pool);
  }

  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();
  await app.init();

  const request = supertest(app.getHttpServer());

  return {
    app,
    request,
    moduleRef,
    close: async () => {
      await app.close();
    },
  };
}

