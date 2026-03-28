import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createDatabase } from "../server/src/db/database";
import { seedDatabase } from "../server/src/db/seed";
import { GameService } from "../server/src/services/gameService";

function makeRandom(...values: number[]): () => number {
  const queue = [...values];
  return () => queue.shift() ?? 0.8;
}

describe("GameService", () => {
  let root: string;
  let db: ReturnType<typeof createDatabase> | null = null;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "hollow-star-"));
  });

  afterEach(() => {
    db?.close();
    db = null;
    rmSync(root, { recursive: true, force: true });
  });

  it("creates a run and saves it to SQLite", () => {
    db = createDatabase(join(root, "game.sqlite"));
    seedDatabase(db);
    const game = new GameService(db, makeRandom(0.7));

    const run = game.createNewRun();
    const loaded = game.loadRun(run.slotId);

    expect(loaded.cellId).toBe("gate");
    expect(loaded.player.inventory).toContain("rusted_blade");
  });

  it("steps backward without changing facing", () => {
    db = createDatabase(join(root, "game.sqlite"));
    seedDatabase(db);
    const game = new GameService(db, makeRandom(0.9));
    const run = game.createNewRun();

    const advanced = game.move({ slotId: run.slotId, command: "forward" });
    const retreated = game.move({ slotId: run.slotId, command: "back" });

    expect(advanced.run.cellId).toBe("antechamber");
    expect(retreated.run.cellId).toBe("gate");
    expect(retreated.run.facing).toBe("north");
  });

  it("moves, enters combat, and preserves the run through save/load", () => {
    db = createDatabase(join(root, "game.sqlite"));
    seedDatabase(db);
    const game = new GameService(db, makeRandom(0.9, 0.1, 0.9, 0.1));
    const run = game.createNewRun();

    game.move({ slotId: run.slotId, command: "forward" });
    game.move({ slotId: run.slotId, command: "turn-left" });
    const moved = game.move({ slotId: run.slotId, command: "forward" });

    expect(moved.run.mode).toBe("combat");
    expect(moved.run.combat?.enemyId).toBe("rat_scavenger");

    const saved = game.saveRun(run.slotId);
    const loaded = game.loadRun(run.slotId);

    expect(saved.message).toContain("saved");
    expect(loaded.cellId).toBe("scriptorium");
  });

  it("requires the moon charm before the reliquary stair opens", () => {
    db = createDatabase(join(root, "game.sqlite"));
    seedDatabase(db);
    const game = new GameService(db, makeRandom(0.95, 0.05, 0.95));
    const run = game.createNewRun();

    game.move({ slotId: run.slotId, command: "forward" });
    game.move({ slotId: run.slotId, command: "turn-right" });
    game.move({ slotId: run.slotId, command: "forward" });
    game.move({ slotId: run.slotId, command: "turn-left" });
    game.move({ slotId: run.slotId, command: "forward" });
    game.move({ slotId: run.slotId, command: "turn-right" });
    game.move({ slotId: run.slotId, command: "forward" });
    game.move({ slotId: run.slotId, command: "turn-left" });
    const blocked = game.move({ slotId: run.slotId, command: "forward" });

    expect(blocked.run.cellId).toBe("banner_hall");
    expect(blocked.message).toContain("moon");

    game.move({ slotId: run.slotId, command: "turn-left" });
    game.move({ slotId: run.slotId, command: "forward" });
    const flooded = game.move({ slotId: run.slotId, command: "forward" });

    expect(flooded.run.mode).toBe("combat");
    expect(flooded.run.combat?.enemyId).toBe("drowned_acolyte");

    game.handleCombat(run.slotId, "attack");
    const charm = game.handleCombat(run.slotId, "attack");

    expect(charm.run.player.inventory).toContain("moon_charm");

    game.move({ slotId: run.slotId, command: "turn-left" });
    game.move({ slotId: run.slotId, command: "turn-left" });
    game.move({ slotId: run.slotId, command: "forward" });
    game.move({ slotId: run.slotId, command: "forward" });
    game.move({ slotId: run.slotId, command: "turn-left" });
    const unlocked = game.move({ slotId: run.slotId, command: "forward" });

    expect(unlocked.run.cellId).toBe("reliquary");
    expect(unlocked.run.mode).toBe("combat");
  });

  it("opens the optional moon-ward branch and rewards the starseer blade", () => {
    db = createDatabase(join(root, "game.sqlite"));
    seedDatabase(db);
    const game = new GameService(db, makeRandom(0.95, 0.05, 0.95, 0.95, 0.05, 0.95, 0.05, 0.95));
    const run = game.createNewRun();

    game.move({ slotId: run.slotId, command: "forward" });
    const flooded = game.move({ slotId: run.slotId, command: "forward" });

    expect(flooded.run.mode).toBe("combat");
    game.handleCombat(run.slotId, "attack");
    const charm = game.handleCombat(run.slotId, "attack");

    expect(charm.run.player.inventory).toContain("moon_charm");

    const gallery = game.move({ slotId: run.slotId, command: "forward" });
    expect(gallery.run.cellId).toBe("astral_gallery");
    expect(gallery.run.combat?.enemyId).toBe("ashen_pilgrim");

    game.handleCombat(run.slotId, "attack");
    game.handleCombat(run.slotId, "attack");
    const blade = game.handleCombat(run.slotId, "attack");

    expect(blade.run.player.inventory).toContain("starseer_blade");
    expect(blade.run.clearedEncounterIds).toContain("astral_pilgrim");
  });

  it("supports the expanded victory path", () => {
    db = createDatabase(join(root, "game.sqlite"));
    seedDatabase(db);
    const game = new GameService(db, makeRandom(0.95, 0.05, 0.95, 0.95, 0.05, 0.05, 0.95, 0.05, 0.95));
    const run = game.createNewRun();

    game.move({ slotId: run.slotId, command: "forward" });
    game.move({ slotId: run.slotId, command: "turn-right" });
    game.move({ slotId: run.slotId, command: "forward" });
    game.equipItem(run.slotId, "gate_mail");
    game.move({ slotId: run.slotId, command: "turn-left" });
    game.move({ slotId: run.slotId, command: "turn-left" });
    game.move({ slotId: run.slotId, command: "forward" });
    game.move({ slotId: run.slotId, command: "turn-right" });
    const flooded = game.move({ slotId: run.slotId, command: "forward" });

    expect(flooded.run.mode).toBe("combat");
    game.handleCombat(run.slotId, "attack");
    const charm = game.handleCombat(run.slotId, "attack");

    expect(charm.run.player.inventory).toContain("moon_charm");
    game.equipItem(run.slotId, "moon_charm");

    game.move({ slotId: run.slotId, command: "turn-right" });
    game.move({ slotId: run.slotId, command: "forward" });
    game.move({ slotId: run.slotId, command: "forward" });
    game.move({ slotId: run.slotId, command: "turn-left" });
    const reliquary = game.move({ slotId: run.slotId, command: "forward" });

    expect(reliquary.run.mode).toBe("combat");
    game.handleCombat(run.slotId, "attack");
    game.handleCombat(run.slotId, "defend");
    game.handleCombat(run.slotId, "attack");
    const sigil = game.handleCombat(run.slotId, "attack");

    expect(sigil.run.status).toBe("active");
    expect(sigil.run.player.inventory).toContain("star_sigil");

    const sanctum = game.move({ slotId: run.slotId, command: "forward" });
    expect(sanctum.run.status).toBe("victory");
  });
});


