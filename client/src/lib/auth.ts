import { createAuthClient } from "@neondatabase/neon-js/auth";

const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL as string | undefined;

// authClient is null when Neon Auth is not configured (local dev without auth)
export const authClient = NEON_AUTH_URL
  ? createAuthClient(NEON_AUTH_URL)
  : null;
