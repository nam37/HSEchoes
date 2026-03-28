import React, { useEffect, useState } from "react";
import { authClient } from "../lib/auth";
import { setAuthToken } from "../lib/api";
import App from "../App";
import LandingPage from "../pages/LandingPage";
import AdminPage from "../pages/AdminPage";

type AuthState = "loading" | "unauthed" | "authed";

export function Root(): JSX.Element {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // If Neon Auth is not configured, skip auth and go straight to the game
    if (!authClient) {
      setAuthState("authed");
      return;
    }

    void (async () => {
      try {
        const result = await authClient.getSession();
        if (result.data?.session && result.data?.user) {
          // Use session token as Bearer for API requests
          setAuthToken(result.data.session.token ?? null);
          setUserEmail(result.data.user.email ?? null);
          setAuthState("authed");
        } else {
          setAuthState("unauthed");
        }
      } catch {
        setAuthState("unauthed");
      }
    })();
  }, []);

  if (authState === "loading") {
    return (
      <div className="auth-loading">
        <p className="auth-loading-text">Initializing secure link<span className="blink">_</span></p>
      </div>
    );
  }

  if (authState === "unauthed") {
    return <LandingPage />;
  }

  const path = window.location.pathname;
  if (path === "/admin") {
    return <AdminPage userEmail={userEmail} onSignOut={handleSignOut} />;
  }
  return <App />;
}

async function handleSignOut(): Promise<void> {
  if (authClient) {
    await authClient.signOut();
  }
  setAuthToken(null);
  window.location.href = "/";
}
