// @vitest-environment jsdom
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import App from "../client/src/App";

vi.mock("../client/src/components/DungeonViewport", () => ({
  DungeonViewport: () => <div data-testid="viewport">Viewport</div>
}));

vi.mock("../client/src/hooks/useAudio", () => ({
  useAudio: () => ({
    enabled: true,
    toggleEnabled: vi.fn(),
    volume: 0.3,
    setVolume: vi.fn(),
    play: vi.fn(),
  }),
}));

const zone = {
  id: "zone_test",
  title: "Test Zone",
  gridW: 1,
  gridH: 1,
  surfaceDefaults: {
    wallTexture: "/wall.png",
    floorTexture: "/floor.png",
    ceilingTexture: "/ceiling.png",
    ceilingColor: "#101820",
  },
  rooms: [
    {
      id: "gate",
      title: "Gate",
      description: "The start.",
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      surfaceOverrides: {
        ceilingColor: "#000000",
      },
    },
  ],
  edges: [],
};

const contentZone = {
  ...zone,
  rooms: [
    {
      ...zone.rooms[0],
      npcId: "commander_vasek",
      terminalId: "west_ring_status",
      prop: "brazier",
    },
  ],
};

const emptyBootstrap = {
  title: "Echoes of the Hollow Star",
  intro: "Descend beneath the Hollow Gate.",
  startX: 0,
  startY: 0,
  zones: [zone],
  enemies: [{ id: "test-enemy", name: "Bone Sentinel", maxHp: 10, attack: 3, defense: 1, spritePath: "/enemy.png", introLine: "Hostile contact." }],
  encounters: [],
  items: [],
  npcs: [],
  terminals: [],
  props: [],
  assets: {
    titleSplash: "/title.png",
    wallTexture: "/wall.png",
    floorTexture: "/floor.png",
    gateTexture: "/gate.png",
    panelTexture: "/panel.png",
    enemySprites: [],
    itemIcons: []
  },
  saves: []
};

const contentBootstrap = {
  ...emptyBootstrap,
  zones: [contentZone],
  npcs: [
    {
      id: "commander_vasek",
      name: "Commander Vasek",
      role: "Station Commander, West Ring",
      portraitAssetId: "/portraits/vasek.png",
      dialogue: [],
    },
  ],
  terminals: [
    {
      id: "west_ring_status",
      title: "West Ring Relay Terminal",
      logText: "System status nominal.",
      xpReward: 5,
    },
  ],
  props: [
    {
      id: "brazier",
      name: "Emergency Brazier",
      description: "A wavering blue flame casts a low emergency glow.",
      iconLabel: "OBJ",
    },
  ],
};

const occupiedBootstrap = {
  ...emptyBootstrap,
  saves: [
    {
      slotId: "slot-occupied",
      slotNumber: 2,
      mode: "explore",
      status: "active",
      roomId: "gate",
      roomTitle: "Gate",
      level: 3,
      updatedAt: "2026-04-01T10:00:00.000Z",
    },
  ],
};

const runEnvelope = {
  run: {
    slotId: "slot-1",
    mode: "explore",
    status: "active",
    zoneId: "zone_test",
    roomId: "gate",
    posX: 0,
    posY: 0,
    previousRoomId: null,
    facing: "north",
    discoveredRoomIds: ["gate"],
    clearedEncounterIds: [],
    collectedItemIds: [],
    player: {
      hp: 12,
      maxHp: 12,
      baseAttack: 2,
      baseDefense: 0,
      credits: 0,
      level: 1,
      xp: 0,
      xpToNextLevel: 50,
      inventory: [],
      equipped: { weapon: null, armor: null, accessory: null }
    },
    combat: null,
    activeQuests: [],
    completedQuestIds: [],
    completedQuests: [],
    messages: [],
    interactedTerminalIds: [],
    log: ["Ready."],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
};

const combatEnvelope = {
  run: {
    ...runEnvelope.run,
    mode: "combat",
    combat: {
      encounterId: "test-encounter",
      enemyId: "test-enemy",
      enemyName: "Bone Sentinel",
      enemyHp: 9,
      enemyMaxHp: 12,
      defending: false,
      canFlee: false
    },
    log: ["A sentinel bars the way."]
  }
};

const defeatEnvelope = {
  run: {
    ...runEnvelope.run,
    mode: "defeat",
    status: "defeat",
    log: ["You are dead."]
  }
};

function textBody(data: unknown): string {
  return JSON.stringify({ ok: true, data });
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.stubGlobal("confirm", vi.fn(() => true));
});

