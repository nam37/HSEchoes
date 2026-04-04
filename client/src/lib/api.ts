import type {
  ApiResult,
  BootstrapData,
  CombatPayload,
  Encounter,
  Enemy,
  InteractPayload,
  InteractResult,
  InventoryPayload,
  Item,
  MovePayload,
  QuestDef,
  RunEnvelope,
  SaveSummary,
  Zone
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

export interface WorldContent {
  zones: Zone[];
  enemies: Enemy[];
  encounters: Encounter[];
  items: Item[];
  quests: QuestDef[];
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
  markMessagesRead: (slotId: string) => request<RunEnvelope>(`/api/game/run/${slotId}/messages/read`, { method: "POST" }),
  interact: (payload: InteractPayload) => request<InteractResult>("/api/game/interact", { method: "POST", body: JSON.stringify(payload) }),

  // Admin — runs
  adminStats: () => request<AdminStats>("/api/admin/stats"),
  adminRuns: () => request<SaveSummary[]>("/api/admin/runs"),
  adminDeleteRun: (slotId: string) => request<{ deleted: string }>(`/api/admin/runs/${slotId}`, { method: "DELETE" }),

  // Admin — world content
  adminWorld: () => request<WorldContent>("/api/admin/world"),
  adminUpsertZone: (id: string, zone: Zone) => request<Zone>(`/api/admin/world/zones/${id}`, { method: "PUT", body: JSON.stringify(zone) }),
  adminDeleteZone: (id: string) => request<{ deleted: string }>(`/api/admin/world/zones/${id}`, { method: "DELETE" }),
  adminUpsertEnemy: (id: string, enemy: Enemy) => request<Enemy>(`/api/admin/world/enemies/${id}`, { method: "PUT", body: JSON.stringify(enemy) }),
  adminDeleteEnemy: (id: string) => request<{ deleted: string }>(`/api/admin/world/enemies/${id}`, { method: "DELETE" }),
  adminUpsertItem: (id: string, item: Item) => request<Item>(`/api/admin/world/items/${id}`, { method: "PUT", body: JSON.stringify(item) }),
  adminDeleteItem: (id: string) => request<{ deleted: string }>(`/api/admin/world/items/${id}`, { method: "DELETE" }),
  adminUpsertEncounter: (id: string, enc: Encounter) => request<Encounter>(`/api/admin/world/encounters/${id}`, { method: "PUT", body: JSON.stringify(enc) }),
  adminDeleteEncounter: (id: string) => request<{ deleted: string }>(`/api/admin/world/encounters/${id}`, { method: "DELETE" }),
  adminUpsertQuest: (id: string, quest: QuestDef) => request<QuestDef>(`/api/admin/world/quests/${id}`, { method: "PUT", body: JSON.stringify(quest) }),
  adminDeleteQuest: (id: string) => request<{ deleted: string }>(`/api/admin/world/quests/${id}`, { method: "DELETE" }),
  adminReload: () => request<{ reloaded: boolean }>("/api/admin/reload", { method: "POST" }),

  // Admin — users
  adminUsers: () => request<UserProfile[]>("/api/admin/users"),
  adminSetRole: (userId: string, role: string) => request<{ userId: string; role: string }>(`/api/admin/users/${userId}/role`, { method: "PUT", body: JSON.stringify({ role }) })
};

export interface UserProfile {
  userId: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}
