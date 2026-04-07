import React, { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import type { BootstrapData, Direction, InteractResult, Item, NPC, RunState, SaveSummary, Terminal, Zone, ZoneRoom } from "../../shared/src/index";
import { findRoomContaining, findZoneEdge, formatFaceLabel, DIRECTIONS, resolveEdgeType } from "../../shared/src/index";
import { useAudio } from "./hooks/useAudio";

interface Toast {
  id: string;
  text: string;
  addedAt: number;
}

interface SlotCard {
  slotNumber: number;
  save: SaveSummary | null;
}

const TOAST_DURATION = 7000;

function isNotification(text: string): boolean {
  return /^(LEVEL UP|Assignment received:|New message from|Objective complete:|Assignment complete:|You find |You claim |You access the terminal|Progress saved\.|\+\d+ credits)/.test(text);
}

function getNewLogEntries(prevLog: string[], newLog: string[]): string[] {
  if (prevLog.length === 0) return [...newLog];
  const lastPrev = prevLog[prevLog.length - 1];
  const idx = newLog.lastIndexOf(lastPrev);
  if (idx === -1) return [...newLog];
  return newLog.slice(idx + 1);
}
import { api } from "./lib/api";
import { buildAssetMap, buildTextureSetMap, resolveAssetPath } from "./lib/assets";
import { buildRoomContentCards } from "./lib/roomContentCards";
import { DungeonViewport } from "./components/DungeonViewport";
import { MapPanel } from "./components/MapPanel";
import { TabletOverlay } from "./components/TabletOverlay";

function App({ onSignOut, isAdmin }: { onSignOut?: () => void; isAdmin?: boolean }): JSX.Element {
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Initialising systems...");
  const [statusFlash, setStatusFlash] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabletOpen, setTabletOpen] = useState(false);
  const [tabletTab, setTabletTab] = useState<"messages" | "assignments" | "map">("messages");
  const [interactResult, setInteractResult] = useState<InteractResult | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [seenQuestIds, setSeenQuestIds] = useState<Set<string>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const prevLogRef = useRef<string[]>([]);
  const prevZoneIdRef = useRef<string | null>(null);
  const audio = useAudio();

  useEffect(() => {
    void refreshBootstrap();
  }, []);

  // Audio track switching
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!run) {
      audio.play("title");
      return;
    }
    if (run.status === "defeat") { audio.play("death");   return; }
    if (run.status === "victory") { audio.play("victory"); return; }
    if (run.mode === "combat")    { audio.play("combat");  return; }
    audio.play("explore");
  }, [run?.status, run?.mode]);

  // Detect zone transitions and trigger status ribbon flash
  useEffect(() => {
    if (!run) return;
    if (prevZoneIdRef.current !== null && prevZoneIdRef.current !== run.zoneId) {
      setStatusFlash(true);
      const timer = setTimeout(() => setStatusFlash(false), 900);
      return () => clearTimeout(timer);
    }
    prevZoneIdRef.current = run.zoneId;
  }, [run?.zoneId]);

  const pushToasts = useCallback((newLog: string[]) => {
    const newEntries = getNewLogEntries(prevLogRef.current, newLog);
    prevLogRef.current = [...newLog];
    const notifications = newEntries.filter(isNotification);
    if (notifications.length === 0) return;
    const now = Date.now();
    setToasts(prev => [
      ...prev,
      ...notifications.map((text, i) => ({
        id: `${now}-${i}`,
        text,
        addedAt: now + i * 80, // slight stagger so IDs are unique
      }))
    ]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Auto-dismiss toasts after TOAST_DURATION
  useEffect(() => {
    if (toasts.length === 0) return;
    const earliest = toasts.reduce((min, t) => Math.min(min, t.addedAt), Infinity);
    const elapsed = Date.now() - earliest;
    const remaining = TOAST_DURATION - elapsed;
    if (remaining <= 0) {
      setToasts(prev => prev.filter(t => Date.now() - t.addedAt < TOAST_DURATION));
      return;
    }
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => Date.now() - t.addedAt < TOAST_DURATION));
    }, remaining + 50);
    return () => clearTimeout(timer);
  }, [toasts]);

  const zone: Zone | null = useMemo(
    () => (bootstrap && run ? bootstrap.zones.find(z => z.id === run.zoneId) ?? bootstrap.zones[0] ?? null : bootstrap?.zones[0] ?? null),
    [bootstrap, run?.zoneId]
  );
  const currentRoom: ZoneRoom | null = useMemo(
    () => (zone && run ? findRoomContaining(zone, run.posX, run.posY) ?? null : null),
    [zone, run]
  );
  const itemMap = useMemo(() => new Map((bootstrap?.items ?? []).map((item) => [item.id, item])), [bootstrap]);
  const npcMap = useMemo(() => new Map((bootstrap?.npcs ?? []).map((npc) => [npc.id, npc])), [bootstrap]);
  const terminalMap = useMemo(() => new Map((bootstrap?.terminals ?? []).map((t) => [t.id, t])), [bootstrap]);
  const propMap = useMemo(() => new Map((bootstrap?.props ?? []).map((prop) => [prop.id, prop])), [bootstrap]);
  const assetMap = useMemo(() => buildAssetMap(bootstrap?.assets ?? []), [bootstrap?.assets]);
  const textureSetMap = useMemo(() => buildTextureSetMap(bootstrap?.textureSets ?? []), [bootstrap?.textureSets]);
  const selectedItem = selectedItemId ? itemMap.get(selectedItemId) ?? null : null;
  const slotCards = useMemo(() => buildSaveSlots(bootstrap?.saves ?? []), [bootstrap?.saves]);

  async function refreshBootstrap(preserveStatus = false): Promise<void> {
    try {
      setBusy(true);
      const data = await api.bootstrap();
      startTransition(() => {
        setBootstrap(data);
        if (!preserveStatus) {
          setStatusText(data.intro);
        }
      });
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function createRun(slotNumber: number): Promise<void> {
    try {
      setBusy(true);
      setError(null);
      prevLogRef.current = [];
      prevZoneIdRef.current = null;
      const envelope = await api.newRun({ slotNumber });
      setToasts([]);  // reset before pushing new run notifications
      setSeenQuestIds(new Set());
      startTransition(() => {
        setRun(envelope.run);
        // Ribbon shows the entry flavour line; notifications go to toasts
        setStatusText(envelope.run.log[0] ?? "A new descent begins.");
        setTabletOpen(false);
        setTabletTab("messages");
      });
      pushToasts(envelope.run.log);
      await refreshBootstrap(true);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loadSave(slotId: string): Promise<void> {
    try {
      setBusy(true);
      setError(null);
      prevLogRef.current = [];
      prevZoneIdRef.current = null;
      const envelope = await api.loadRun(slotId);
      startTransition(() => {
        setRun(envelope.run);
        prevLogRef.current = [...envelope.run.log];
        setStatusText(envelope.run.log.at(-1) ?? `Loaded run ${slotId}.`);
        setToasts([]);
      });
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteSave(slotId: string): Promise<void> {
    if (!window.confirm("Delete this save slot? This cannot be undone.")) {
      return;
    }
    try {
      setBusy(true);
      setError(null);
      await api.deleteRun(slotId);
      await refreshBootstrap();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function overwriteSave(slotNumber: number, slotId: string): Promise<void> {
    if (!window.confirm(`Overwrite Slot ${slotNumber} with a new game?`)) {
      return;
    }
    try {
      setBusy(true);
      setError(null);
      await api.deleteRun(slotId);
      prevLogRef.current = [];
      prevZoneIdRef.current = null;
      const envelope = await api.newRun({ slotNumber });
      setToasts([]);
      setSeenQuestIds(new Set());
      startTransition(() => {
        setRun(envelope.run);
        setStatusText(envelope.run.log[0] ?? "A new descent begins.");
        setTabletOpen(false);
        setTabletTab("messages");
      });
      pushToasts(envelope.run.log);
      await refreshBootstrap(true);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function returnToSaveSlots(): Promise<void> {
    startTransition(() => {
      setRun(null);
      setTabletOpen(false);
      setInteractResult(null);
      setSelectedItemId(null);
      setToasts([]);
    });
    prevLogRef.current = [];
    prevZoneIdRef.current = null;
    await refreshBootstrap();
  }

  async function handleMove(command: "forward" | "back" | "turn-left" | "turn-right"): Promise<void> {
    if (!run) {
      return;
    }
    try {
      setBusy(true);
      const envelope = await api.move({ slotId: run.slotId, command });
      startTransition(() => {
        setRun(envelope.run);
        setStatusText(envelope.message ?? envelope.run.log.at(-1) ?? "The silence shifts.");
      });
      pushToasts(envelope.run.log);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!run) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (busy || event.repeat || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
          return;
        }
      }

      switch (event.key) {
        case "ArrowUp":
          event.preventDefault();
          void handleMove("forward");
          break;
        case "ArrowDown":
          event.preventDefault();
          void handleMove("back");
          break;
        case "ArrowLeft":
          event.preventDefault();
          void handleMove("turn-left");
          break;
        case "ArrowRight":
          event.preventDefault();
          void handleMove("turn-right");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, run]);

  async function handleCombat(action: "attack" | "defend" | "use-item" | "flee"): Promise<void> {
    if (!run) {
      return;
    }
    try {
      setBusy(true);
      const envelope = await api.combat({
        slotId: run.slotId,
        action,
        itemId: action === "use-item" ? selectedItemId ?? undefined : undefined
      });
      startTransition(() => {
        setRun(envelope.run);
        setStatusText(envelope.message ?? envelope.run.log.at(-1) ?? "Steel rings in the dark.");
      });
      pushToasts(envelope.run.log);
      await refreshBootstrap(true);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUseItem(): Promise<void> {
    if (!run || !selectedItemId) {
      return;
    }
    try {
      setBusy(true);
      const envelope = await api.useItem({ slotId: run.slotId, itemId: selectedItemId });
      startTransition(() => {
        setRun(envelope.run);
        setStatusText(envelope.message ?? envelope.run.log.at(-1) ?? "The tonic burns on the way down.");
        if (!envelope.run.player.inventory.includes(selectedItemId)) {
          setSelectedItemId(null);
        }
      });
      pushToasts(envelope.run.log);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleEquipItem(): Promise<void> {
    if (!run || !selectedItemId) {
      return;
    }
    try {
      setBusy(true);
      const envelope = await api.equipItem({ slotId: run.slotId, itemId: selectedItemId });
      startTransition(() => {
        setRun(envelope.run);
        setStatusText(envelope.message ?? envelope.run.log.at(-1) ?? "You adjust your kit.");
      });
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveRun(): Promise<void> {
    if (!run) {
      return;
    }
    try {
      setBusy(true);
      const envelope = await api.saveRun(run.slotId);
      startTransition(() => {
        setRun(envelope.run);
        setStatusText(envelope.message ?? envelope.run.log.at(-1) ?? "The archive takes your progress.");
      });
      pushToasts(envelope.run.log);
      await refreshBootstrap(true);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkRead(): Promise<void> {
    if (!run) return;
    try {
      const envelope = await api.markMessagesRead(run.slotId);
      startTransition(() => setRun(envelope.run));
    } catch {
      // non-critical — ignore
    }
  }

  async function handleInteract(): Promise<void> {
    if (!run) return;
    try {
      setBusy(true);
      const result = await api.interact({ slotId: run.slotId });
      startTransition(() => {
        setRun(result.run);
        if (result.kind !== "none") {
          setInteractResult(result);
        } else {
          setStatusText(result.message ?? "Nothing to interact with here.");
        }
      });
      pushToasts(result.run.log);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const unseenQuestCount = run?.activeQuests.filter(q => !seenQuestIds.has(q.id)).length ?? 0;
  const unreadCount = (run?.messages.filter(m => !m.read).length ?? 0) + unseenQuestCount;

  const markAssignmentsSeen = useCallback(() => {
    if (!run) return;
    setSeenQuestIds(prev => new Set([...prev, ...run.activeQuests.map(q => q.id)]));
  }, [run]);

  const inventory = run?.player.inventory.map((itemId) => itemMap.get(itemId)).filter(Boolean) as Item[] | undefined;
  const currentExits = zone && run ? describeExits(zone, run.posX, run.posY, run, itemMap) : [];
  const roomNpc: NPC | null = currentRoom?.npcId ? npcMap.get(currentRoom.npcId) ?? null : null;
  const roomTerminal: Terminal | null = currentRoom?.terminalId ? terminalMap.get(currentRoom.terminalId) ?? null : null;
  const roomContentCards = useMemo(
    () => buildRoomContentCards({
      room: currentRoom,
      combat: run?.combat ?? null,
      npcMap,
      terminalMap,
      propMap,
      assetMap,
    }),
    [assetMap, currentRoom, npcMap, propMap, run?.combat, terminalMap]
  );

  return (
    <div className={run ? "app-shell has-run" : "app-shell landing-shell"}>
      {!run ? (
        <main className="landing-stage">
          <header className="hero-panel hero-panel-landing">
            <div>
              <p className="eyebrow">Frontier Station — West Ring</p>
              <h1>
                {bootstrap?.title ?? "Echoes of the Hollow Star"}
                {isAdmin && <span className="title-admin-badge">Admin</span>}
              </h1>
              <p className="intro-copy">{bootstrap?.intro ?? "Routine maintenance shift. Station West, sublevel 3."}</p>
            </div>
            <div className="hero-actions">
              {isAdmin && (
                <button className="btn-secondary" onClick={() => { window.location.href = "/admin"; }}>Admin</button>
              )}
              <button className="btn-secondary" onClick={() => setSettingsOpen(s => !s)}>Settings</button>
              {onSignOut && (
                <button className="btn-secondary" onClick={onSignOut}>Sign Out</button>
              )}
            </div>
          </header>
          <section className="slot-picker-panel" aria-label="Save slots">
            <div className="slot-picker-header">
              <div>
                <p className="slot-picker-kicker">Save Archive</p>
                <h2>Select a slot</h2>
              </div>
              {/* <p className="slot-picker-copy">Three fixed slots. Empty slots start a new run. Occupied slots can continue, overwrite, or be cleared.</p> */}
            </div>
            <div className="slot-grid">
              {slotCards.map(({ slotNumber, save }) => (
                <article key={slotNumber} className={`slot-card${save ? " occupied" : " empty"}`}>
                  <div className="slot-card-header">
                    <span className="slot-card-label">Slot {slotNumber}</span>
                    <span className={`slot-status slot-status-${save?.status ?? "empty"}`}>
                      {save?.status ?? "empty"}
                    </span>
                  </div>
                  {save ? (
                    <>
                      <div className="slot-card-body">
                        <p className="slot-room">{save.roomTitle}</p>
                        <p className="slot-meta">Level {save.level}</p>
                        <p className="slot-meta">Updated {formatSaveTimestamp(save.updatedAt)}</p>
                      </div>
                      <div className="slot-card-actions">
                        <button onClick={() => void loadSave(save.slotId)} disabled={busy}>Continue</button>
                        <button className="btn-secondary" onClick={() => void overwriteSave(slotNumber, save.slotId)} disabled={busy}>Overwrite</button>
                        <button className="btn-secondary" onClick={() => void deleteSave(save.slotId)} disabled={busy}>Delete</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="slot-card-body">
                        <p className="slot-room">No transmission stored.</p>
                        <p className="slot-meta">Fresh descent available.</p>
                      </div>
                      <div className="slot-card-actions">
                        <button onClick={() => void createRun(slotNumber)} disabled={busy}>New Game</button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          </section>
          {error && <p className="error-banner">{error}</p>}
          {settingsOpen && (
            <div
              className="settings-overlay"
              role="dialog"
              aria-modal="true"
              aria-label="Settings"
              onClick={() => setSettingsOpen(false)}
            >
              <div className="settings-modal" onClick={(event) => event.stopPropagation()}>
                <div className="settings-modal-header">
                  <div>
                    <p className="settings-label">System Controls</p>
                    <h2 className="settings-title">Settings</h2>
                  </div>
                  <button className="settings-close" onClick={() => setSettingsOpen(false)} aria-label="Close settings">
                    Close
                  </button>
                </div>
                <div className="settings-panel">
                  <p className="settings-label">Music</p>
                  <div className="settings-row">
                    <button
                      className={`settings-toggle${audio.enabled ? " active" : ""}`}
                      onClick={audio.toggleEnabled}
                    >
                      {audio.enabled ? "On" : "Off"}
                    </button>
                    <input
                      type="range"
                      className="settings-slider"
                      min="0"
                      max="1"
                      step="0.05"
                      value={audio.volume}
                      onChange={e => audio.setVolume(parseFloat(e.target.value))}
                      disabled={!audio.enabled}
                      aria-label="Music volume"
                    />
                    <span className="settings-vol-label">{Math.round(audio.volume * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      ) : (
        <main className="game-grid">
          {run.status === "victory" && (
            <div className="death-overlay" role="dialog" aria-modal="true" aria-label="Victory">
              <div className="death-modal victory-modal">
                <p className="death-eyebrow">Contact established</p>
                <h2 className="death-heading victory-heading">Signal recovered.</h2>
                <p className="death-sub">{run.log.at(-1) ?? "Transmission confirmed. You are inside the Hollow Star."}</p>
                <button onClick={() => void returnToSaveSlots()} disabled={busy}>Return to Save Slots</button>
              </div>
            </div>
          )}
          {run.status === "defeat" && (
            <div className="death-overlay" role="dialog" aria-modal="true" aria-label="Game over">
              <div className="death-modal">
                <p className="death-eyebrow">Biosign terminated</p>
                <h2 className="death-heading">You are dead.</h2>
                <p className="death-sub">{run.log.at(-1) ?? "Your lifesign drops from the station network. No recovery signal."}</p>
                <button onClick={() => void returnToSaveSlots()} disabled={busy}>Return to Save Slots</button>
              </div>
            </div>
          )}
          {error && <p className="error-banner inline-error">{error}</p>}

          <section className="stage-panel">
            {bootstrap && run ? <DungeonViewport bootstrap={bootstrap} run={run} assetMap={assetMap} textureSetMap={textureSetMap} /> : <div className="viewport-shell loading">Lighting the vault...</div>}
            <div className={`status-ribbon${statusFlash ? " status-ribbon--zone" : ""}`}>
              {renderStatusText(statusText, (tab) => { setTabletTab(tab); setTabletOpen(true); })}
            </div>
            {roomContentCards.length > 0 && (
              <div className="room-content-stack" aria-label="Room contents">
                {roomContentCards.map((card) => (
                  <article
                    key={`${card.kind}-${card.title}`}
                    className={`room-content-card room-content-card--${card.kind}`}
                    data-kind={card.kind}
                  >
                    {card.portraitSrc ? (
                      <img className="room-content-portrait pixel-art-asset" src={card.portraitSrc} alt="" />
                    ) : (
                      <div className={`room-content-badge room-content-badge--${card.kind}`}>{card.badge}</div>
                    )}
                    <div className="room-content-info">
                      <span className="room-content-label">{card.label}</span>
                      <span className="room-content-title">{card.title}</span>
                      <span className="room-content-subtitle">{card.subtitle}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {(roomNpc || roomTerminal) && run.mode !== "combat" && (
              <button
                className="interact-btn stage-interact-btn"
                onClick={() => void handleInteract()}
                disabled={busy}
              >
                {roomNpc ? `▶ Talk to ${roomNpc.name}` : `▶ Access Terminal`}
              </button>
            )}
            {toasts.length > 0 && (
              <div className="toast-stack" aria-live="polite">
                {toasts.map(t => (
                  <div key={t.id} className="toast-item">
                    <span className="toast-text">
                      {renderStatusText(t.text, (tab) => { setTabletTab(tab); setTabletOpen(true); })}
                    </span>
                    <button className="toast-dismiss" onClick={() => dismissToast(t.id)} aria-label="Dismiss">✕</button>
                    <span
                      className="toast-timer"
                      style={{ animationDuration: `${TOAST_DURATION}ms` }}
                    />
                  </div>
                ))}
              </div>
            )}
            {run.combat && (
              <section className="combat-banner" aria-label="Combat panel">
                <div className="combat-banner-copy">
                  <p className="combat-kicker">Combat Engaged</p>
                  <h2>{run.combat.enemyName}</h2>
                  <p>{run.combat.enemyHp}/{run.combat.enemyMaxHp} HP</p>
                  <p className="combat-hint">Movement is locked until you defeat the threat or escape.</p>
                  <p className="combat-hint">{selectedItem ? `Selected item: ${selectedItem.name}` : "Select a consumable in Inventory if you want to use one."}</p>
                </div>
                <div className="combat-banner-actions">
                  <button onClick={() => void handleCombat("attack")} disabled={busy}>Attack</button>
                  <button onClick={() => void handleCombat("defend")} disabled={busy}>Defend</button>
                  <button onClick={() => void handleCombat("use-item")} disabled={busy || !selectedItemId}>Use Item</button>
                  <button onClick={() => void handleCombat("flee")} disabled={busy}>Flee</button>
                </div>
              </section>
            )}
          </section>

          {tabletOpen && (
            <TabletOverlay
              run={run}
              zones={bootstrap?.zones ?? []}
              onClose={() => setTabletOpen(false)}
              onMarkRead={() => void handleMarkRead()}
              onViewAssignments={markAssignmentsSeen}
              initialTab={tabletTab}
            />
          )}

          {interactResult && interactResult.kind !== "none" && (
            <div className="interact-overlay" role="dialog" aria-modal="true" aria-label="Interaction">
              <div className="interact-modal">
                {interactResult.kind === "npc" && (
                  <>
                    {interactResult.npcPortrait && (
                      <img className="interact-portrait pixel-art-asset" src={resolveAssetPath(interactResult.npcPortrait, assetMap)} alt={interactResult.npcName} />
                    )}
                    <p className="interact-eyebrow">{interactResult.npcRole}</p>
                    <h2 className="interact-heading">{interactResult.npcName}</h2>
                    <div className="interact-body">
                      {(interactResult.lines ?? []).map((line) => (
                        <p key={line.id}>{line.text}</p>
                      ))}
                    </div>
                  </>
                )}
                {interactResult.kind === "terminal" && (
                  <>
                    <p className="interact-eyebrow">Terminal Access</p>
                    <h2 className="interact-heading">{interactResult.terminalTitle}</h2>
                    <pre className="interact-terminal-log">{interactResult.terminalText}</pre>
                  </>
                )}
                <button onClick={() => setInteractResult(null)}>Close</button>
              </div>
            </div>
          )}

          <aside className="sidebar">
            <section className="hud-card explorer-card">
              <div className="panel-heading-row">
                <h2>Explorer</h2>
                <div className="panel-actions">
                  <button
                    className="tablet-btn"
                    onClick={() => { setTabletTab("messages"); setTabletOpen(true); void handleMarkRead(); }}
                    title="Open Tablet"
                    aria-label="Open tablet"
                  >
                    Tablet{unreadCount > 0 ? ` [${unreadCount}]` : ""}
                  </button>
                  <button onClick={() => void saveRun()} disabled={busy || run.mode === "combat"}>Save</button>
                </div>
              </div>
              <div className="stat-grid">
                <p><strong>HP</strong> {run.player.hp}/{run.player.maxHp}</p>
                <p><strong>Credits</strong> {run.player.credits}</p>
                <p><strong>Level</strong> {run.player.level}</p>
                <p><strong>XP</strong> {run.player.xpToNextLevel > 0 ? `${run.player.xp} / ${run.player.xpToNextLevel}` : "MAX"}</p>
                <p><strong>Facing</strong> {run.facing}</p>
                <p><strong>Mode</strong> {run.mode}</p>
                <p><strong>Weapon</strong> {labelFor(itemMap, run.player.equipped.weapon)}</p>
                <p><strong>Armor</strong> {labelFor(itemMap, run.player.equipped.armor)}</p>
                <p><strong>Charm</strong> {labelFor(itemMap, run.player.equipped.accessory)}</p>
              </div>
            </section>

            <section className="hud-card controls">
              <h2>Movement</h2>
              <div className="button-grid movement-grid">
                <button onClick={() => void handleMove("turn-left")} disabled={busy || run.mode === "combat"}>Turn Left</button>
                <button onClick={() => void handleMove("forward")} disabled={busy || run.mode === "combat"}>Forward</button>
                <button onClick={() => void handleMove("back")} disabled={busy || run.mode === "combat"}>Back</button>
                <button onClick={() => void handleMove("turn-right")} disabled={busy || run.mode === "combat"}>Turn Right</button>
              </div>
              {currentRoom && (
                <div className="controls-scroll">
                  <p className="room-copy">{currentRoom.title}: {currentRoom.description}</p>
                  <div className="exit-list">
                    {currentExits.map((entry) => <p key={entry}>{entry}</p>)}
                  </div>
                </div>
              )}
            </section>
          </aside>

          <section className="bottom-row">
            <section className="hud-card inventory-card">
              <h2>Inventory</h2>
              <div className="inventory-list scroll-panel">
                {inventory?.map((item) => (
                  <button
                    key={item.id}
                    className={[
                      "inventory-item",
                      selectedItemId === item.id ? "selected" : "",
                      Object.values(run.player.equipped).includes(item.id) ? "equipped" : ""
                    ].filter(Boolean).join(" ")}
                    onClick={() => setSelectedItemId(item.id)}
                  >
                    <img className="pixel-art-asset" src={resolveAssetPath(item.iconPath, assetMap)} alt="" />
                    <span>{item.name}</span>
                  </button>
                )) ?? <p>No items yet.</p>}
              </div>
              <div className="inventory-actions">
                <button onClick={() => void handleEquipItem()} disabled={!selectedItemId || busy}>Equip / Stow</button>
                <button onClick={() => void handleUseItem()} disabled={!selectedItemId || busy}>Use</button>
              </div>
              {selectedItemId && itemMap.get(selectedItemId) && (
                <p className="item-copy">{itemMap.get(selectedItemId)?.description}</p>
              )}
            </section>

            <section className="hud-card map-card">
              <h2>Map</h2>
              {zone && <MapPanel zone={zone} run={run} />}
            </section>

            <section className="hud-card log-card">
              <h2>Action Log</h2>
              <div className="log-list scroll-panel">
                {run.log.slice().reverse().map((entry, index) => <p key={`${entry}-${index}`}>{entry}</p>)}
              </div>
            </section>
          </section>
        </main>
      )}
    </div>
  );
}

const ACTION_RE = /\[([^\]]+)\]/g;

function renderStatusText(text: string, onOpenTablet: (tab: "messages" | "assignments" | "map") => void): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  ACTION_RE.lastIndex = 0;
  while ((match = ACTION_RE.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const label = match[1];
    if (label.includes("Tablet")) {
      const tab: "messages" | "assignments" | "map" =
        label.toLowerCase().includes("assignment") ? "assignments" :
        label.toLowerCase().includes("map") ? "map" : "messages";
      parts.push(
        <button key={match.index} className="status-ribbon-action" onClick={() => onOpenTablet(tab)}>
          {label}
        </button>
      );
    } else {
      parts.push(match[0]);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function labelFor(itemMap: Map<string, Item>, itemId: string | null): string {
  return itemId ? itemMap.get(itemId)?.name ?? itemId : "None";
}

function buildSaveSlots(saves: SaveSummary[]): SlotCard[] {
  const saveMap = new Map(saves.map((save) => [save.slotNumber, save]));
  return [1, 2, 3].map((slotNumber) => ({
    slotNumber,
    save: saveMap.get(slotNumber) ?? null,
  }));
}

function formatSaveTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

function describeExits(zone: Zone, px: number, py: number, run: RunState, itemMap: Map<string, Item>): string[] {
  return DIRECTIONS.flatMap((direction) => {
    const face = resolveEdgeType(zone, px, py, direction);
    if (face === "wall") {
      return [];
    }

    const label = `${toTitle(direction)}: ${formatFaceLabel(face)}`;
    const requirement = findZoneEdge(zone, px, py, direction)?.requirement;
    if (!requirement) {
      return [label];
    }

    const keyName = itemMap.get(requirement.itemId)?.name ?? requirement.itemId;
    const unlocked = run.player.inventory.includes(requirement.itemId);
    return [`${label} (${unlocked ? `${keyName} ready` : `requires ${keyName}`})`];
  });
}

function toTitle(direction: Direction): string {
  return direction.charAt(0).toUpperCase() + direction.slice(1);
}

export default App;
