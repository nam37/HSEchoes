import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../client/src/lib/api";

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
      credits: 0,
      level: 1,
      xp: 0,
      xpToNextLevel: 50,
      inventory: [],
      equipped: { weapon: null, armor: null, accessory: null }
    },
    combat: null,
    log: ["Ready."],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
};

function mockFetch(data: unknown) {
  const body = JSON.stringify({ ok: true, data });
  return vi.fn(async () => ({ text: async () => body }));
}

describe("client api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch(runEnvelope));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("adds a JSON content type for slot-aware new-game requests", async () => {
    await api.newRun({ slotNumber: 2 });

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);

    expect(init?.method).toBe("POST");
    expect(String(init?.body)).toContain("\"slotNumber\":2");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("adds a JSON content type when a request body is present", async () => {
    await api.move({ slotId: "slot-1", command: "forward" });

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);

    expect(init?.body).toContain("forward");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("does not force a JSON content type for empty-body deletes", async () => {
    await api.deleteRun("slot-1");

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);

    expect(init?.method).toBe("DELETE");
    expect(init?.body).toBeUndefined();
    expect(headers.has("Content-Type")).toBe(false);
  });
});
