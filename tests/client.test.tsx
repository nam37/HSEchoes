// @vitest-environment jsdom
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import App from "../client/src/App";

vi.mock("../client/src/components/DungeonViewport", () => ({
  DungeonViewport: () => <div data-testid="viewport">Viewport</div>
}));

const bootstrap = {
  title: "Echoes of the Hollow Star",
  intro: "Descend beneath the Hollow Gate.",
  startCellId: "gate",
  cells: [
    {
      id: "gate",
      title: "Gate",
      description: "The start.",
      x: 0,
      y: 0,
      sides: { north: "wall", east: "wall", south: "wall", west: "wall" },
      wallTexture: "/wall.png",
      floorTexture: "/floor.png",
      ceilingColor: "#000"
    }
  ],
  enemies: [],
  encounters: [],
  items: [],
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
    cellId: "gate",
    facing: "north",
    discoveredCellIds: ["gate"],
    visitedCellIds: ["gate"],
    clearedEncounterIds: [],
    collectedItemIds: [],
    player: {
      hp: 12,
      maxHp: 12,
      baseAttack: 2,
      baseDefense: 0,
      gold: 0,
      inventory: [],
      equipped: { weapon: null, armor: null, accessory: null }
    },
    combat: null,
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
    expect(container.textContent).toContain("New Run");
    expect(container.textContent).not.toContain("Explorer");

    const newRunButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "New Run") as HTMLButtonElement | undefined;
    expect(newRunButton).toBeTruthy();

    newRunButton?.click();
    await flush();

    expect(container.textContent).toContain("Explorer");
    expect(container.textContent).toContain("Movement");
    expect(container.textContent).toContain("Save");
    expect(container.querySelector(".landing-stage")).toBeNull();
    expect(container.textContent).not.toContain("New Run");

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

    const newRunButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "New Run") as HTMLButtonElement | undefined;
    newRunButton?.click();
    await flush();

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await flush();

    const moveCall = fetchMock.mock.calls.find(([input]) => String(input).includes("/api/game/move"));
    expect(moveCall).toBeTruthy();
    expect(String(moveCall?.[1]?.body)).toContain('"command":"back"');

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

    const newRunButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "New Run") as HTMLButtonElement | undefined;
    newRunButton?.click();
    await flush();

    expect(container.textContent).toContain("Combat Engaged");
    expect(container.textContent).toContain("Bone Sentinel");
    expect(container.textContent).toContain("Movement is locked");

    root.unmount();
    container.remove();
  });
});

async function flush(): Promise<void> {
  for (let index = 0; index < 6; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
