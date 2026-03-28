import * as jose from "jose";
import type { FastifyRequest, FastifyReply } from "fastify";

const NEON_AUTH_URL = process.env.NEON_AUTH_URL;

let JWKS: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getJWKS(): ReturnType<typeof jose.createRemoteJWKSet> | null {
  if (!JWKS && NEON_AUTH_URL) {
    JWKS = jose.createRemoteJWKSet(
      new URL(`${NEON_AUTH_URL}/.well-known/jwks.json`)
    );
  }
  return JWKS;
}

export interface AuthenticatedRequest extends FastifyRequest {
  userId: string;
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // If Neon Auth is not configured, allow all requests (dev mode)
  if (!NEON_AUTH_URL) {
    return;
  }

  const jwks = getJWKS();
  if (!jwks) {
    reply.code(503).send({ ok: false, error: "Auth service not configured." });
    return;
  }

  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    reply.code(401).send({ ok: false, error: "Authorization required." });
    return;
  }

  try {
    const token = authHeader.slice(7);
    const { payload } = await jose.jwtVerify(token, jwks, {
      issuer: new URL(NEON_AUTH_URL).origin
    });
    if (!payload.sub) {
      throw new Error("Token missing subject claim.");
    }
    (request as unknown as AuthenticatedRequest).userId = payload.sub;
  } catch {
    reply.code(401).send({ ok: false, error: "Invalid or expired token." });
  }
}
