import type { FastifyInstance } from "fastify";
import type { CombatPayload, InventoryPayload, MovePayload } from "../../../shared/src/index.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/authMiddleware.js";

function uid(request: unknown): string {
  return (request as AuthenticatedRequest).userId ?? "";
}

export async function registerGameRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAuth);

  app.get("/api/game/bootstrap", async (request) => ({ ok: true, data: await app.gameService.getBootstrap(uid(request)) }));

  app.post("/api/game/new-run", async (request) => ({ ok: true, data: { run: await app.gameService.createNewRun(uid(request)) } }));

  app.get<{ Params: { slotId: string } }>("/api/game/run/:slotId", async (request) => ({
    ok: true,
    data: { run: await app.gameService.loadRun(request.params.slotId, uid(request)) }
  }));

  app.post<{ Body: MovePayload }>("/api/game/move", async (request) => ({
    ok: true,
    data: await app.gameService.move(request.body, uid(request))
  }));

  app.post<{ Body: CombatPayload }>("/api/game/combat", async (request) => ({
    ok: true,
    data: await app.gameService.handleCombat(request.body.slotId, request.body.action, uid(request), request.body.itemId)
  }));

  app.post<{ Body: InventoryPayload }>("/api/game/inventory/use", async (request) => ({
    ok: true,
    data: await app.gameService.useItem(request.body.slotId, request.body.itemId, uid(request))
  }));

  app.post<{ Body: InventoryPayload }>("/api/game/inventory/equip", async (request) => ({
    ok: true,
    data: await app.gameService.equipItem(request.body.slotId, request.body.itemId, uid(request))
  }));

  app.post<{ Params: { slotId: string } }>("/api/game/save/:slotId", async (request) => ({
    ok: true,
    data: await app.gameService.saveRun(request.params.slotId, uid(request))
  }));
}
