import React, { useCallback, useEffect, useState } from "react";
import { authEnabled, getSession, signOut, getStoredToken } from "../lib/auth";
import type { AuthUser } from "../lib/auth";
import { setAuthToken } from "../lib/api";
import App from "../App";
import LandingPage from "../pages/LandingPage";
import AdminPage from "../pages/AdminPage";
import { SplashScreen } from "./SplashScreen";

type AuthState = "loading" | "unauthed" | "authed";

export function Root(): JSX.Element {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [splashDone, setSplashDone] = useState(false);
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

  // Show splash until both conditions met: auth resolved AND splash animation done
  if (!splashDone || authState === "loading") {
    return <SplashScreen onComplete={() => setSplashDone(true)} />;
  }

  if (authState === "unauthed") {
    return <LandingPage onAuthed={handleAuthed} />;
  }

  const path = window.location.pathname;
  if (path === "/admin") {
    return <AdminPage userEmail={userEmail} onSignOut={handleSignOut} />;
  }
  return <App onSignOut={() => void handleSignOut()} />;
}

async function handleSignOut(): Promise<void> {
  await signOut();
  setAuthToken(null);
  window.location.href = "/";
}
