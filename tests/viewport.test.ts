import { describe, expect, it } from "vitest";
import { resolveRoomSurfaces, type Zone } from "../shared/src/index";
import { hollowStarZone } from "../server/src/content/world";
import { isPassageBlocked } from "../client/src/lib/dungeonUtils";

describe("surface and passage helpers", () => {
  it("treats keyed doors as blocked until the required item is in inventory", () => {
    expect(isPassageBlocked(hollowStarZone, 1, 2, "north", new Set())).toBe(true);
    expect(isPassageBlocked(hollowStarZone, 1, 2, "north", new Set(["transit_key"]))).toBe(false);
    expect(isPassageBlocked(hollowStarZone, 1, 3, "west", new Set())).toBe(false);
  });

  it("falls back to bootstrap wall and floor textures when zone defaults are blank", () => {
    const zone: Zone = {
      id: "fallback_zone",
      title: "Fallback",
      gridW: 1,
      gridH: 1,
      surfaceDefaults: {
        wallTexture: "",
        floorTexture: "",
        ceilingColor: "#0f1012",
      },
      rooms: [
        {
          id: "room",
          x: 0,
          y: 0,
          w: 1,
          h: 1,
          title: "Room",
          description: "",
          surfaceOverrides: {
            ceilingColor: "#223344",
          },
        },
      ],
      edges: [],
    };

    const surfaces = resolveRoomSurfaces(zone, zone.rooms[0], {
      wallTexture: "/fallback-wall.png",
      floorTexture: "/fallback-floor.png",
    });

    expect(surfaces.wallTexture).toBe("/fallback-wall.png");
    expect(surfaces.floorTexture).toBe("/fallback-floor.png");
    expect(surfaces.ceilingColor).toBe("#223344");
  });
});
