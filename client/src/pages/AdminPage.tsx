import React, { useEffect, useReducer, useState } from "react";
import { api, type AdminStats, type WorldContent, type UserProfile } from "../lib/api";
import type { DungeonCell, Enemy, Encounter, Item, CellFace, Direction, ItemSlot } from "../../../shared/src/index";
import type { SaveSummary } from "../../../shared/src/index";

interface AdminPageProps {
  userEmail: string | null;
  onSignOut: () => Promise<void>;
}

type Tab = "overview" | "map" | "cells" | "enemies" | "items" | "encounters" | "users";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DIRECTIONS: Direction[] = ["north", "east", "south", "west"];
const FACES: CellFace[] = ["wall", "open", "door", "gate"];
const ITEM_SLOTS: ItemSlot[] = ["weapon", "armor", "accessory", "consumable"];

function cellBorderColor(face: CellFace): string {
  switch (face) {
    case "wall":  return "rgba(26,37,54,1)";
    case "open":  return "rgba(0,220,150,0.85)";
    case "door":  return "rgba(255,204,0,0.85)";
    case "gate":  return "rgba(223,94,51,0.85)";
  }
}

function newCell(): DungeonCell {
  return {
    id: "", title: "", description: "", x: 0, y: 0,
    sides: { north: "wall", east: "wall", south: "wall", west: "wall" },
    wallTexture: "wall_default", floorTexture: "floor_default", ceilingColor: "#050d1a"
  };
}

function newEnemy(): Enemy {
  return { id: "", name: "", maxHp: 10, attack: 2, defense: 0, spritePath: "/enemies/default.png", introLine: "" };
}

function newItem(): Item {
  return { id: "", name: "", slot: "consumable", description: "", iconPath: "/icons/default.png" };
}

function newEncounter(): Encounter {
  return { id: "", enemyId: "", intro: "", victoryText: "", defeatText: "", canFlee: true, rewardItemIds: [], once: true };
}

// ── Modal wrappers ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }): JSX.Element {
  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3 className="admin-modal-title">{title}</h3>
          <button className="admin-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="admin-modal-body">{children}</div>
      </div>
    </div>
  );
}

// ── Cell editor ───────────────────────────────────────────────────────────────

