import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createDatabase, ensureSchema } from "../server/src/db/database";
import { seedDatabase } from "../server/src/db/seed";
import { buildApp } from "../server/src/app";
import type { Sql } from "../server/src/db/database";

describe("game routes", () => {
  let sql: Sql;
  let app: FastifyInstance;

  beforeAll(async () => {
    sql = createDatabase();
    await ensureSchema(sql);
    await seedDatabase(sql);
  });

  beforeEach(async () => {
    await sql`TRUNCATE TABLE runs`;
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await sql`TRUNCATE TABLE runs`;
    await sql.end();
  });

  it("boots, creates a run, and loads it back", async () => {
    const landing = await app.inject({ method: "GET", url: "/" });
    const bootstrap = await app.inject({ method: "GET", url: "/api/game/bootstrap" });
    const start = await app.inject({ method: "POST", url: "/api/game/new-run" });
    const created = start.json().data.run;
    const loaded = await app.inject({ method: "GET", url: `/api/game/run/${created.slotId}` });

    expect(landing.statusCode).toBe(200);
    expect(landing.headers["content-type"]).toContain("text/html");
    expect(bootstrap.statusCode).toBe(200);
    expect(created.slotId).toBeTruthy();
    expect(loaded.json().data.run.cellId).toBe("gate");
  });
});
