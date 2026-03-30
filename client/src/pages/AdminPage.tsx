import React, { useEffect, useReducer, useState } from "react";
import { api, type AdminStats, type WorldContent, type UserProfile } from "../lib/api";
import type { Encounter, Enemy, Item, Zone } from "../../../shared/src/index";
import type { SaveSummary } from "../../../shared/src/index";
import { EnemyEditor } from "../components/admin/EnemyEditor";
import { ItemEditor } from "../components/admin/ItemEditor";
import { EncounterEditor } from "../components/admin/EncounterEditor";
import { ZoneEditor } from "../components/admin/ZoneEditor";

interface AdminPageProps {
  userEmail: string | null;
  onSignOut: () => Promise<void>;
}

type Tab = "overview" | "map" | "zones" | "enemies" | "items" | "encounters" | "users";

type AdminModal =
  | { kind: "enemy"; enemy: Enemy }
  | { kind: "item"; item: Item }
  | { kind: "encounter"; encounter: Encounter }
  | null;

function newEnemy(): Enemy {
  return { id: "", name: "", maxHp: 10, attack: 2, defense: 0, spritePath: "/enemies/default.png", introLine: "" };
}

function newItem(): Item {
  return { id: "", name: "", slot: "consumable", description: "", iconPath: "/icons/default.png" };
}

