import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../middleware/authMiddleware.js";
import type { Zone, Enemy, Encounter, Item } from "../../../shared/src/index.js";

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAdmin);

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
    await app.gameService.upsertWorldEntity("zone", id, zone);
    return { ok: true, data: zone };
  });

  app.delete<{ Params: { id: string } }>("/api/admin/world/zones/:id", async (request) => {
    await app.gameService.deleteWorldEntity("zone", request.params.id);
    return { ok: true, data: { deleted: request.params.id } };
  });

  // Enemies
  app.put<{ Params: { id: string }; Body: Enemy }>("/api/admin/world/enemies/:id", async (request) => {
    const { id } = request.params;
    const enemy = { ...request.body, id };
    await app.gameService.upsertWorldEntity("enemy", id, enemy);
    return { ok: true, data: enemy };
  });

  app.delete<{ Params: { id: string } }>("/api/admin/world/enemies/:id", async (request) => {
    await app.gameService.deleteWorldEntity("enemy", request.params.id);
    return { ok: true, data: { deleted: request.params.id } };
  });

  // Items
  app.put<{ Params: { id: string }; Body: Item }>("/api/admin/world/items/:id", async (request) => {
    const { id } = request.params;
    const item = { ...request.body, id };
    await app.gameService.upsertWorldEntity("item", id, item);
    return { ok: true, data: item };
  });

  app.delete<{ Params: { id: string } }>("/api/admin/world/items/:id", async (request) => {
    await app.gameService.deleteWorldEntity("item", request.params.id);
    return { ok: true, data: { deleted: request.params.id } };
  });

  // Encounters
  app.put<{ Params: { id: string }; Body: Encounter }>("/api/admin/world/encounters/:id", async (request) => {
    const { id } = request.params;
    const encounter = { ...request.body, id };
    await app.gameService.upsertWorldEntity("encounter", id, encounter);
    return { ok: true, data: encounter };
  });

  app.delete<{ Params: { id: string } }>("/api/admin/world/encounters/:id", async (request) => {
    await app.gameService.deleteWorldEntity("encounter", request.params.id);
    return { ok: true, data: { deleted: request.params.id } };
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
