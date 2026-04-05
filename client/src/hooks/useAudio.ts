import { useCallback, useEffect, useRef, useState } from "react";

export type AudioTrack = "title" | "explore" | "combat" | "death" | "victory";

const TRACKS: Record<AudioTrack, string[]> = {
  title:   ["/music/Echoes_of_the_Hollow_Star-Title-1.mp3"],
  explore: [
    "/music/Echoes_of_the_Hollow_Star-Exploration-1.mp3",
    "/music/Echoes_of_the_Hollow_Star-Exploration-2.mp3",
  ],
  combat:  [
    "/music/Echoes_of_the_Hollow_Star-Combat-1.mp3",
    "/music/Echoes_of_the_Hollow_Star-Combat-2.mp3",
  ],
  death:   ["/music/Echoes_of_the_Hollow_Star-Character_Death.mp3"],
  victory: ["/music/Echoes_of_the_Hollow_Star-End_Credits.mp3"],
};

const FADE_STEPS = 24;
const FADE_DURATION_MS = 1400;
const STEP_MS = FADE_DURATION_MS / FADE_STEPS;

function readStored(key: string, fallback: string): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

export function useAudio() {
  const [enabled, setEnabled] = useState<boolean>(() => readStored("music_enabled", "true") !== "false");
  const [volume, setVolumeState] = useState<number>(() => {
    const v = parseFloat(readStored("music_volume", "0.3"));
    return isNaN(v) ? 0.3 : Math.max(0, Math.min(1, v));
  });

  const audioRef   = useRef<HTMLAudioElement | null>(null);
  const fadeTimer  = useRef<number | null>(null);
  const activeTrack = useRef<AudioTrack | null>(null);
  const pendingTrack = useRef<AudioTrack | null>(null);

  const clearFade = useCallback(() => {
    if (fadeTimer.current !== null) {
      clearInterval(fadeTimer.current);
      fadeTimer.current = null;
    }
  }, []);

  const startTrack = useCallback((track: AudioTrack, targetVol: number) => {
    const srcs = TRACKS[track];
    const src = srcs[Math.floor(Math.random() * srcs.length)];
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;
    activeTrack.current = track;
    pendingTrack.current = null;

    void audio.play().catch(() => {
      // Autoplay blocked — resume on first user interaction
      const resume = () => { void audio.play(); };
      document.addEventListener("click",   resume, { once: true });
      document.addEventListener("keydown", resume, { once: true });
    });

    let step = 0;
    clearFade();
    fadeTimer.current = window.setInterval(() => {
      step++;
      audio.volume = Math.min(targetVol, targetVol * (step / FADE_STEPS));
      if (step >= FADE_STEPS) clearFade();
    }, STEP_MS);
  }, [clearFade]);

  const stopCurrent = useCallback((onDone: () => void) => {
    const audio = audioRef.current;
    if (!audio) { onDone(); return; }

    clearFade();
    const startVol = audio.volume;
    let step = 0;
    fadeTimer.current = window.setInterval(() => {
      step++;
      audio.volume = Math.max(0, startVol * (1 - step / FADE_STEPS));
      if (step >= FADE_STEPS) {
        clearFade();
        audio.pause();
        audio.src = "";
        audioRef.current = null;
        activeTrack.current = null;
        onDone();
      }
    }, STEP_MS);
  }, [clearFade]);

  const play = useCallback((track: AudioTrack) => {
    if (activeTrack.current === track) return;

    if (!enabled) {
      // Just note what should play when enabled
      pendingTrack.current = track;
      activeTrack.current = track;
      return;
    }

    if (audioRef.current) {
      // Fade out current, then fade in new
      stopCurrent(() => startTrack(track, volume));
    } else {
      startTrack(track, volume);
    }
  }, [enabled, volume, startTrack, stopCurrent]);

  // React to enabled toggle
  useEffect(() => {
    if (!enabled) {
      if (audioRef.current) {
        stopCurrent(() => {});
      }
    } else {
      const track = activeTrack.current ?? pendingTrack.current;
      if (track) {
        activeTrack.current = null; // force restart
        startTrack(track, volume);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // React to volume change
  useEffect(() => {
    if (audioRef.current && fadeTimer.current === null) {
      audioRef.current.volume = volume;
    }
    try { localStorage.setItem("music_volume", String(volume)); } catch { /* ignore */ }
  }, [volume]);

  const toggleEnabled = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      try { localStorage.setItem("music_enabled", String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearFade();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [clearFade]);

  return { enabled, toggleEnabled, volume, setVolume, play };
}
