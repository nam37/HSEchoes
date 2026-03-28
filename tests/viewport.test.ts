import { describe, expect, it } from "vitest";
import { getRenderableCells, isPassageBlocked } from "../client/src/lib/dungeonUtils";
import { cells } from "../server/src/content/world";

describe("DungeonViewport passage locks", () => {
  it("treats keyed doors as blocked until the required item is in inventory", () => {
    const cell = {
      id: "moon_shrine",
      title: "Moon Shrine",
      description: "",
      x: 0,
      y: 0,
      sides: { north: "door", east: "wall", south: "open", west: "wall" },
      passageRequirements: {
        north: {
          itemId: "moon_charm",
          failureText: "Locked."
        }
      },
      wallTexture: "/wall.png",
      floorTexture: "/floor.png",
      ceilingColor: "#000"
    };

    expect(isPassageBlocked(cell, "north", new Set())).toBe(true);
    expect(isPassageBlocked(cell, "north", new Set(["moon_charm"]))).toBe(false);
    expect(isPassageBlocked(cell, "south", new Set())).toBe(false);
  });

  it("limits scene rendering to the current room and immediate neighbors", () => {
    const currentCell = cells.find((cell) => cell.id === "antechamber");
    expect(currentCell).toBeDefined();

    const renderableIds = getRenderableCells(cells, currentCell!).map((cell) => cell.id);

    expect(renderableIds).toContain("gate");
    expect(renderableIds).toContain("scriptorium");
    expect(renderableIds).toContain("armory");
    expect(renderableIds).toContain("flooded_passage");
    expect(renderableIds).toContain("antechamber");
    expect(renderableIds).not.toContain("banner_hall");
    expect(renderableIds).not.toContain("star_sanctum");
  });
});


