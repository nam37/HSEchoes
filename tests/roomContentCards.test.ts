import { describe, expect, it } from "vitest";
import { buildRoomContentCards } from "../client/src/lib/roomContentCards";

describe("buildRoomContentCards", () => {
  it("orders combat, npc, terminal, and prop cards while omitting missing references", () => {
    const cards = buildRoomContentCards({
      room: {
        id: "gate",
        title: "Gate",
        description: "The start.",
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        npcId: "npc-1",
        terminalId: "terminal-1",
        prop: "prop-1",
      },
      combat: {
        encounterId: "enc-1",
        enemyId: "enemy-1",
        enemyName: "Bone Sentinel",
        enemyHp: 8,
        enemyMaxHp: 12,
        defending: false,
        canFlee: false,
      },
      npcMap: new Map([
        ["npc-1", { id: "npc-1", name: "Commander Vasek", role: "Station Commander", portraitAssetId: "/portraits/vasek.png", dialogue: [] }],
      ]),
      terminalMap: new Map([
        ["terminal-1", { id: "terminal-1", title: "West Ring Relay Terminal", logText: "System status nominal." }],
      ]),
      propMap: new Map([
        ["prop-1", { id: "prop-1", name: "Emergency Brazier", description: "A wavering blue flame casts a low emergency glow.", iconLabel: "OBJ" }],
      ]),
    });

    expect(cards.map((card) => card.kind)).toEqual(["combat", "npc", "terminal", "prop"]);
    expect(cards[3].title).toBe("Emergency Brazier");
    expect(cards[3].subtitle).toContain("blue flame");
  });

  it("returns an empty list when there is no visible room content", () => {
    const cards = buildRoomContentCards({
      room: {
        id: "gate",
        title: "Gate",
        description: "The start.",
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        prop: "missing-prop",
      },
      combat: null,
      npcMap: new Map(),
      terminalMap: new Map(),
      propMap: new Map(),
    });

    expect(cards).toEqual([]);
  });
});
