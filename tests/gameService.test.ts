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

  it("creates a run and saves it to the DB", async () => {
    const game = await GameService.create(sql, makeRandom(0.7));

    const run = await game.createNewRun();
    const loaded = await game.loadRun(run.slotId);

    expect(loaded.cellId).toBe("gate");
    expect(loaded.player.inventory).toContain("rusted_blade");
  });

  it("steps backward without changing facing", async () => {
    const game = await GameService.create(sql, makeRandom(0.9));
    const run = await game.createNewRun();

    const advanced = await game.move({ slotId: run.slotId, command: "forward" });
    const retreated = await game.move({ slotId: run.slotId, command: "back" });

    expect(advanced.run.cellId).toBe("antechamber");
    expect(retreated.run.cellId).toBe("gate");
    expect(retreated.run.facing).toBe("north");
  });

  it("moves, enters combat, and preserves the run through save/load", async () => {
    const game = await GameService.create(sql, makeRandom(0.9, 0.1, 0.9, 0.1));
    const run = await game.createNewRun();

    await game.move({ slotId: run.slotId, command: "forward" });
    await game.move({ slotId: run.slotId, command: "turn-left" });
    const moved = await game.move({ slotId: run.slotId, command: "forward" });

    expect(moved.run.mode).toBe("combat");
    expect(moved.run.combat?.enemyId).toBe("rat_scavenger");

    const saved = await game.saveRun(run.slotId);
    const loaded = await game.loadRun(run.slotId);

    expect(saved.message).toContain("saved");
    expect(loaded.cellId).toBe("scriptorium");
  });

  it("requires the moon charm before the reliquary stair opens", async () => {
    const game = await GameService.create(sql, makeRandom(0.95, 0.05, 0.95));
    const run = await game.createNewRun();

    await game.move({ slotId: run.slotId, command: "forward" });
    await game.move({ slotId: run.slotId, command: "turn-right" });
    await game.move({ slotId: run.slotId, command: "forward" });
    await game.move({ slotId: run.slotId, command: "turn-left" });
    await game.move({ slotId: run.slotId, command: "forward" });
    await game.move({ slotId: run.slotId, command: "turn-right" });
    await game.move({ slotId: run.slotId, command: "forward" });
    await game.move({ slotId: run.slotId, command: "turn-left" });
    const blocked = await game.move({ slotId: run.slotId, command: "forward" });

    expect(blocked.run.cellId).toBe("banner_hall");
    expect(blocked.message).toContain("moon");

    await game.move({ slotId: run.slotId, command: "turn-left" });
    await game.move({ slotId: run.slotId, command: "forward" });
    const flooded = await game.move({ slotId: run.slotId, command: "forward" });

    expect(flooded.run.mode).toBe("combat");
    expect(flooded.run.combat?.enemyId).toBe("drowned_acolyte");

    await game.handleCombat(run.slotId, "attack");
    const charm = await game.handleCombat(run.slotId, "attack");

    expect(charm.run.player.inventory).toContain("moon_charm");

    await game.move({ slotId: run.slotId, command: "turn-left" });
    await game.move({ slotId: run.slotId, command: "turn-left" });
    await game.move({ slotId: run.slotId, command: "forward" });
    await game.move({ slotId: run.slotId, command: "forward" });
    await game.move({ slotId: run.slotId, command: "turn-left" });
    const unlocked = await game.move({ slotId: run.slotId, command: "forward" });

    expect(unlocked.run.cellId).toBe("reliquary");
    expect(unlocked.run.mode).toBe("combat");
  });

  it("opens the optional moon-ward branch and rewards the starseer blade", async () => {
    const game = await GameService.create(sql, makeRandom(0.95, 0.05, 0.95, 0.95, 0.05, 0.95, 0.05, 0.95));
    const run = await game.createNewRun();

    await game.move({ slotId: run.slotId, command: "forward" });
    const flooded = await game.move({ slotId: run.slotId, command: "forward" });

    expect(flooded.run.mode).toBe("combat");
    await game.handleCombat(run.slotId, "attack");
    const charm = await game.handleCombat(run.slotId, "attack");

    expect(charm.run.player.inventory).toContain("moon_charm");

    const gallery = await game.move({ slotId: run.slotId, command: "forward" });
    expect(gallery.run.cellId).toBe("astral_gallery");
    expect(gallery.run.combat?.enemyId).toBe("ashen_pilgrim");

    await game.handleCombat(run.slotId, "attack");
    await game.handleCombat(run.slotId, "attack");
    const blade = await game.handleCombat(run.slotId, "attack");

    expect(blade.run.player.inventory).toContain("starseer_blade");
    expect(blade.run.clearedEncounterIds).toContain("astral_pilgrim");
  });

  it("supports the expanded victory path", async () => {
    const game = await GameService.create(sql, makeRandom(0.95, 0.05, 0.95, 0.95, 0.05, 0.05, 0.95, 0.05, 0.95));
    const run = await game.createNewRun();

    await game.move({ slotId: run.slotId, command: "forward" });
    await game.move({ slotId: run.slotId, command: "turn-right" });
    await game.move({ slotId: run.slotId, command: "forward" });
    await game.equipItem(run.slotId, "gate_mail");
    await game.move({ slotId: run.slotId, command: "turn-left" });
    await game.move({ slotId: run.slotId, command: "turn-left" });
    await game.move({ slotId: run.slotId, command: "forward" });
    await game.move({ slotId: run.slotId, command: "turn-right" });
    const flooded = await game.move({ slotId: run.slotId, command: "forward" });

    expect(flooded.run.mode).toBe("combat");
    await game.handleCombat(run.slotId, "attack");
    const charm = await game.handleCombat(run.slotId, "attack");

    expect(charm.run.player.inventory).toContain("moon_charm");
    await game.equipItem(run.slotId, "moon_charm");

    await game.move({ slotId: run.slotId, command: "turn-right" });
    await game.move({ slotId: run.slotId, command: "forward" });
    await game.move({ slotId: run.slotId, command: "forward" });
    await game.move({ slotId: run.slotId, command: "turn-left" });
    const reliquary = await game.move({ slotId: run.slotId, command: "forward" });

    expect(reliquary.run.mode).toBe("combat");
    await game.handleCombat(run.slotId, "attack");
    await game.handleCombat(run.slotId, "defend");
    await game.handleCombat(run.slotId, "attack");
    const sigil = await game.handleCombat(run.slotId, "attack");

    expect(sigil.run.status).toBe("active");
    expect(sigil.run.player.inventory).toContain("star_sigil");

    const sanctum = await game.move({ slotId: run.slotId, command: "forward" });
    expect(sanctum.run.status).toBe("victory");
  });
});
