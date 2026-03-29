const TOKEN_KEY = "neon-auth-token";
const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL as string | undefined;

// Auth is enabled when VITE_NEON_AUTH_URL is configured
export const authEnabled = Boolean(NEON_AUTH_URL);

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

function storeToken(token: string | null): void {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export async function signIn(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch("/api/auth/sign-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = JSON.parse(await res.text()) as { ok: boolean; data?: { token: string; user: AuthUser }; error?: string };
  if (!payload.ok || !payload.data) throw new Error(payload.error ?? "Sign-in failed.");
  storeToken(payload.data.token);
  return payload.data;
}

export async function signUp(email: string, password: string): Promise<void> {
  const res = await fetch("/api/auth/sign-up", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = JSON.parse(await res.text()) as { ok: boolean; error?: string };
  if (!payload.ok) throw new Error(payload.error ?? "Sign-up failed.");
}

export async function getSession(): Promise<{ user: AuthUser } | null> {
  const token = getStoredToken();
  if (!token) return null;
  const res = await fetch("/api/auth/session", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = JSON.parse(await res.text()) as { ok: boolean; data?: { user: AuthUser } | null };
  return payload.data ?? null;
}

export async function signOut(): Promise<void> {
  const token = getStoredToken();
  storeToken(null);
  if (!token) return;
  await fetch("/api/auth/sign-out", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {/* best-effort */});
}
