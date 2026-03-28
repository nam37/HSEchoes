import { describe, expect, it } from "vitest";
import { cells, encounters, enemies, items } from "../server/src/content/world";

const itemIds = new Set(items.map((item) => item.id));
const enemyIds = new Set(enemies.map((enemy) => enemy.id));
const encounterIds = new Set(encounters.map((encounter) => encounter.id));
const cellIds = new Set(cells.map((cell) => cell.id));

describe("world content", () => {
  it("expands beyond the initial PoC footprint without getting unwieldy", () => {
    expect(cells.length).toBeGreaterThanOrEqual(12);
    expect(cells.length).toBeLessThanOrEqual(16);
  });

  it("keeps references consistent", () => {
    for (const cell of cells) {
      for (const lootId of cell.loot ?? []) {
        expect(itemIds.has(lootId)).toBe(true);
      }
      if (cell.encounterId) {
        expect(encounterIds.has(cell.encounterId)).toBe(true);
      }
      for (const requirement of Object.values(cell.passageRequirements ?? {})) {
        expect(itemIds.has(requirement.itemId)).toBe(true);
      }
    }

    for (const encounter of encounters) {
      expect(enemyIds.has(encounter.enemyId)).toBe(true);
      for (const reward of encounter.rewardItemIds) {
        expect(itemIds.has(reward)).toBe(true);
      }
    }
  });

  it("contains a gated upper branch and a reachable victory chamber", () => {
    expect(cellIds.has("astral_gallery")).toBe(true);
    expect(cellIds.has("seal_niche")).toBe(true);
    expect(cells.find((cell) => cell.id === "banner_hall")?.passageRequirements?.north?.itemId).toBe("moon_charm");
    expect(cells.some((cell) => cell.victory)).toBe(true);
    expect(cellIds.has("star_sanctum")).toBe(true);
  });
});
