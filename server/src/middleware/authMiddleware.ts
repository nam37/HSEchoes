import type { FastifyRequest, FastifyReply } from "fastify";
import { COOKIE_NAME } from "../routes/authProxy.js";

const NEON_AUTH_URL = process.env.NEON_AUTH_URL;

export interface AuthenticatedRequest extends FastifyRequest {
  userId: string;
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // If Neon Auth is not configured, allow all requests (dev mode)
  if (!NEON_AUTH_URL) {
    return;
  }

  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    reply.code(401).send({ ok: false, error: "Authorization required." });
    return;
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
  } catch {
    reply.code(401).send({ ok: false, error: "Invalid or expired token." });
  }
}
