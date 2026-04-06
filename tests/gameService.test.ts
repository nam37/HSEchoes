import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, ensureSchema } from "../server/src/db/database";
import { seedDatabase } from "../server/src/db/seed";
import { GameService } from "../server/src/services/gameService";
import type { Sql } from "../server/src/db/database";

function makeRandom(...values: number[]): () => number {
  const queue = [...values];
  return () => queue.shift() ?? 0.8;
}

describe("GameService", () => {
  let sql: Sql;
  const userId = "test-user";

  beforeAll(async () => {
    sql = createDatabase();
    await ensureSchema(sql);
    await seedDatabase(sql);
  });

  beforeEach(async () => {
    await sql`TRUNCATE TABLE runs`;
  });

  afterEach(async () => {
    await sql`TRUNCATE TABLE runs`;
  });

  afterAll(async () => {
    await sql.end();
  });

  it("creates a run and loads it back for the same user", async () => {
    const game = await GameService.create(sql, makeRandom(0.7));

    const created = await game.createNewRun(userId);
    const loaded = await game.loadRun(created.run.slotId, userId);

    expect(loaded.zoneId).toBe("zone_hollow_star");
    expect(loaded.roomId).toBe("gate");
    expect(loaded.player.inventory).toContain("maintenance_tool");
  });

  it("steps backward without changing facing", async () => {
    const game = await GameService.create(sql, makeRandom(0.9));
    const created = await game.createNewRun(userId);

    const advanced = await game.move({ slotId: created.run.slotId, command: "forward" }, userId);
    const retreated = await game.move({ slotId: created.run.slotId, command: "back" }, userId);

    expect(advanced.run.roomId).toBe("antechamber");
    expect(retreated.run.roomId).toBe("gate");
    expect(retreated.run.facing).toBe("north");
  });

  it("enters combat when moving into the records bay", async () => {
    const game = await GameService.create(sql, makeRandom(0.9, 0.1));
    const created = await game.createNewRun(userId);

    await game.move({ slotId: created.run.slotId, command: "forward" }, userId);
    await game.move({ slotId: created.run.slotId, command: "turn-left" }, userId);
    const moved = await game.move({ slotId: created.run.slotId, command: "forward" }, userId);

    expect(moved.run.roomId).toBe("scriptorium");
    expect(moved.run.mode).toBe("combat");
    expect(moved.run.combat?.enemyId).toBe("rat_scavenger");
  });
});
