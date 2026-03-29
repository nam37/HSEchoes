import React, { useCallback, useEffect, useState } from "react";
import { authEnabled, getSession, signOut, getStoredToken } from "../lib/auth";
import type { AuthUser } from "../lib/auth";
import { setAuthToken } from "../lib/api";
import App from "../App";
import LandingPage from "../pages/LandingPage";
import AdminPage from "../pages/AdminPage";

type AuthState = "loading" | "unauthed" | "authed";

export function Root(): JSX.Element {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!authEnabled) {
      setAuthState("authed");
      return;
    }

    void (async () => {
      try {
        const session = await getSession();
        if (session?.user) {
          setAuthToken(getStoredToken());
          setUserEmail(session.user.email ?? null);
          setAuthState("authed");
        } else {
          setAuthState("unauthed");
        }
      } catch {
        setAuthState("unauthed");
      }
    })();
  }, []);

  const handleAuthed = useCallback((token: string, user: AuthUser): void => {
    setAuthToken(token);
    setUserEmail(user.email ?? null);
    setAuthState("authed");
  }, []);

  if (authState === "loading") {
    return (
      <div className="auth-loading">
        <p className="auth-loading-text">Initializing secure link<span className="blink">_</span></p>
      </div>
    );
  }

  if (authState === "unauthed") {
    return <LandingPage onAuthed={handleAuthed} />;
  }

  const path = window.location.pathname;
  if (path === "/admin") {
    return <AdminPage userEmail={userEmail} onSignOut={() => void handleSignOut()} />;
  }
  return <App onSignOut={() => void handleSignOut()} />;
}

async function handleSignOut(): Promise<void> {
  await signOut();
  setAuthToken(null);
  window.location.href = "/";
}
