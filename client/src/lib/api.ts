import type { ApiResult, BootstrapData, CombatPayload, InventoryPayload, MovePayload, RunEnvelope } from "../../shared/src/index";

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers
  });
  const payload = await response.json() as ApiResult<T>;
  if (!payload.ok || !payload.data) {
    throw new Error(payload.error ?? "Request failed.");
  }
  return payload.data;
}

export const api = {
  bootstrap: () => request<BootstrapData>("/api/game/bootstrap"),
  newRun: () => request<RunEnvelope>("/api/game/new-run", { method: "POST" }),
  loadRun: (slotId: string) => request<RunEnvelope>(`/api/game/run/${slotId}`),
  move: (payload: MovePayload) => request<RunEnvelope>("/api/game/move", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  combat: (payload: CombatPayload) => request<RunEnvelope>("/api/game/combat", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  useItem: (payload: InventoryPayload) => request<RunEnvelope>("/api/game/inventory/use", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  equipItem: (payload: InventoryPayload) => request<RunEnvelope>("/api/game/inventory/equip", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  saveRun: (slotId: string) => request<RunEnvelope>(`/api/game/save/${slotId}`, { method: "POST" })
};
