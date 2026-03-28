import type {
  ApiResult,
  BootstrapData,
  CombatPayload,
  InventoryPayload,
  MovePayload,
  RunEnvelope,
  SaveSummary
} from "../../shared/src/index";

// Module-level auth token, set by Root on session load
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  const response = await fetch(input, { ...init, headers });

  // Guard against empty or non-JSON responses
  const text = await response.text();
  let payload: ApiResult<T>;
  try {
    payload = JSON.parse(text) as ApiResult<T>;
  } catch {
    throw new Error(
      `Server error (${response.status}): ${text.slice(0, 200) || response.statusText || "Empty response"}`
    );
  }

  if (!payload.ok || !payload.data) {
    throw new Error(payload.error ?? "Request failed.");
  }
  return payload.data;
}

export interface AdminStats {
  totalRuns: number;
  activeRuns: number;
  defeatedRuns: number;
  victoryRuns: number;
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
  saveRun: (slotId: string) => request<RunEnvelope>(`/api/game/save/${slotId}`, { method: "POST" }),

  // Admin
  adminStats: () => request<AdminStats>("/api/admin/stats"),
  adminRuns: () => request<SaveSummary[]>("/api/admin/runs"),
  adminDeleteRun: (slotId: string) => request<{ deleted: string }>(`/api/admin/runs/${slotId}`, { method: "DELETE" })
};
