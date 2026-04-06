import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { createDatabase, ensureSchema } from "../server/src/db/database";
import { seedDatabase } from "../server/src/db/seed";
import type { Sql } from "../server/src/db/database";

describe("game routes", () => {
  let sql: Sql;
  let app: FastifyInstance;
  let buildApp: typeof import("../server/src/app").buildApp;

  beforeAll(async () => {
    sql = createDatabase();
    await ensureSchema(sql);
    await seedDatabase(sql);

    delete process.env.NEON_AUTH_URL;
    vi.resetModules();
    ({ buildApp } = await import("../server/src/app"));
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

  it("boots, creates a slot-aware run, and loads it back", async () => {
    const landing = await app.inject({ method: "GET", url: "/" });
    const bootstrap = await app.inject({ method: "GET", url: "/api/game/bootstrap" });
    const start = await app.inject({
      method: "POST",
      url: "/api/game/new-run",
      payload: { slotNumber: 2 },
    });
    const created = start.json().data.run;
    const loaded = await app.inject({ method: "GET", url: `/api/game/run/${created.slotId}` });
    const refreshedBootstrap = await app.inject({ method: "GET", url: "/api/game/bootstrap" });
    const saves = refreshedBootstrap.json().data.saves;

    expect(landing.statusCode).toBe(200);
    expect(bootstrap.statusCode).toBe(200);
    expect(bootstrap.json().data.zones[0].surfaceDefaults.wallTexture).toBeTruthy();
    expect(bootstrap.json().data.props).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "brazier", name: "Emergency Brazier" }),
    ]));
    expect(created.slotId).toBeTruthy();
    expect(loaded.json().data.run.roomId).toBe("gate");
    expect(saves).toEqual([
      expect.objectContaining({
        slotId: created.slotId,
        slotNumber: 2,
        roomTitle: "Maintenance Airlock",
        level: 1,
        status: "active",
      }),
    ]);
  });

  it("rejects starting a new run in an occupied slot", async () => {
    await app.inject({
      method: "POST",
      url: "/api/game/new-run",
      payload: { slotNumber: 1 },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/game/new-run",
      payload: { slotNumber: 1 },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().error).toContain("Save slot 1 is occupied");
  });

  it("deletes only the caller's save through the player route", async () => {
    const start = await app.inject({
      method: "POST",
      url: "/api/game/new-run",
      payload: { slotNumber: 3 },
    });
    const slotId = start.json().data.run.slotId as string;

    const deleted = await app.inject({ method: "DELETE", url: `/api/game/run/${slotId}` });
    const missing = await app.inject({ method: "GET", url: `/api/game/run/${slotId}` });

    expect(deleted.statusCode).toBe(200);
    expect(deleted.json().data.deleted).toBe(slotId);
    expect(missing.statusCode).toBe(500);
    expect(missing.json().error).toContain(`Run '${slotId}' not found.`);
  });
});