describe("App", () => {
  it("renders three save slots and starts a new run from an empty slot", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => ({
      text: async () => {
        const url = String(input);
        if (url.includes("bootstrap")) return textBody(emptyBootstrap);
        if (url.includes("/api/game/new-run")) return textBody(runEnvelope);
        throw new Error(`Unhandled request: ${url} ${init?.method ?? "GET"}`);
      }
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { container, root } = mountApp();
    await flush();

    expect(container.textContent).toContain("Select a slot");
    expect(container.textContent).toContain("Slot 1");
    expect(container.textContent).toContain("Slot 2");
    expect(container.textContent).toContain("Slot 3");

    const newGameButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "New Game");
    expect(newGameButton).toBeTruthy();

    newGameButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();

    const newRunCall = fetchMock.mock.calls.find(([input]) => String(input).includes("/api/game/new-run"));
    expect(String(newRunCall?.[1]?.body)).toContain("\"slotNumber\":1");
    expect(container.textContent).toContain("Movement");
    expect(container.textContent).toContain("Save");
    expect(container.querySelector("[data-testid='viewport']")).not.toBeNull();

    root.unmount();
    container.remove();
  });

  it("opens settings in a closable modal instead of expanding the landing header", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => ({
      text: async () => {
        const url = String(input);
        if (url.includes("bootstrap")) return textBody(emptyBootstrap);
        throw new Error(`Unhandled request: ${url} ${init?.method ?? "GET"}`);
      }
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { container, root } = mountApp();
    await flush();

    const settingsButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "Settings");
    settingsButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();

    expect(container.querySelector("[aria-label='Settings']")).not.toBeNull();
    expect(container.textContent).toContain("System Controls");
    expect(container.textContent).toContain("Music");

    const closeButton = container.querySelector("[aria-label='Close settings']");
    closeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();

    expect(container.querySelector("[aria-label='Settings']")).toBeNull();

    root.unmount();
    container.remove();
  });

  it("continues an occupied slot via its run id", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => ({
      text: async () => {
        const url = String(input);
        if (url.includes("bootstrap")) return textBody(occupiedBootstrap);
        if (url.includes("/api/game/run/slot-occupied")) return textBody(runEnvelope);
        throw new Error(`Unhandled request: ${url} ${init?.method ?? "GET"}`);
      }
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { container, root } = mountApp();
    await flush();

    const continueButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "Continue");
    continueButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();

    expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/api/game/run/slot-occupied"))).toBe(true);
    expect(container.textContent).toContain("Movement");

    root.unmount();
    container.remove();
  });

  it("overwrites an occupied slot after confirmation", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => ({
      text: async () => {
        const url = String(input);
        if (url.includes("bootstrap")) return textBody(occupiedBootstrap);
        if (url.includes("/api/game/run/slot-occupied") && init?.method === "DELETE") return textBody({ deleted: "slot-occupied" });
        if (url.includes("/api/game/new-run")) return textBody(runEnvelope);
        throw new Error(`Unhandled request: ${url} ${init?.method ?? "GET"}`);
      }
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { container, root } = mountApp();
    await flush();

    const overwriteButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "Overwrite");
    overwriteButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();

    expect(fetchMock.mock.calls.some(([input, init]) => String(input).includes("/api/game/run/slot-occupied") && init?.method === "DELETE")).toBe(true);
    const newRunCall = fetchMock.mock.calls.find(([input]) => String(input).includes("/api/game/new-run"));
    expect(String(newRunCall?.[1]?.body)).toContain("\"slotNumber\":2");
    expect(container.textContent).toContain("Movement");

    root.unmount();
    container.remove();
  });

  it("deletes an occupied slot and redraws the slot picker", async () => {
    let bootstrapCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => ({
      text: async () => {
        const url = String(input);
        if (url.includes("bootstrap")) {
          bootstrapCalls += 1;
          return textBody(bootstrapCalls === 1 ? occupiedBootstrap : emptyBootstrap);
        }
        if (url.includes("/api/game/run/slot-occupied") && init?.method === "DELETE") return textBody({ deleted: "slot-occupied" });
        throw new Error(`Unhandled request: ${url} ${init?.method ?? "GET"}`);
      }
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { container, root } = mountApp();
    await flush();

    const deleteButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "Delete");
    deleteButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();

    expect(container.textContent).toContain("No transmission stored.");
    expect(container.textContent).toContain("New Game");

    root.unmount();
    container.remove();
  });

  it("maps arrow keys to movement commands including back", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => ({
      text: async () => {
        const url = String(input);
        if (url.includes("bootstrap")) return textBody(emptyBootstrap);
        if (url.includes("/api/game/new-run")) return textBody(runEnvelope);
        if (url.includes("/api/game/move")) return textBody(runEnvelope);
        throw new Error(`Unhandled request: ${url} ${init?.method ?? "GET"}`);
      }
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { container, root } = mountApp();
    await flush();

    const newRunButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "New Game");
    newRunButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await flush();

    const moveCall = fetchMock.mock.calls.find(([input]) => String(input).includes("/api/game/move"));
    expect(moveCall).toBeTruthy();
    expect(String(moveCall?.[1]?.body)).toContain("\"command\":\"back\"");

    root.unmount();
    container.remove();
  });

  it("surfaces a visible combat panel when a run is in combat", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => ({
      text: async () => {
        const url = String(input);
        if (url.includes("bootstrap")) return textBody(emptyBootstrap);
        if (url.includes("/api/game/new-run")) return textBody(combatEnvelope);
        throw new Error(`Unhandled request: ${url} ${init?.method ?? "GET"}`);
      }
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { container, root } = mountApp();
    await flush();

    const newRunButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "New Game");
    newRunButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();

    expect(container.textContent).toContain("Combat");
    expect(container.textContent).toContain("Bone Sentinel");

    root.unmount();
    container.remove();
  });

  it("renders npc, terminal, and room object cards in the room-content stack", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => ({
      text: async () => {
        const url = String(input);
        if (url.includes("bootstrap")) return textBody(contentBootstrap);
        if (url.includes("/api/game/new-run")) return textBody(runEnvelope);
        throw new Error(`Unhandled request: ${url} ${init?.method ?? "GET"}`);
      }
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { container, root } = mountApp();
    await flush();

    const newRunButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "New Game");
    newRunButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();

    const stack = container.querySelector("[aria-label='Room contents']");
    const kinds = [...container.querySelectorAll("[data-kind]")].map((node) => node.getAttribute("data-kind"));

    expect(stack).not.toBeNull();
    expect(kinds).toEqual(["npc", "terminal", "prop"]);
    expect(container.textContent).toContain("Commander Vasek");
    expect(container.textContent).toContain("West Ring Relay Terminal");
    expect(container.textContent).toContain("Emergency Brazier");
    expect(container.textContent).not.toContain("brazier");

    root.unmount();
    container.remove();
  });

  it("keeps the combat card first while stacking other room contents underneath", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => ({
      text: async () => {
        const url = String(input);
        if (url.includes("bootstrap")) return textBody(contentBootstrap);
        if (url.includes("/api/game/new-run")) return textBody(combatEnvelope);
        throw new Error(`Unhandled request: ${url} ${init?.method ?? "GET"}`);
      }
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { container, root } = mountApp();
    await flush();

    const newRunButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "New Game");
    newRunButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();

    const kinds = [...container.querySelectorAll("[data-kind]")].map((node) => node.getAttribute("data-kind"));

    expect(kinds).toEqual(["combat", "npc", "terminal", "prop"]);
    expect(container.textContent).toContain("Bone Sentinel");
    expect(container.textContent).toContain("Commander Vasek");
    expect(container.textContent).toContain("West Ring Relay Terminal");
    expect(container.textContent).toContain("Emergency Brazier");

    root.unmount();
    container.remove();
  });

  it("returns to the save slots from a defeat state without using a latest-save button", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => ({
      text: async () => {
        const url = String(input);
        if (url.includes("bootstrap")) return textBody(emptyBootstrap);
        if (url.includes("/api/game/new-run")) return textBody(defeatEnvelope);
        throw new Error(`Unhandled request: ${url} ${init?.method ?? "GET"}`);
      }
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { container, root } = mountApp();
    await flush();

    const newRunButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "New Game");
    newRunButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();

    expect(container.textContent).toContain("Return to Save Slots");
    expect(container.textContent).not.toContain("Load Latest");

    const returnButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "Return to Save Slots");
    returnButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();

    expect(container.textContent).toContain("Select a slot");
    expect(container.textContent).toContain("Slot 1");

    root.unmount();
    container.remove();
  });
});

function mountApp(): { container: HTMLDivElement; root: ReturnType<typeof createRoot> } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(<App />);
  return { container, root };
}

async function flush(): Promise<void> {
  for (let index = 0; index < 6; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
