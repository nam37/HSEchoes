import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../middleware/authMiddleware.js";
import type { Zone, Enemy, Encounter, Item, NPC, PropDef, QuestDef, Terminal } from "../../../shared/src/index.js";

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAdmin);

  async function persistWorldEntity<T>(kind: string, id: string, entity: T): Promise<{ ok: true; data: T }> {
    await app.gameService.upsertWorldEntity(kind, id, entity);
    await app.gameService.reload();
    return { ok: true, data: entity };
  }

  async function removeWorldEntity(kind: string, id: string): Promise<{ ok: true; data: { deleted: string } }> {
    await app.gameService.deleteWorldEntity(kind, id);
    await app.gameService.reload();
    return { ok: true, data: { deleted: id } };
  }

  app.get("/api/admin/stats", async () => {
    const saves = await app.gameService.listAllSaves();
    return {
      ok: true,
      data: {
        totalRuns: saves.length,
        activeRuns: saves.filter((s) => s.status === "active").length,
        defeatedRuns: saves.filter((s) => s.status === "defeat").length,
        victoryRuns: saves.filter((s) => s.status === "victory").length
      }
    };
  });

  app.get("/api/admin/runs", async () => {
    const saves = await app.gameService.listAllSaves();
    return { ok: true, data: saves };
  });

  app.delete<{ Params: { slotId: string } }>("/api/admin/runs/:slotId", async (request) => {
    const { slotId } = request.params;
    await app.sql`DELETE FROM runs WHERE slot_id = ${slotId}`;
    return { ok: true, data: { deleted: slotId } };
  });

  // ── World data ────────────────────────────────────────────────────────────

  app.get("/api/admin/world", async () => {
    const data = await app.gameService.getWorldData();
    return { ok: true, data };
  });

  // Zones
  app.put<{ Params: { id: string }; Body: Zone }>("/api/admin/world/zones/:id", async (request) => {
    const { id } = request.params;
    const zone = { ...request.body, id };
    return persistWorldEntity("zone", id, zone);
  });

  app.delete<{ Params: { id: string } }>("/api/admin/world/zones/:id", async (request) => {
    return removeWorldEntity("zone", request.params.id);
  });

  // Enemies
  app.put<{ Params: { id: string }; Body: Enemy }>("/api/admin/world/enemies/:id", async (request) => {
    const { id } = request.params;
    const enemy = { ...request.body, id };
    return persistWorldEntity("enemy", id, enemy);
  });

  app.delete<{ Params: { id: string } }>("/api/admin/world/enemies/:id", async (request) => {
    return removeWorldEntity("enemy", request.params.id);
  });

  // Items
  app.put<{ Params: { id: string }; Body: Item }>("/api/admin/world/items/:id", async (request) => {
    const { id } = request.params;
    const item = { ...request.body, id };
    return persistWorldEntity("item", id, item);
  });

  app.delete<{ Params: { id: string } }>("/api/admin/world/items/:id", async (request) => {
    return removeWorldEntity("item", request.params.id);
  });

  // NPCs
  app.put<{ Params: { id: string }; Body: NPC }>("/api/admin/world/npcs/:id", async (request) => {
    const { id } = request.params;
    const npc = { ...request.body, id };
    return persistWorldEntity("npc", id, npc);
  });

  app.delete<{ Params: { id: string } }>("/api/admin/world/npcs/:id", async (request) => {
    return removeWorldEntity("npc", request.params.id);
  });

  // Terminals
  app.put<{ Params: { id: string }; Body: Terminal }>("/api/admin/world/terminals/:id", async (request) => {
    const { id } = request.params;
    const terminal = { ...request.body, id };
    return persistWorldEntity("terminal", id, terminal);
  });

  app.delete<{ Params: { id: string } }>("/api/admin/world/terminals/:id", async (request) => {
    return removeWorldEntity("terminal", request.params.id);
  });

  // Encounters
  app.put<{ Params: { id: string }; Body: Encounter }>("/api/admin/world/encounters/:id", async (request) => {
    const { id } = request.params;
    const encounter = { ...request.body, id };
    return persistWorldEntity("encounter", id, encounter);
  });

  app.delete<{ Params: { id: string } }>("/api/admin/world/encounters/:id", async (request) => {
    return removeWorldEntity("encounter", request.params.id);
  });

  // Props
  app.put<{ Params: { id: string }; Body: PropDef }>("/api/admin/world/props/:id", async (request) => {
    const { id } = request.params;
    const prop = { ...request.body, id };
    return persistWorldEntity("prop", id, prop);
  });

  app.delete<{ Params: { id: string } }>("/api/admin/world/props/:id", async (request) => {
    return removeWorldEntity("prop", request.params.id);
  });

  // Quests
  app.put<{ Params: { id: string }; Body: QuestDef }>("/api/admin/world/quests/:id", async (request) => {
    const { id } = request.params;
    const quest = { ...request.body, id };
    return persistWorldEntity("quest", id, quest);
  });

  app.delete<{ Params: { id: string } }>("/api/admin/world/quests/:id", async (request) => {
    return removeWorldEntity("quest", request.params.id);
  });

  // Reload in-memory cache from DB
  app.post("/api/admin/reload", async () => {
    await app.gameService.reload();
    return { ok: true, data: { reloaded: true } };
  });

  // ── User management ───────────────────────────────────────────────────────

  app.get("/api/admin/users", async () => {
    const rows = await app.sql<Array<{ user_id: string; email: string; role: string; created_at: string; updated_at: string }>>`
      SELECT user_id, email, role, created_at, updated_at FROM user_profiles ORDER BY created_at DESC
    `;
    return { ok: true, data: rows.map((r) => ({ userId: r.user_id, email: r.email, role: r.role, createdAt: r.created_at, updatedAt: r.updated_at })) };
  });

  app.put<{ Params: { userId: string }; Body: { role: string } }>("/api/admin/users/:userId/role", async (request) => {
    const { userId } = request.params;
    const { role } = request.body;
    if (!["player", "admin"].includes(role)) {
      throw new Error("Invalid role. Must be 'player' or 'admin'.");
    }
    const now = new Date().toISOString();
    await app.sql`UPDATE user_profiles SET role = ${role}, updated_at = ${now} WHERE user_id = ${userId}`;
    return { ok: true, data: { userId, role } };
  });
}