function newEncounter(): Encounter {
  return { id: "", enemyId: "", intro: "", victoryText: "", defeatText: "", canFlee: true, rewardItemIds: [], once: true };
}

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
  const [modal, setModal] = useState<AdminModal>(null);
  const [reloadMsg, setReloadMsg] = useState<string | null>(null);
  const forceUpdate = useForceUpdate();

  useEffect(() => { void loadData(); }, []);

  async function loadData(): Promise<void> {
    try {
      setLoading(true);
      const [statsData, runsData, worldData, usersData] = await Promise.all([
        api.adminStats(), api.adminRuns(), api.adminWorld(), api.adminUsers()
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
    } catch (caught) { setError((caught as Error).message); }
    finally { setBusy(false); }
  }

  async function handleReload(): Promise<void> {
    try {
      setBusy(true);
      await api.adminReload();
      setReloadMsg("In-memory cache reloaded — game engine now uses your saved changes.");
      setTimeout(() => setReloadMsg(null), 5000);
    } catch (caught) { setError((caught as Error).message); }
    finally { setBusy(false); }
  }

  async function handleSetRole(userId: string, role: string): Promise<void> {
    try {
      setBusy(true);
      await api.adminSetRole(userId, role);
      setUsers((prev) => prev.map((u) => u.userId === userId ? { ...u, role } : u));
    } catch (caught) { setError((caught as Error).message); }
    finally { setBusy(false); }
  }

  async function saveEnemy(enemy: Enemy): Promise<void> {
    await api.adminUpsertEnemy(enemy.id, enemy);
    setWorld((prev) => prev ? { ...prev, enemies: [...prev.enemies.filter((e) => e.id !== enemy.id), enemy] } : prev);
    forceUpdate();
  }

  async function deleteEnemy(id: string): Promise<void> {
    if (!confirm(`Delete enemy "${id}"?`)) return;
    await api.adminDeleteEnemy(id);
    setWorld((prev) => prev ? { ...prev, enemies: prev.enemies.filter((e) => e.id !== id) } : prev);
    setModal(null);
  }

  async function saveItem(item: Item): Promise<void> {
    await api.adminUpsertItem(item.id, item);
    setWorld((prev) => prev ? { ...prev, items: [...prev.items.filter((i) => i.id !== item.id), item] } : prev);
    forceUpdate();
  }

  async function deleteItem(id: string): Promise<void> {
    if (!confirm(`Delete item "${id}"?`)) return;
    await api.adminDeleteItem(id);
    setWorld((prev) => prev ? { ...prev, items: prev.items.filter((i) => i.id !== id) } : prev);
    setModal(null);
  }

  async function saveZone(zone: Zone): Promise<void> {
    await api.adminUpsertZone(zone.id, zone);
    setWorld((prev) => prev ? { ...prev, zones: prev.zones.map((z) => z.id === zone.id ? zone : z) } : prev);
    await api.adminReload();
  }

  async function saveEncounter(enc: Encounter): Promise<void> {
    await api.adminUpsertEncounter(enc.id, enc);
    setWorld((prev) => prev ? { ...prev, encounters: [...prev.encounters.filter((e) => e.id !== enc.id), enc] } : prev);
    forceUpdate();
  }

  async function deleteEncounter(id: string): Promise<void> {
    if (!confirm(`Delete encounter "${id}"?`)) return;
    await api.adminDeleteEncounter(id);
    setWorld((prev) => prev ? { ...prev, encounters: prev.encounters.filter((e) => e.id !== id) } : prev);
    setModal(null);
  }

  const firstZone = world?.zones[0];
  const totalRooms = world?.zones.reduce((sum, z) => sum + z.rooms.length, 0) ?? 0;

  return (
    <div className="admin-shell">
      <nav className="admin-nav">
        <div className="admin-nav-left">
          <span className="admin-nav-title">ADMIN CONSOLE</span>
          <a href="/" className="admin-nav-link">← Back to Game</a>
        </div>
        <div className="admin-nav-right">
          <button className="btn-accent" onClick={() => void handleReload()} disabled={busy}>Publish Changes</button>
          {userEmail && <span className="admin-user-badge">{userEmail}</span>}
          <button onClick={() => void onSignOut()} className="admin-signout">Sign Out</button>
        </div>
      </nav>

      {reloadMsg && <p className="admin-reload-toast">{reloadMsg}</p>}
      {error && <p className="error-banner">{error}</p>}

      <div className="admin-tabs">
        {(["overview", "map", "zones", "enemies", "items", "encounters", "users"] as Tab[]).map((t) => (
          <button key={t} className={`admin-tab-btn${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <main className="admin-main">
        {loading ? <p className="admin-loading">Loading<span className="blink">_</span></p> : (
          <>
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
                      <div className="admin-stat-card"><p className="stat-value">{world.zones.length}</p><p className="stat-label">Zones</p></div>
                      <div className="admin-stat-card"><p className="stat-value">{totalRooms}</p><p className="stat-label">Rooms</p></div>
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
                  {runs.length === 0 ? <p className="admin-empty">No runs yet.</p> : (
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead><tr><th>Slot</th><th>Room</th><th>Status</th><th>Mode</th><th>Updated</th><th></th></tr></thead>
                        <tbody>
                          {runs.map((run) => (
                            <tr key={run.slotId} className={`run-row run-${run.status}`}>
                              <td className="run-slot">{run.slotId}</td>
                              <td>{run.roomId}</td>
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

            {tab === "map" && (firstZone ? (
              <section className="admin-section">
                <h2 className="admin-section-title">Zone Editor: {firstZone.title}</h2>
                <ZoneEditor zone={firstZone} onSave={saveZone} />
              </section>
            ) : <p className="admin-empty">No zones found.</p>)}

            {tab === "zones" && world && (
              <section className="admin-section">
                <h2 className="admin-section-title">Zones ({world.zones.length})</h2>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>ID</th><th>Title</th><th>Grid</th><th>Rooms</th><th>Edges</th></tr></thead>
                    <tbody>
                      {world.zones.map((zone) => (
                        <tr key={zone.id} onClick={() => setTab("map")} style={{ cursor: "pointer" }}>
                          <td className="run-slot">{zone.id}</td>
                          <td>{zone.title}</td>
                          <td>{zone.gridW}×{zone.gridH}</td>
                          <td>{zone.rooms.length}</td>
                          <td>{zone.edges.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="admin-hint" style={{ marginTop: "0.75rem" }}>Zone layout is defined in code. Use the Map tab to inspect rooms.</p>
              </section>
            )}

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

            {tab === "users" && (
              <section className="admin-section">
                <div className="admin-section-header">
                  <h2 className="admin-section-title">Users ({users.length})</h2>
                  <button onClick={() => void loadData()} disabled={loading}>Refresh</button>
                </div>
                {users.length === 0 ? <p className="admin-empty">No registered users yet.</p> : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead><tr><th>Email</th><th>Role</th><th>Joined</th><th></th></tr></thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.userId}>
                            <td>{u.email}</td>
                            <td><span className={`status-badge ${u.role === "admin" ? "status-victory" : "status-active"}`}>{u.role}</span></td>
                            <td className="run-time">{new Date(u.createdAt).toLocaleDateString()}</td>
                            <td className="admin-row-actions">
                              {u.role === "admin"
                                ? <button onClick={() => void handleSetRole(u.userId, "player")} disabled={busy}>Demote</button>
                                : <button className="btn-primary" onClick={() => void handleSetRole(u.userId, "admin")} disabled={busy}>Make Admin</button>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

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
          <EncounterEditor initial={modal.encounter} enemies={world.enemies} items={world.items} onSave={saveEncounter} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}
