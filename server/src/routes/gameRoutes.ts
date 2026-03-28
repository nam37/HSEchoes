import type { FastifyInstance } from "fastify";
import type { CombatPayload, InventoryPayload, MovePayload } from "../../../shared/src/index.js";
import { requireAuth } from "../middleware/authMiddleware.js";

export async function registerGameRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAuth);

  app.get("/api/game/bootstrap", async () => ({ ok: true, data: await app.gameService.getBootstrap() }));

  app.post("/api/game/new-run", async () => ({ ok: true, data: { run: await app.gameService.createNewRun() } }));

  app.get<{ Params: { slotId: string } }>("/api/game/run/:slotId", async (request) => ({
    ok: true,
    data: { run: await app.gameService.loadRun(request.params.slotId) }
  }));

  app.post<{ Body: MovePayload }>("/api/game/move", async (request) => ({
    ok: true,
    data: await app.gameService.move(request.body)
  }));

  app.post<{ Body: CombatPayload }>("/api/game/combat", async (request) => ({
    ok: true,
    data: await app.gameService.handleCombat(request.body.slotId, request.body.action, request.body.itemId)
  }));

  app.post<{ Body: InventoryPayload }>("/api/game/inventory/use", async (request) => ({
    ok: true,
    data: await app.gameService.useItem(request.body.slotId, request.body.itemId)
  }));

  app.post<{ Body: InventoryPayload }>("/api/game/inventory/equip", async (request) => ({
    ok: true,
    data: await app.gameService.equipItem(request.body.slotId, request.body.itemId)
  }));

  app.post<{ Params: { slotId: string } }>("/api/game/save/:slotId", async (request) => ({
    ok: true,
    data: await app.gameService.saveRun(request.params.slotId)
  }));
}
