import React, { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

type Phase = "bg-in" | "logo-in" | "hold" | "out";

const PHASE_TIMINGS: Record<Phase, number> = {
  "bg-in":   0,
  "logo-in": 1100,
  "hold":    2000,
  "out":     3800,
};
const TOTAL = 4700;

export function SplashScreen({ onComplete }: SplashScreenProps): JSX.Element {
  const [phase, setPhase] = useState<Phase>("bg-in");

  useEffect(() => {
    const timers = (Object.entries(PHASE_TIMINGS) as [Phase, number][])
      .slice(1) // skip "bg-in" — that's the initial state
      .map(([p, delay]) => setTimeout(() => setPhase(p), delay));
    const done = setTimeout(onComplete, TOTAL);
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, [onComplete]);

  return (
    <div className={`splash splash--${phase}`}>
      {/* Space background */}
      <img
        className="splash__bg"
        src="/splash-bg.jpg"
        alt=""
        aria-hidden="true"
      />

      {/* Orange star bloom — positioned top-right where the dying star sits */}
      <div className="splash__star-bloom" aria-hidden="true" />

      {/* Blue nebula shimmer */}
      <div className="splash__nebula-shimmer" aria-hidden="true" />

      {/* Title logo */}
      <div className="splash__logo-wrap">
        <img
          className="splash__logo"
          src="/splash-logo.png"
          alt="Echoes of the Hollow Star"
        />
      </div>

      {/* CRT scanlines */}
      <div className="splash__scanlines" aria-hidden="true" />

      {/* Fade-out overlay */}
      <div className="splash__curtain" aria-hidden="true" />
    </div>
  );
}
