import { describe, expect, it } from "vitest";
import { findRoomContaining, normalizeZoneSurfaces, resolveRoomSurfaces, type ZoneInput } from "../shared/src/index";
import { encounters, enemies, hollowStarZone, items, worldSeed } from "../server/src/content/world";

const itemIds = new Set(items.map((item) => item.id));
const enemyIds = new Set(enemies.map((enemy) => enemy.id));
const encounterIds = new Set(encounters.map((encounter) => encounter.id));

describe("world content", () => {
  it("keeps zone references and default surface sets consistent", () => {
    expect(worldSeed.zones.length).toBeGreaterThanOrEqual(4);

    for (const zone of worldSeed.zones) {
      expect(zone.surfaceDefaults.wallTexture).toBeTruthy();
      expect(zone.surfaceDefaults.floorTexture).toBeTruthy();
      expect(zone.surfaceDefaults.ceilingColor).toMatch(/^#/);

      for (const room of zone.rooms) {
        for (const lootId of room.loot ?? []) {
          expect(itemIds.has(lootId)).toBe(true);
        }
        if (room.encounterId) {
          expect(encounterIds.has(room.encounterId)).toBe(true);
        }
      }

      for (const edge of zone.edges) {
        if (edge.requirement) {
          expect(itemIds.has(edge.requirement.itemId)).toBe(true);
        }
      }
    }

    for (const encounter of encounters) {
      expect(enemyIds.has(encounter.enemyId)).toBe(true);
      for (const rewardItemId of encounter.rewardItemIds) {
        expect(itemIds.has(rewardItemId)).toBe(true);
      }
    }
  });

  it("resolves room textures from zone defaults with sparse per-room overrides", () => {
    const gate = findRoomContaining(hollowStarZone, 1, 4);
    const reliquary = findRoomContaining(hollowStarZone, 3, 1);
    expect(gate).toBeDefined();
    expect(reliquary).toBeDefined();

    const gateSurfaces = resolveRoomSurfaces(hollowStarZone, gate!);
    const reliquarySurfaces = resolveRoomSurfaces(hollowStarZone, reliquary!);

    expect(gateSurfaces.wallTexture).toBe(hollowStarZone.surfaceDefaults.wallTexture);
    expect(gateSurfaces.floorTexture).toBe(hollowStarZone.surfaceDefaults.floorTexture);
    expect(gateSurfaces.ceilingTexture).toBe(hollowStarZone.surfaceDefaults.ceilingTexture);
    expect(gateSurfaces.ceilingColor).toBe("#141012");

    expect(reliquarySurfaces.wallTexture).toBe("/assets/textures/wall-maintenance-b.png");
    expect(reliquarySurfaces.wallTexture).not.toBe(hollowStarZone.surfaceDefaults.wallTexture);
  });

  it("normalizes legacy room surface fields into zone defaults and minimal overrides", () => {
    const legacyZone: ZoneInput = {
      id: "legacy_zone",
      title: "Legacy Zone",
      gridW: 2,
      gridH: 1,
      rooms: [
        { id: "a", x: 0, y: 0, w: 1, h: 1, title: "A", description: "", wallTexture: "/wall.png", floorTexture: "/floor.png", ceilingColor: "#111111" },
        { id: "b", x: 1, y: 0, w: 1, h: 1, title: "B", description: "", wallTexture: "/wall.png", floorTexture: "/floor.png", ceilingColor: "#222222" },
      ],
      edges: [],
    };

    const normalized = normalizeZoneSurfaces(legacyZone, { wallTexture: "/fallback-wall.png", floorTexture: "/fallback-floor.png" });

    expect(normalized.surfaceDefaults.wallTexture).toBe("/wall.png");
    expect(normalized.surfaceDefaults.floorTexture).toBe("/floor.png");
    expect(normalized.surfaceDefaults.ceilingColor).toBe("#111111");
    expect(normalized.rooms[0].surfaceOverrides).toBeUndefined();
    expect(normalized.rooms[1].surfaceOverrides).toEqual({ ceilingColor: "#222222" });
  });
});
