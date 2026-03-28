import type { FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/authMiddleware.js";

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  // Scope auth to all admin routes via a child plugin scope
  await app.register(async (admin) => {
    admin.addHook("preHandler", requireAuth);

    admin.get("/api/admin/stats", async () => {
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

    admin.get("/api/admin/runs", async () => {
      const saves = await app.gameService.listSaves();
      return { ok: true, data: saves };
    });

    admin.delete<{ Params: { slotId: string } }>("/api/admin/runs/:slotId", async (request) => {
      const { slotId } = request.params;
      await app.sql`DELETE FROM runs WHERE slot_id = ${slotId}`;
      return { ok: true, data: { deleted: slotId } };
    });
  });
}
