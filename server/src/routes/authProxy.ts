import type { FastifyInstance } from "fastify";
import type { Sql } from "../db/database.js";

const NEON_AUTH_URL = process.env.NEON_AUTH_URL;
export const COOKIE_NAME = "__Secure-neon-auth.session_token";

async function upsertProfile(sql: Sql, userId: string, email: string): Promise<string> {
  const now = new Date().toISOString();
  await sql`
    INSERT INTO user_profiles (user_id, email, role, created_at, updated_at)
    VALUES (${userId}, ${email}, 'player', ${now}, ${now})
    ON CONFLICT (user_id) DO UPDATE SET
      email      = EXCLUDED.email,
      updated_at = EXCLUDED.updated_at
  `;
  const rows = await sql<Array<{ role: string }>>`SELECT role FROM user_profiles WHERE user_id = ${userId}`;
  return rows[0]?.role ?? "player";
}

// Extracts the signed cookie value from a Set-Cookie header string
function extractSignedToken(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/__Secure-neon-auth\.session_token=([^;]+)/);
  return match ? match[1] : null; // keep URL-encoded as-is
}

export async function registerAuthProxy(app: FastifyInstance): Promise<void> {
  if (!NEON_AUTH_URL) return;

  app.post<{ Body: { email: string; password: string } }>("/api/auth/sign-in", async (request, reply) => {
    const origin = request.headers.origin ?? "";
    const res = await fetch(`${NEON_AUTH_URL}/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({ email: request.body.email, password: request.body.password }),
    });
    const text = await res.text();
    const data = JSON.parse(text) as { token?: string; user?: { id?: string; email?: string; name?: string }; message?: string } | null;
    if (!res.ok) {
      reply.code(res.status).send({ ok: false, error: data?.message ?? "Sign-in failed." });
      return;
    }
    const signedToken = extractSignedToken(res.headers.get("set-cookie")) ?? data?.token ?? null;
    // Upsert profile and return role
    let role = "player";
    if (data?.user?.id && data.user.email) {
      role = await upsertProfile(app.sql, data.user.id, data.user.email);
    }
    reply.send({ ok: true, data: { token: signedToken, user: { ...data?.user, role } } });
  });

  app.post<{ Body: { email: string; password: string; name?: string } }>("/api/auth/sign-up", async (request, reply) => {
    const origin = request.headers.origin ?? "";
    const res = await fetch(`${NEON_AUTH_URL}/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({
        email: request.body.email,
        password: request.body.password,
        name: request.body.name ?? request.body.email,
      }),
    });
    const text = await res.text();
    const data = JSON.parse(text) as { message?: string } | null;
    if (!res.ok) {
      reply.code(res.status).send({ ok: false, error: data?.message ?? "Sign-up failed." });
      return;
    }
    reply.send({ ok: true });
  });

  app.get("/api/auth/session", async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      reply.send({ ok: true, data: null });
      return;
    }
    const token = authHeader.slice(7);
    const res = await fetch(`${NEON_AUTH_URL}/get-session`, {
      headers: { Cookie: `${COOKIE_NAME}=${token}` },
    });
    const data = (await res.json()) as { user?: { id?: string; email?: string; name?: string }; session?: unknown } | null;
    if (!data?.user?.id) {
      reply.send({ ok: true, data: null });
      return;
    }
    // Look up role from our own DB
    const rows = await app.sql<Array<{ role: string }>>`
      SELECT role FROM user_profiles WHERE user_id = ${data.user.id}
    `;
    const role = rows[0]?.role ?? "player";
    reply.send({ ok: true, data: { user: { ...data.user, role } } });
  });

  app.post("/api/auth/sign-out", async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const origin = request.headers.origin ?? "";
      await fetch(`${NEON_AUTH_URL}/sign-out`, {
        method: "POST",
        headers: { Cookie: `${COOKIE_NAME}=${token}`, Origin: origin },
      }).catch(() => {/* best-effort */});
    }
    reply.send({ ok: true });
  });
}
