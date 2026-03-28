import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/authMiddleware.js";

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  // preHandler scoped to this plugin — does not affect game routes
  app.addHook("preHandler", requireAuth);

  app.get("/api/admin/stats", async () => {
    const saves = await app.gameService.listSaves();
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
    const saves = await app.gameService.listSaves();
    return { ok: true, data: saves };
  });

  app.delete<{ Params: { slotId: string } }>("/api/admin/runs/:slotId", async (request) => {
    const { slotId } = request.params;
    await app.sql`DELETE FROM runs WHERE slot_id = ${slotId}`;
    return { ok: true, data: { deleted: slotId } };
  });
}
