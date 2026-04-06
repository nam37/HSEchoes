import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, ensureSchema } from "../server/src/db/database";
import { seedDatabase } from "../server/src/db/seed";
import { GameService } from "../server/src/services/gameService";
import type { Sql } from "../server/src/db/database";
import type { RunState } from "../shared/src/index";

function makeRandom(...values: number[]): () => number {
  const queue = [...values];
  return () => queue.shift() ?? 0.8;
}

describe("GameService", () => {
  let sql: Sql;
  const userId = "test-user";
  const otherUserId = "other-user";

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

  it("creates a run in the requested slot and exposes enriched summaries", async () => {
    const game = await GameService.create(sql, makeRandom(0.7));

    const bootstrap = await game.getBootstrap(userId);
    const created = await game.createNewRun(userId, 2);
    const loaded = await game.loadRun(created.run.slotId, userId);
    const saves = await game.listSaves(userId);
    const rows = await sql<Array<{ slot_index: number }>>`
      SELECT slot_index FROM runs WHERE slot_id = ${created.run.slotId}
    `;

    expect(loaded.zoneId).toBe("zone_hollow_star");
    expect(loaded.roomId).toBe("gate");
    expect(loaded.player.inventory).toContain("maintenance_tool");
    expect(bootstrap.props).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "brazier", name: "Emergency Brazier" }),
    ]));
    expect(rows[0].slot_index).toBe(2);
    expect(saves).toHaveLength(1);
    expect(saves[0]).toMatchObject({
      slotId: created.run.slotId,
      slotNumber: 2,
      status: "active",
      roomId: "gate",
      roomTitle: "Maintenance Airlock",
      level: 1,
    });
  });

  it("rejects creating a new run in an occupied slot", async () => {
    const game = await GameService.create(sql, makeRandom(0.7));

    await game.createNewRun(userId, 1);

    await expect(game.createNewRun(userId, 1)).rejects.toThrow("Save slot 1 is occupied");
  });

  it("loads the manual checkpoint for active saves and summarizes the checkpoint state", async () => {
    const game = await GameService.create(sql, makeRandom(0.9));
    const created = await game.createNewRun(userId, 1);

    await game.move({ slotId: created.run.slotId, command: "forward" }, userId);
    await game.saveRun(created.run.slotId, userId);
    await game.move({ slotId: created.run.slotId, command: "back" }, userId);

    const saves = await game.listSaves(userId);
    const loaded = await game.loadRun(created.run.slotId, userId);
    const rows = await sql<Array<{ json: string }>>`
      SELECT json FROM runs WHERE slot_id = ${created.run.slotId}
    `;
    const persisted = JSON.parse(rows[0].json) as RunState;

    expect(saves[0].roomTitle).toBe("Processing Hub");
    expect(loaded.roomId).toBe("antechamber");
    expect(persisted.roomId).toBe("antechamber");
  });

  it("reopens terminal defeat and victory states instead of rewinding to checkpoint", async () => {
    const game = await GameService.create(sql, makeRandom(0.7));
    const template = (await game.createNewRun(userId, 3)).run;

    const defeatCheckpoint = structuredClone(template);
    defeatCheckpoint.roomId = "gate";
    defeatCheckpoint.updatedAt = "2026-04-01T10:00:00.000Z";

    const defeatAuto = structuredClone(template);
    defeatAuto.roomId = "scriptorium";
    defeatAuto.mode = "defeat";
    defeatAuto.status = "defeat";
    defeatAuto.log = [...defeatAuto.log, "You are dead."];
    defeatAuto.updatedAt = "2026-04-01T10:05:00.000Z";

    const victoryCheckpoint = structuredClone(template);
    victoryCheckpoint.zoneId = "zone_enemy_ship";
    victoryCheckpoint.roomId = "ship_bridge";
    victoryCheckpoint.updatedAt = "2026-04-01T11:00:00.000Z";

    const victoryAuto = structuredClone(template);
    victoryAuto.zoneId = "zone_sphere_arrival";
    victoryAuto.roomId = "sphere_signal_lock";
    victoryAuto.mode = "victory";
    victoryAuto.status = "victory";
    victoryAuto.player.level = 4;
    victoryAuto.log = [...victoryAuto.log, "Signal recovered."];
    victoryAuto.updatedAt = "2026-04-01T11:05:00.000Z";

    await insertRunRow(sql, {
      slotId: "defeat-run",
      slotNumber: 1,
      userId,
      autoSave: defeatAuto,
      checkpoint: defeatCheckpoint,
    });
    await insertRunRow(sql, {
      slotId: "victory-run",
      slotNumber: 2,
      userId,
      autoSave: victoryAuto,
      checkpoint: victoryCheckpoint,
    });

    const saves = await game.listSaves(userId);
    const defeat = await game.loadRun("defeat-run", userId);
    const victory = await game.loadRun("victory-run", userId);

    expect(saves).toEqual(expect.arrayContaining([
      expect.objectContaining({ slotNumber: 1, status: "defeat", roomTitle: "Records Bay" }),
      expect.objectContaining({ slotNumber: 2, status: "victory", roomTitle: "Signal Lock Chamber", level: 4 }),
    ]));
    expect(defeat.status).toBe("defeat");
    expect(defeat.roomId).toBe("scriptorium");
    expect(victory.status).toBe("victory");
    expect(victory.roomId).toBe("sphere_signal_lock");
  });

  it("keeps save access scoped to the owning user", async () => {
    const game = await GameService.create(sql, makeRandom(0.9, 0.1));
    const created = await game.createNewRun(userId, 1);

    await expect(game.loadRun(created.run.slotId, otherUserId)).rejects.toThrow(`Run '${created.run.slotId}' not found.`);
    await expect(game.deleteRun(created.run.slotId, otherUserId)).rejects.toThrow(`Run '${created.run.slotId}' not found.`);

    const loaded = await game.loadRun(created.run.slotId, userId);
    expect(loaded.roomId).toBe("gate");

    await game.deleteRun(created.run.slotId, userId);
    await expect(game.loadRun(created.run.slotId, userId)).rejects.toThrow(`Run '${created.run.slotId}' not found.`);
  });
});

async function insertRunRow(
  sql: Sql,
  input: {
    slotId: string;
    slotNumber: number;
    userId: string;
    autoSave: RunState;
    checkpoint: RunState | null;
  },
): Promise<void> {
  await sql`
    INSERT INTO runs (slot_id, user_id, slot_index, json, checkpoint_json, created_at, updated_at)
    VALUES (
      ${input.slotId},
      ${input.userId},
      ${input.slotNumber},
      ${JSON.stringify({ ...input.autoSave, slotId: input.slotId })},
      ${input.checkpoint ? JSON.stringify({ ...input.checkpoint, slotId: input.slotId }) : null},
      ${input.autoSave.createdAt},
      ${input.autoSave.updatedAt}
    )
  `;
}
