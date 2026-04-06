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

const bootstrap = {
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

function textBody(data: unknown): string {
  return JSON.stringify({ ok: true, data });
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("shows the landing panel before a run and swaps to the game layout after starting", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo) => ({
      text: async () => {
        if (String(input).includes("bootstrap")) return textBody(bootstrap);
        return textBody(runEnvelope);
      }
    })));

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    root.render(<App />);
    await flush();

    expect(container.textContent).toContain("Echoes of the Hollow Star");
    expect(container.textContent).toContain("Begin!");

    const newRunButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "Begin!");
    expect(newRunButton).toBeTruthy();

    newRunButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();

    expect(container.textContent).toContain("Movement");
    expect(container.textContent).toContain("Save");
    expect(container.querySelector("[data-testid='viewport']")).not.toBeNull();

    root.unmount();
    container.remove();
  });

  it("maps arrow keys to movement commands including back", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo) => ({
      text: async () => {
        if (String(input).includes("bootstrap")) return textBody(bootstrap);
        return textBody(runEnvelope);
      }
    }));
    vi.stubGlobal("fetch", fetchMock);

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    root.render(<App />);
    await flush();

    const newRunButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "Begin!");
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
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo) => ({
      text: async () => {
        if (String(input).includes("bootstrap")) return textBody(bootstrap);
        return textBody(combatEnvelope);
      }
    })));

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    root.render(<App />);
    await flush();

    const newRunButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "Begin!");
    newRunButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();

    expect(container.textContent).toContain("Combat");
    expect(container.textContent).toContain("Bone Sentinel");

    root.unmount();
    container.remove();
  });
});

async function flush(): Promise<void> {
  for (let index = 0; index < 6; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
