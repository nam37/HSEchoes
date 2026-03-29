import React, { useState } from "react";
import { signIn, signUp } from "../lib/auth";
import type { AuthUser } from "../lib/auth";

interface LandingPageProps {
  onAuthed: (token: string, user: AuthUser) => void;
}

type Mode = "signin" | "signup";

export default function LandingPage({ onAuthed }: LandingPageProps): JSX.Element {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode(next: Mode): void {
    setMode(next);
    setError(null);
    setPassword("");
    setConfirm("");
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);

    if (mode === "signup" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        await signUp(email, password);
      }
      const { token, user } = await signIn(email, password);
      onAuthed(token, user);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell landing-shell">
      <main className="landing-stage">
        <header className="hero-panel hero-panel-landing">
          <div>
            <p className="eyebrow">Retro Dungeon PoC</p>
            <h1>Echoes of the Hollow Star</h1>
            <p className="intro-copy">
              A short descent into a cursed ruin beneath a dying star.
              Sign in to begin your descent.
            </p>
          </div>

          <div className="hero-actions hero-actions-auth">
            <div className="auth-tabs">
              <button
                className={`auth-tab${mode === "signin" ? " auth-tab--active" : ""}`}
                onClick={() => switchMode("signin")}
                type="button"
              >
                Sign In
              </button>
              <button
                className={`auth-tab${mode === "signup" ? " auth-tab--active" : ""}`}
                onClick={() => switchMode("signup")}
                type="button"
              >
                Create Account
              </button>
            </div>

            <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
              <input
                className="auth-input"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <input
                className="auth-input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
              {mode === "signup" && (
                <input
                  className="auth-input"
                  type="password"
                  placeholder="Confirm Password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              )}
              <button className="btn-primary" type="submit" disabled={busy}>
                {busy ? "Please wait…" : mode === "signin" ? "Enter the Ruin" : "Begin Journey"}
              </button>
            </form>

            {error && <p className="error-banner">{error}</p>}
          </div>
        </header>

        <div className="landing-lore">
          <div className="lore-card">
            <p className="lore-line">Sector 7-Gamma. Year 2247.</p>
            <p className="lore-line">The ancient ruin pulses with an unknown signal.</p>
            <p className="lore-line">Your mission: descend. Retrieve the Star Sigil. Return.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