function CellEditor({ initial, onSave, onClose }: {
  initial: DungeonCell;
  onSave: (cell: DungeonCell) => Promise<void>;
  onClose: () => void;
}): JSX.Element {
  const [cell, setCell] = useState<DungeonCell>({ ...initial });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setField<K extends keyof DungeonCell>(key: K, val: DungeonCell[K]): void {
    setCell((prev) => ({ ...prev, [key]: val }));
  }
  function setSide(dir: Direction, face: CellFace): void {
    setCell((prev) => ({ ...prev, sides: { ...prev.sides, [dir]: face } }));
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!cell.id.trim()) { setErr("ID is required."); return; }
    setBusy(true);
    try {
      await onSave(cell);
      onClose();
    } catch (caught) {
      setErr((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={(e) => void submit(e)}>
      {err && <p className="error-banner">{err}</p>}
      <div className="admin-form-grid">
        <label>ID<input value={cell.id} onChange={(e) => setField("id", e.target.value)} disabled={!!initial.id} /></label>
        <label>Title<input value={cell.title} onChange={(e) => setField("title", e.target.value)} /></label>
        <label>X<input type="number" value={cell.x} onChange={(e) => setField("x", Number(e.target.value))} /></label>
        <label>Y<input type="number" value={cell.y} onChange={(e) => setField("y", Number(e.target.value))} /></label>
        <label>Wall Texture<input value={cell.wallTexture} onChange={(e) => setField("wallTexture", e.target.value)} /></label>
        <label>Floor Texture<input value={cell.floorTexture} onChange={(e) => setField("floorTexture", e.target.value)} /></label>
        <label>Ceiling Color<input value={cell.ceilingColor} onChange={(e) => setField("ceilingColor", e.target.value)} /></label>
        <label>Encounter ID<input value={cell.encounterId ?? ""} onChange={(e) => setField("encounterId", e.target.value || undefined)} /></label>
        <label>Prop<input value={cell.prop ?? ""} onChange={(e) => setField("prop", e.target.value || undefined)} /></label>
        <label className="span-2">Description<textarea value={cell.description} onChange={(e) => setField("description", e.target.value)} /></label>
        <label className="span-2">Discovery Text<textarea value={cell.discoveryText ?? ""} onChange={(e) => setField("discoveryText", e.target.value || undefined)} /></label>
        <label className="span-2">Loot (comma-separated IDs)<input value={cell.loot?.join(",") ?? ""} onChange={(e) => setField("loot", e.target.value ? e.target.value.split(",").map((s) => s.trim()) : undefined)} /></label>
        <label>Victory Cell<input type="checkbox" checked={!!cell.victory} onChange={(e) => setField("victory", e.target.checked || undefined)} /></label>
      </div>
      <div className="admin-form-sides">
        {DIRECTIONS.map((dir) => (
          <label key={dir}>
            {dir.charAt(0).toUpperCase() + dir.slice(1)}
            <select value={cell.sides[dir]} onChange={(e) => setSide(dir, e.target.value as CellFace)}>
              {FACES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div className="admin-modal-footer">
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={busy}>Save Cell</button>
      </div>
    </form>
  );
}

// ── Enemy editor ──────────────────────────────────────────────────────────────

function EnemyEditor({ initial, onSave, onClose }: {
  initial: Enemy;
  onSave: (e: Enemy) => Promise<void>;
  onClose: () => void;
}): JSX.Element {
  const [enemy, setEnemy] = useState<Enemy>({ ...initial });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setField<K extends keyof Enemy>(key: K, val: Enemy[K]): void {
    setEnemy((prev) => ({ ...prev, [key]: val }));
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!enemy.id.trim()) { setErr("ID is required."); return; }
    setBusy(true);
    try {
      await onSave(enemy);
      onClose();
    } catch (caught) {
      setErr((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={(e) => void submit(e)}>
      {err && <p className="error-banner">{err}</p>}
      <div className="admin-form-grid">
        <label>ID<input value={enemy.id} onChange={(e) => setField("id", e.target.value)} disabled={!!initial.id} /></label>
        <label>Name<input value={enemy.name} onChange={(e) => setField("name", e.target.value)} /></label>
        <label>Max HP<input type="number" value={enemy.maxHp} onChange={(e) => setField("maxHp", Number(e.target.value))} /></label>
        <label>Attack<input type="number" value={enemy.attack} onChange={(e) => setField("attack", Number(e.target.value))} /></label>
        <label>Defense<input type="number" value={enemy.defense} onChange={(e) => setField("defense", Number(e.target.value))} /></label>
        <label>Sprite Path<input value={enemy.spritePath} onChange={(e) => setField("spritePath", e.target.value)} /></label>
        <label className="span-2">Intro Line<textarea value={enemy.introLine} onChange={(e) => setField("introLine", e.target.value)} /></label>
      </div>
      <div className="admin-modal-footer">
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={busy}>Save Enemy</button>
      </div>
    </form>
  );
}

// ── Item editor ───────────────────────────────────────────────────────────────

function ItemEditor({ initial, onSave, onClose }: {
  initial: Item;
  onSave: (item: Item) => Promise<void>;
  onClose: () => void;
}): JSX.Element {
  const [item, setItem] = useState<Item>({ ...initial });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setField<K extends keyof Item>(key: K, val: Item[K]): void {
    setItem((prev) => ({ ...prev, [key]: val }));
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!item.id.trim()) { setErr("ID is required."); return; }
    setBusy(true);
    try {
      await onSave(item);
      onClose();
    } catch (caught) {
      setErr((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={(e) => void submit(e)}>
      {err && <p className="error-banner">{err}</p>}
      <div className="admin-form-grid">
        <label>ID<input value={item.id} onChange={(e) => setField("id", e.target.value)} disabled={!!initial.id} /></label>
        <label>Name<input value={item.name} onChange={(e) => setField("name", e.target.value)} /></label>
        <label>Slot
          <select value={item.slot} onChange={(e) => setField("slot", e.target.value as ItemSlot)}>
            {ITEM_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>Icon Path<input value={item.iconPath} onChange={(e) => setField("iconPath", e.target.value)} /></label>
        <label>Attack Bonus<input type="number" value={item.attackBonus ?? ""} onChange={(e) => setField("attackBonus", e.target.value ? Number(e.target.value) : undefined)} /></label>
        <label>Defense Bonus<input type="number" value={item.defenseBonus ?? ""} onChange={(e) => setField("defenseBonus", e.target.value ? Number(e.target.value) : undefined)} /></label>
        <label>Heal Amount<input type="number" value={item.healAmount ?? ""} onChange={(e) => setField("healAmount", e.target.value ? Number(e.target.value) : undefined)} /></label>
        <label>Key Item<input type="checkbox" checked={!!item.keyItem} onChange={(e) => setField("keyItem", e.target.checked || undefined)} /></label>
        <label className="span-2">Description<textarea value={item.description} onChange={(e) => setField("description", e.target.value)} /></label>
      </div>
      <div className="admin-modal-footer">
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={busy}>Save Item</button>
      </div>
    </form>
  );
}

// ── Encounter editor ──────────────────────────────────────────────────────────

function EncounterEditor({ initial, enemies, items, onSave, onClose }: {
  initial: Encounter;
  enemies: Enemy[];
  items: Item[];
  onSave: (enc: Encounter) => Promise<void>;
  onClose: () => void;
}): JSX.Element {
  const [enc, setEnc] = useState<Encounter>({ ...initial });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setField<K extends keyof Encounter>(key: K, val: Encounter[K]): void {
    setEnc((prev) => ({ ...prev, [key]: val }));
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!enc.id.trim()) { setErr("ID is required."); return; }
    setBusy(true);
    try {
      await onSave(enc);
      onClose();
    } catch (caught) {
      setErr((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={(e) => void submit(e)}>
      {err && <p className="error-banner">{err}</p>}
      <div className="admin-form-grid">
        <label>ID<input value={enc.id} onChange={(e) => setField("id", e.target.value)} disabled={!!initial.id} /></label>
        <label>Enemy
          <select value={enc.enemyId} onChange={(e) => setField("enemyId", e.target.value)}>
            <option value="">— select —</option>
            {enemies.map((en) => <option key={en.id} value={en.id}>{en.name}</option>)}
          </select>
        </label>
        <label>Can Flee<input type="checkbox" checked={enc.canFlee} onChange={(e) => setField("canFlee", e.target.checked)} /></label>
        <label>Once<input type="checkbox" checked={enc.once} onChange={(e) => setField("once", e.target.checked)} /></label>
        <label className="span-2">Intro<textarea value={enc.intro} onChange={(e) => setField("intro", e.target.value)} /></label>
        <label className="span-2">Victory Text<textarea value={enc.victoryText} onChange={(e) => setField("victoryText", e.target.value)} /></label>
        <label className="span-2">Defeat Text<textarea value={enc.defeatText} onChange={(e) => setField("defeatText", e.target.value)} /></label>
        <label className="span-2">Reward Items
          <div className="admin-checkbox-group">
            {items.map((it) => (
              <label key={it.id} className="admin-checkbox-label">
                <input
                  type="checkbox"
                  checked={enc.rewardItemIds.includes(it.id)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...enc.rewardItemIds, it.id]
                      : enc.rewardItemIds.filter((id) => id !== it.id);
                    setField("rewardItemIds", next);
                  }}
                />
                {it.name}
              </label>
            ))}
          </div>
        </label>
      </div>
      <div className="admin-modal-footer">
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={busy}>Save Encounter</button>
      </div>
    </form>
  );
}

// ── Map Grid tab ──────────────────────────────────────────────────────────────

function MapGrid({ cells, onClickCell, onClickEmpty }: {
  cells: DungeonCell[];
  onClickCell: (cell: DungeonCell) => void;
  onClickEmpty: (x: number, y: number) => void;
}): JSX.Element {
  if (cells.length === 0) {
    return <p className="admin-empty">No cells defined yet. Go to the Cells tab to add some.</p>;
  }

  const xs = cells.map((c) => c.x);
  const ys = cells.map((c) => c.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // Expand by 1 on each side to allow adding adjacent cells
  const gridMinX = minX - 1;
  const gridMaxX = maxX + 1;
  const gridMinY = minY - 1;
  const gridMaxY = maxY + 1;

  const cols = gridMaxX - gridMinX + 1;
  const byCoord = new Map(cells.map((c) => [`${c.x}:${c.y}`, c]));

  const tiles: JSX.Element[] = [];
  for (let y = gridMinY; y <= gridMaxY; y++) {
    for (let x = gridMinX; x <= gridMaxX; x++) {
      const cell = byCoord.get(`${x}:${y}`);
      if (cell) {
        tiles.push(
          <div
            key={`${x}:${y}`}
            className="map-admin-cell occupied"
            title={`${cell.title} (${x},${y})`}
            style={{
              borderTop: `2px solid ${cellBorderColor(cell.sides.north)}`,
              borderRight: `2px solid ${cellBorderColor(cell.sides.east)}`,
              borderBottom: `2px solid ${cellBorderColor(cell.sides.south)}`,
              borderLeft: `2px solid ${cellBorderColor(cell.sides.west)}`,
            }}
            onClick={() => onClickCell(cell)}
          >
            <span className="map-admin-cell-label">{cell.id}</span>
            {cell.encounterId && <span className="map-admin-badge enemy-badge">!</span>}
            {cell.loot && cell.loot.length > 0 && <span className="map-admin-badge loot-badge">$</span>}
            {cell.victory && <span className="map-admin-badge victory-badge">★</span>}
          </div>
        );
      } else {
        tiles.push(
          <div
            key={`${x}:${y}`}
            className="map-admin-cell empty"
            title={`Add cell at (${x},${y})`}
            onClick={() => onClickEmpty(x, y)}
          >
            <span className="map-admin-add">+</span>
          </div>
        );
      }
    }
  }

  return (
    <div className="map-admin-wrap">
      <div className="map-admin-legend">
        <span style={{ borderBottom: `3px solid ${cellBorderColor("open")}` }}>open</span>
        <span style={{ borderBottom: `3px solid ${cellBorderColor("door")}` }}>door</span>
        <span style={{ borderBottom: `3px solid ${cellBorderColor("gate")}` }}>gate</span>
        <span style={{ borderBottom: `3px solid ${cellBorderColor("wall")}` }}>wall</span>
      </div>
      <div
        className="map-admin-grid"
        style={{ gridTemplateColumns: `repeat(${cols}, 56px)` }}
      >
        {tiles}
      </div>
    </div>
  );
}

// ── Main AdminPage ────────────────────────────────────────────────────────────

type Modal =
  | { kind: "cell"; cell: DungeonCell }
  | { kind: "enemy"; enemy: Enemy }
  | { kind: "item"; item: Item }
  | { kind: "encounter"; encounter: Encounter }
  | null;

// force re-render when world updates
function useForceUpdate(): () => void {
  const [, dispatch] = useReducer((n: number) => n + 1, 0);
  return dispatch;
}

export default function AdminPage({ userEmail, onSignOut }: AdminPageProps): JSX.Element {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [runs, setRuns] = useState<SaveSummary[]>([]);
  const [world, setWorld] = useState<WorldContent | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [reloadMsg, setReloadMsg] = useState<string | null>(null);
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData(): Promise<void> {
    try {
      setLoading(true);
      const [statsData, runsData, worldData, usersData] = await Promise.all([
        api.adminStats(),
        api.adminRuns(),
        api.adminWorld(),
        api.adminUsers()
      ]);
      setStats(statsData);
      setRuns(runsData);
      setWorld(worldData);
      setUsers(usersData);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteRun(slotId: string): Promise<void> {
    if (!confirm(`Delete run ${slotId}?`)) return;
    try {
      setBusy(true);
      await api.adminDeleteRun(slotId);
      setRuns((prev) => prev.filter((r) => r.slotId !== slotId));
      if (stats) setStats({ ...stats, totalRuns: stats.totalRuns - 1 });
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReload(): Promise<void> {
    try {
      setBusy(true);
      await api.adminReload();
      setReloadMsg("In-memory cache reloaded — game engine now uses your saved changes.");
      setTimeout(() => setReloadMsg(null), 5000);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // ── User role handler ──────────────────────────────────────────────────────

  async function handleSetRole(userId: string, role: string): Promise<void> {
    try {
      setBusy(true);
      await api.adminSetRole(userId, role);
      setUsers((prev) => prev.map((u) => u.userId === userId ? { ...u, role } : u));
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // ── Cell handlers ──────────────────────────────────────────────────────────

  function openAddCell(x: number, y: number): void {
    setModal({ kind: "cell", cell: { ...newCell(), x, y } });
  }

  async function saveCell(cell: DungeonCell): Promise<void> {
    await api.adminUpsertCell(cell.id, cell);
    setWorld((prev) => {
      if (!prev) return prev;
      const filtered = prev.cells.filter((c) => c.id !== cell.id);
      return { ...prev, cells: [...filtered, cell] };
    });
    forceUpdate();
  }

  async function deleteCell(id: string): Promise<void> {
    if (!confirm(`Delete cell "${id}"?`)) return;
    await api.adminDeleteCell(id);
    setWorld((prev) => prev ? { ...prev, cells: prev.cells.filter((c) => c.id !== id) } : prev);
    setModal(null);
  }

  // ── Enemy handlers ─────────────────────────────────────────────────────────

  async function saveEnemy(enemy: Enemy): Promise<void> {
    await api.adminUpsertEnemy(enemy.id, enemy);
    setWorld((prev) => {
      if (!prev) return prev;
      const filtered = prev.enemies.filter((e) => e.id !== enemy.id);
      return { ...prev, enemies: [...filtered, enemy] };
    });
  }

  async function deleteEnemy(id: string): Promise<void> {
    if (!confirm(`Delete enemy "${id}"?`)) return;
    await api.adminDeleteEnemy(id);
    setWorld((prev) => prev ? { ...prev, enemies: prev.enemies.filter((e) => e.id !== id) } : prev);
    setModal(null);
  }

  // ── Item handlers ──────────────────────────────────────────────────────────

  async function saveItem(item: Item): Promise<void> {
    await api.adminUpsertItem(item.id, item);
    setWorld((prev) => {
      if (!prev) return prev;
      const filtered = prev.items.filter((i) => i.id !== item.id);
      return { ...prev, items: [...filtered, item] };
    });
  }

  async function deleteItem(id: string): Promise<void> {
    if (!confirm(`Delete item "${id}"?`)) return;
    await api.adminDeleteItem(id);
    setWorld((prev) => prev ? { ...prev, items: prev.items.filter((i) => i.id !== id) } : prev);
    setModal(null);
  }

  // ── Encounter handlers ─────────────────────────────────────────────────────

  async function saveEncounter(enc: Encounter): Promise<void> {
    await api.adminUpsertEncounter(enc.id, enc);
    setWorld((prev) => {
      if (!prev) return prev;
      const filtered = prev.encounters.filter((e) => e.id !== enc.id);
      return { ...prev, encounters: [...filtered, enc] };
    });
  }

  async function deleteEncounter(id: string): Promise<void> {
    if (!confirm(`Delete encounter "${id}"?`)) return;
    await api.adminDeleteEncounter(id);
    setWorld((prev) => prev ? { ...prev, encounters: prev.encounters.filter((e) => e.id !== id) } : prev);
    setModal(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="admin-shell">
      <nav className="admin-nav">
        <div className="admin-nav-left">
          <span className="admin-nav-title">ADMIN CONSOLE</span>
          <a href="/" className="admin-nav-link">← Back to Game</a>
        </div>
        <div className="admin-nav-right">
          <button className="btn-accent" onClick={() => void handleReload()} disabled={busy} title="Push saved DB changes into the live game engine">Publish Changes</button>
          {userEmail && <span className="admin-user-badge">{userEmail}</span>}
          <button onClick={() => void onSignOut()} className="admin-signout">Sign Out</button>
        </div>
      </nav>

      {reloadMsg && <p className="admin-reload-toast">{reloadMsg}</p>}
      {error && <p className="error-banner">{error}</p>}

      <div className="admin-tabs">
        {(["overview", "map", "cells", "enemies", "items", "encounters", "users"] as Tab[]).map((t) => (
          <button key={t} className={`admin-tab-btn${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <main className="admin-main">
        {loading ? (
          <p className="admin-loading">Loading<span className="blink">_</span></p>
        ) : (
          <>
            {/* ── Overview ─────────────────────────────────────────── */}
            {tab === "overview" && (
              <>
                {stats && (
                  <section className="admin-section">
                    <h2 className="admin-section-title">Run Statistics</h2>
                    <div className="admin-stats-grid">
                      <div className="admin-stat-card"><p className="stat-value">{stats.totalRuns}</p><p className="stat-label">Total Runs</p></div>
                      <div className="admin-stat-card stat-active"><p className="stat-value">{stats.activeRuns}</p><p className="stat-label">Active</p></div>
                      <div className="admin-stat-card stat-defeat"><p className="stat-value">{stats.defeatedRuns}</p><p className="stat-label">Defeated</p></div>
                      <div className="admin-stat-card stat-victory"><p className="stat-value">{stats.victoryRuns}</p><p className="stat-label">Victory</p></div>
                    </div>
                  </section>
                )}
                {world && (
                  <section className="admin-section">
                    <h2 className="admin-section-title">World Summary</h2>
                    <div className="admin-stats-grid">
                      <div className="admin-stat-card"><p className="stat-value">{world.cells.length}</p><p className="stat-label">Cells</p></div>
                      <div className="admin-stat-card"><p className="stat-value">{world.enemies.length}</p><p className="stat-label">Enemies</p></div>
                      <div className="admin-stat-card"><p className="stat-value">{world.items.length}</p><p className="stat-label">Items</p></div>
                      <div className="admin-stat-card"><p className="stat-value">{world.encounters.length}</p><p className="stat-label">Encounters</p></div>
                    </div>
                  </section>
                )}
                <section className="admin-section">
                  <div className="admin-section-header">
                    <h2 className="admin-section-title">All Runs</h2>
                    <button onClick={() => void loadData()} disabled={loading}>Refresh</button>
                  </div>
                  {runs.length === 0 ? (
                    <p className="admin-empty">No runs yet.</p>
                  ) : (
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead><tr><th>Slot</th><th>Cell</th><th>Status</th><th>Mode</th><th>Updated</th><th></th></tr></thead>
                        <tbody>
                          {runs.map((run) => (
                            <tr key={run.slotId} className={`run-row run-${run.status}`}>
                              <td className="run-slot">{run.slotId}</td>
                              <td>{run.cellId}</td>
                              <td><span className={`status-badge status-${run.status}`}>{run.status}</span></td>
                              <td>{run.mode}</td>
                              <td className="run-time">{new Date(run.updatedAt).toLocaleString()}</td>
                              <td><button className="btn-danger" onClick={() => void handleDeleteRun(run.slotId)} disabled={busy}>Delete</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}

            {/* ── Map ──────────────────────────────────────────────── */}
            {tab === "map" && world && (
              <section className="admin-section">
                <div className="admin-section-header">
                  <h2 className="admin-section-title">Map Grid</h2>
                  <p className="admin-hint">Click a cell to edit it. Click <strong>+</strong> in an empty space to add a cell there.</p>
                </div>
                <MapGrid
                  cells={world.cells}
                  onClickCell={(cell) => setModal({ kind: "cell", cell })}
                  onClickEmpty={(x, y) => openAddCell(x, y)}
                />
              </section>
            )}

            {/* ── Cells ────────────────────────────────────────────── */}
            {tab === "cells" && world && (
              <section className="admin-section">
                <div className="admin-section-header">
                  <h2 className="admin-section-title">Cells ({world.cells.length})</h2>
                  <button className="btn-primary" onClick={() => setModal({ kind: "cell", cell: newCell() })}>+ New Cell</button>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>ID</th><th>Title</th><th>x,y</th><th>Encounter</th><th>Loot</th><th></th></tr></thead>
                    <tbody>
                      {world.cells.sort((a, b) => a.id.localeCompare(b.id)).map((cell) => (
                        <tr key={cell.id}>
                          <td className="run-slot">{cell.id}</td>
                          <td>{cell.title}</td>
                          <td>{cell.x},{cell.y}</td>
                          <td>{cell.encounterId ?? "—"}</td>
                          <td>{cell.loot?.join(", ") ?? "—"}</td>
                          <td className="admin-row-actions">
                            <button onClick={() => setModal({ kind: "cell", cell })}>Edit</button>
                            <button className="btn-danger" onClick={() => void deleteCell(cell.id)} disabled={busy}>Del</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ── Enemies ──────────────────────────────────────────── */}
            {tab === "enemies" && world && (
              <section className="admin-section">
                <div className="admin-section-header">
                  <h2 className="admin-section-title">Enemies ({world.enemies.length})</h2>
                  <button className="btn-primary" onClick={() => setModal({ kind: "enemy", enemy: newEnemy() })}>+ New Enemy</button>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>ID</th><th>Name</th><th>HP</th><th>ATK</th><th>DEF</th><th></th></tr></thead>
                    <tbody>
                      {world.enemies.sort((a, b) => a.id.localeCompare(b.id)).map((enemy) => (
                        <tr key={enemy.id}>
                          <td className="run-slot">{enemy.id}</td>
                          <td>{enemy.name}</td>
                          <td>{enemy.maxHp}</td>
                          <td>{enemy.attack}</td>
                          <td>{enemy.defense}</td>
                          <td className="admin-row-actions">
                            <button onClick={() => setModal({ kind: "enemy", enemy })}>Edit</button>
                            <button className="btn-danger" onClick={() => void deleteEnemy(enemy.id)} disabled={busy}>Del</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ── Items ────────────────────────────────────────────── */}
            {tab === "items" && world && (
              <section className="admin-section">
                <div className="admin-section-header">
                  <h2 className="admin-section-title">Items ({world.items.length})</h2>
                  <button className="btn-primary" onClick={() => setModal({ kind: "item", item: newItem() })}>+ New Item</button>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>ID</th><th>Name</th><th>Slot</th><th>ATK+</th><th>DEF+</th><th>Heal</th><th></th></tr></thead>
                    <tbody>
                      {world.items.sort((a, b) => a.id.localeCompare(b.id)).map((item) => (
                        <tr key={item.id}>
                          <td className="run-slot">{item.id}</td>
                          <td>{item.name}</td>
                          <td>{item.slot}</td>
                          <td>{item.attackBonus ?? "—"}</td>
                          <td>{item.defenseBonus ?? "—"}</td>
                          <td>{item.healAmount ?? "—"}</td>
                          <td className="admin-row-actions">
                            <button onClick={() => setModal({ kind: "item", item })}>Edit</button>
                            <button className="btn-danger" onClick={() => void deleteItem(item.id)} disabled={busy}>Del</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ── Users ────────────────────────────────────────────── */}
            {tab === "users" && (
              <section className="admin-section">
                <div className="admin-section-header">
                  <h2 className="admin-section-title">Users ({users.length})</h2>
                  <button onClick={() => void loadData()} disabled={loading}>Refresh</button>
                </div>
                {users.length === 0 ? (
                  <p className="admin-empty">No registered users yet.</p>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead><tr><th>Email</th><th>Role</th><th>Joined</th><th></th></tr></thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.userId}>
                            <td>{u.email}</td>
                            <td>
                              <span className={`status-badge ${u.role === "admin" ? "status-victory" : "status-active"}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="run-time">{new Date(u.createdAt).toLocaleDateString()}</td>
                            <td className="admin-row-actions">
                              {u.role === "admin" ? (
                                <button onClick={() => void handleSetRole(u.userId, "player")} disabled={busy}>Demote</button>
                              ) : (
                                <button className="btn-primary" onClick={() => void handleSetRole(u.userId, "admin")} disabled={busy}>Make Admin</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* ── Encounters ───────────────────────────────────────── */}
            {tab === "encounters" && world && (
              <section className="admin-section">
                <div className="admin-section-header">
                  <h2 className="admin-section-title">Encounters ({world.encounters.length})</h2>
                  <button className="btn-primary" onClick={() => setModal({ kind: "encounter", encounter: newEncounter() })}>+ New Encounter</button>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>ID</th><th>Enemy</th><th>Can Flee</th><th>Rewards</th><th></th></tr></thead>
                    <tbody>
                      {world.encounters.sort((a, b) => a.id.localeCompare(b.id)).map((enc) => (
                        <tr key={enc.id}>
                          <td className="run-slot">{enc.id}</td>
                          <td>{enc.enemyId}</td>
                          <td>{enc.canFlee ? "Yes" : "No"}</td>
                          <td>{enc.rewardItemIds.join(", ") || "—"}</td>
                          <td className="admin-row-actions">
                            <button onClick={() => setModal({ kind: "encounter", encounter: enc })}>Edit</button>
                            <button className="btn-danger" onClick={() => void deleteEncounter(enc.id)} disabled={busy}>Del</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {modal?.kind === "cell" && (
        <Modal title={modal.cell.id ? `Edit Cell: ${modal.cell.id}` : "New Cell"} onClose={() => setModal(null)}>
          <CellEditor initial={modal.cell} onSave={saveCell} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal?.kind === "enemy" && (
        <Modal title={modal.enemy.id ? `Edit Enemy: ${modal.enemy.id}` : "New Enemy"} onClose={() => setModal(null)}>
          <EnemyEditor initial={modal.enemy} onSave={saveEnemy} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal?.kind === "item" && (
        <Modal title={modal.item.id ? `Edit Item: ${modal.item.id}` : "New Item"} onClose={() => setModal(null)}>
          <ItemEditor initial={modal.item} onSave={saveItem} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal?.kind === "encounter" && world && (
        <Modal title={modal.encounter.id ? `Edit Encounter: ${modal.encounter.id}` : "New Encounter"} onClose={() => setModal(null)}>
          <EncounterEditor
            initial={modal.encounter}
            enemies={world.enemies}
            items={world.items}
            onSave={saveEncounter}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}
