import React, { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import type { BootstrapData, Direction, InteractResult, Item, NPC, RunState, Terminal, Zone, ZoneRoom } from "../../shared/src/index";
import { findRoomContaining, findZoneEdge, formatFaceLabel, DIRECTIONS, resolveEdgeType } from "../../shared/src/index";

interface Toast {
  id: string;
  text: string;
  addedAt: number;
}

const TOAST_DURATION = 7000;

function isNotification(text: string): boolean {
  return /^(\+\d|LEVEL UP|Assignment received:|New message from|Objective complete:|Assignment complete:|You find |You claim |You access the terminal|Progress saved\.)/.test(text);
}

function getNewLogEntries(prevLog: string[], newLog: string[]): string[] {
  if (prevLog.length === 0) return [...newLog];
  const lastPrev = prevLog[prevLog.length - 1];
  const idx = newLog.lastIndexOf(lastPrev);
  if (idx === -1) return [...newLog];
  return newLog.slice(idx + 1);
}
import { api } from "./lib/api";
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
  const prevLogRef = useRef<string[]>([]);
  const prevZoneIdRef = useRef<string | null>(null);

  useEffect(() => {
    void refreshBootstrap();
  }, []);

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
  const selectedItem = selectedItemId ? itemMap.get(selectedItemId) ?? null : null;

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

  async function createRun(): Promise<void> {
    try {
      setBusy(true);
      prevLogRef.current = [];
      const envelope = await api.newRun();
      startTransition(() => {
        setRun(envelope.run);
        // Ribbon shows the entry flavour line; notifications go to toasts
        setStatusText(envelope.run.log[0] ?? "A new descent begins.");
        setToasts([]);
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
      prevLogRef.current = [];
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

  const unreadCount = run?.messages.filter(m => !m.read).length ?? 0;

  const inventory = run?.player.inventory.map((itemId) => itemMap.get(itemId)).filter(Boolean) as Item[] | undefined;
  const currentExits = zone && run ? describeExits(zone, run.posX, run.posY, run, itemMap) : [];
  const roomNpc: NPC | null = currentRoom?.npcId ? npcMap.get(currentRoom.npcId) ?? null : null;
  const roomTerminal: Terminal | null = currentRoom?.terminalId ? terminalMap.get(currentRoom.terminalId) ?? null : null;

  return (
    <div className={run ? "app-shell has-run" : "app-shell landing-shell"}>
      {!run ? (
        <main className="landing-stage">
          <header className="hero-panel hero-panel-landing">
            <div>
              <p className="eyebrow">Frontier Station — West Ring</p>
              <h1>{bootstrap?.title ?? "Echoes of the Hollow Star"}</h1>
              <p className="intro-copy">{bootstrap?.intro ?? "Navigate the maintenance ring and reach the signal core."}</p>
            </div>
            <div className="hero-actions">
              <button onClick={() => void createRun()} disabled={busy}>Begin!</button>
              {bootstrap?.saves?.[0] && (
                <button onClick={() => void loadSave(bootstrap.saves[0].slotId)} disabled={busy}>Load Latest</button>
              )}
              {isAdmin && (
                <button className="btn-secondary" onClick={() => { window.location.href = "/admin"; }}>Admin</button>
              )}
              {onSignOut && (
                <button className="btn-secondary" onClick={onSignOut}>Sign Out</button>
              )}
            </div>
          </header>
          {error && <p className="error-banner">{error}</p>}
        </main>
      ) : (
        <main className="game-grid">
          {run.status === "victory" && (
            <div className="death-overlay" role="dialog" aria-modal="true" aria-label="Victory">
              <div className="death-modal victory-modal">
                <p className="death-eyebrow">Mission complete</p>
                <h2 className="death-heading victory-heading">Signal recovered.</h2>
                <p className="death-sub">{run.log.at(-1) ?? "The Hollow Star falls silent."}</p>
                <button onClick={() => void createRun()} disabled={busy}>Descend Again</button>
              </div>
            </div>
          )}
          {run.status === "defeat" && (
            <div className="death-overlay" role="dialog" aria-modal="true" aria-label="Game over">
              <div className="death-modal">
                <p className="death-eyebrow">Signal lost</p>
                <h2 className="death-heading">You are dead.</h2>
                <p className="death-sub">{run.log.at(-1) ?? "The darkness claims you."}</p>
                <button onClick={() => void createRun()} disabled={busy}>Restart</button>
                {bootstrap?.saves?.[0] && (
                  <button onClick={() => void loadSave(bootstrap.saves[0].slotId)} disabled={busy}>Load Latest</button>
                )}
              </div>
            </div>
          )}
          {error && <p className="error-banner inline-error">{error}</p>}

          <section className="stage-panel">
            {bootstrap && run ? <DungeonViewport bootstrap={bootstrap} run={run} /> : <div className="viewport-shell loading">Lighting the vault...</div>}
            <div className={`status-ribbon${statusFlash ? " status-ribbon--zone" : ""}`}>
              {renderStatusText(statusText, (tab) => { setTabletTab(tab); setTabletOpen(true); })}
            </div>
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

          {tabletOpen && zone && (
            <TabletOverlay
              run={run}
              zone={zone}
              onClose={() => setTabletOpen(false)}
              onMarkRead={() => void handleMarkRead()}
              initialTab={tabletTab}
            />
          )}

          {interactResult && interactResult.kind !== "none" && (
            <div className="interact-overlay" role="dialog" aria-modal="true" aria-label="Interaction">
              <div className="interact-modal">
                {interactResult.kind === "npc" && (
                  <>
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
                <>
                  <p className="room-copy">{currentRoom.title}: {currentRoom.description}</p>
                  <div className="exit-list">
                    {currentExits.map((entry) => <p key={entry}>{entry}</p>)}
                  </div>
                  {(roomNpc || roomTerminal) && (
                    <button
                      className="interact-btn"
                      onClick={() => void handleInteract()}
                      disabled={busy || run.mode === "combat"}
                    >
                      {roomNpc ? `Talk to ${roomNpc.name}` : `Access Terminal`}
                    </button>
                  )}
                </>
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
                    <img src={item.iconPath} alt="" />
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
