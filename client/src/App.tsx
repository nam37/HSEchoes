import { useEffect, useMemo, useState, startTransition } from "react";
import type { BootstrapData, Direction, Item, RunState, Zone, ZoneRoom } from "../../shared/src/index";
import { findRoomContaining, findZoneEdge, formatFaceLabel, DIRECTIONS, resolveEdgeType } from "../../shared/src/index";
import { api } from "./lib/api";
import { DungeonViewport } from "./components/DungeonViewport";
import { MapPanel } from "./components/MapPanel";

function App({ onSignOut, isAdmin }: { onSignOut?: () => void; isAdmin?: boolean }): JSX.Element {
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Waking the lanterns...");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshBootstrap();
  }, []);

  const zone: Zone | null = bootstrap?.zones[0] ?? null;
  const currentRoom: ZoneRoom | null = useMemo(
    () => (zone && run ? findRoomContaining(zone, run.posX, run.posY) ?? null : null),
    [zone, run]
  );
  const itemMap = useMemo(() => new Map((bootstrap?.items ?? []).map((item) => [item.id, item])), [bootstrap]);
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
      const envelope = await api.newRun();
      startTransition(() => {
        setRun(envelope.run);
        setStatusText(envelope.message ?? envelope.run.log.at(-1) ?? "A new descent begins.");
      });
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
      const envelope = await api.loadRun(slotId);
      startTransition(() => {
        setRun(envelope.run);
        setStatusText(envelope.run.log.at(-1) ?? `Loaded run ${slotId}.`);
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
      await refreshBootstrap(true);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const inventory = run?.player.inventory.map((itemId) => itemMap.get(itemId)).filter(Boolean) as Item[] | undefined;
  const currentExits = zone && run ? describeExits(zone, run.posX, run.posY, run, itemMap) : [];

  return (
    <div className={run ? "app-shell has-run" : "app-shell landing-shell"}>
      {!run ? (
        <main className="landing-stage">
          <header className="hero-panel hero-panel-landing">
            <div>
              <p className="eyebrow">Retro Dungeon PoC</p>
              <h1>{bootstrap?.title ?? "Echoes of the Hollow Star"}</h1>
              <p className="intro-copy">{bootstrap?.intro ?? "A short descent into a cursed ruin."}</p>
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
            <div className="status-ribbon">{statusText}</div>
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

          <aside className="sidebar">
            <section className="hud-card explorer-card">
              <div className="panel-heading-row">
                <h2>Explorer</h2>
                <div className="panel-actions">
                  <button onClick={() => void saveRun()} disabled={busy || run.mode === "combat"}>Save</button>
                </div>
              </div>
              <div className="stat-grid">
                <p><strong>HP</strong> {run.player.hp}/{run.player.maxHp}</p>
                <p><strong>Gold</strong> {run.player.gold}</p>
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
              {bootstrap && zone && run ? <MapPanel zone={zone} run={run} /> : <p>Map unavailable.</p>}
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
