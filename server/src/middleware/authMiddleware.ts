import type { FastifyRequest, FastifyReply } from "fastify";
import { COOKIE_NAME } from "../routes/authProxy.js";

const NEON_AUTH_URL = process.env.NEON_AUTH_URL;

export interface AuthenticatedRequest extends FastifyRequest {
  userId: string;
  userRole: string;
}

async function resolveSession(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  if (!NEON_AUTH_URL) return true; // dev mode — allow all

  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    reply.code(401).send({ ok: false, error: "Authorization required." });
    return false;
  }

  try {
    const token = authHeader.slice(7);
    const response = await fetch(`${NEON_AUTH_URL}/get-session`, {
      headers: { Cookie: `${COOKIE_NAME}=${token}` },
    });
    const data = (await response.json()) as { user?: { id?: string } } | null;
    const userId = data?.user?.id;
    if (!userId) throw new Error("No user ID in session.");
    (request as unknown as AuthenticatedRequest).userId = userId;
    return true;
  } catch {
    reply.code(401).send({ ok: false, error: "Invalid or expired token." });
    return false;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await resolveSession(request, reply);
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const ok = await resolveSession(request, reply);
  if (!ok) return;

  // In dev mode (no NEON_AUTH_URL), skip role check
  if (!NEON_AUTH_URL) return;

  const req = request as unknown as AuthenticatedRequest;
  // Look up role from DB — app.sql not available here, so we use request server
  const sql = (request.server as unknown as { sql: import("../db/database.js").Sql }).sql;
  const rows = await sql<Array<{ role: string }>>`SELECT role FROM user_profiles WHERE user_id = ${req.userId}`;
  const role = rows[0]?.role ?? "player";
  if (role !== "admin") {
    reply.code(403).send({ ok: false, error: "Admin access required." });
  }
}
