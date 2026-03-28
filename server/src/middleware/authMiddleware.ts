import type { FastifyRequest, FastifyReply } from "fastify";

const NEON_AUTH_URL = process.env.NEON_AUTH_URL;

export interface AuthenticatedRequest extends FastifyRequest {
  userId: string;
}

interface SessionResponse {
  session?: { userId?: string };
  user?: { id?: string };
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
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Session verification failed.");
    const data = (await response.json()) as SessionResponse | null;
    const userId = data?.user?.id ?? data?.session?.userId;
    if (!userId) throw new Error("No user ID in session.");
    (request as unknown as AuthenticatedRequest).userId = userId;
  } catch {
    reply.code(401).send({ ok: false, error: "Invalid or expired token." });
  }
}
