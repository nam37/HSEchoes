import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildApp } from "../server/src/app";
import { seedDatabase } from "../server/src/db/seed";
import { createDatabase } from "../server/src/db/database";

describe("game routes", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "hollow-api-"));
    const db = createDatabase(join(root, "game.sqlite"));
    seedDatabase(db);
    db.close();
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("boots, creates a run, and loads it back", async () => {
    const app = buildApp(join(root, "game.sqlite"));
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
    await app.close();
  });
});
