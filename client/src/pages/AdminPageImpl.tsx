import React, { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { api, type AdminStats, type WorldContent, type UserProfile } from "../lib/api";
import type { Encounter, Enemy, Item, NPC, PropDef, QuestDef, Terminal, Zone, ZoneRoom } from "../../../shared/src/index";
import type { SaveSummary } from "../../../shared/src/index";
import { EnemyEditor } from "../components/admin/EnemyEditor";
import { ItemEditor } from "../components/admin/ItemEditor";
import { EncounterEditor } from "../components/admin/EncounterEditor";
import { QuestEditor } from "../components/admin/QuestEditor";
import { ZoneEditor } from "../components/admin/ZoneEditor";
import { AssetBrowser } from "../components/admin/AssetBrowser";
import { NpcEditor } from "../components/admin/NpcEditor";
import { TerminalEditor } from "../components/admin/TerminalEditor";
import { PropEditor } from "../components/admin/PropEditor";

interface AdminPageProps {
  userEmail: string | null;
  onSignOut: () => Promise<void>;
}

type Tab =
  | "overview"
  | "map"
  | "zones"
  | "assets"
  | "enemies"
  | "items"
  | "npcs"
  | "terminals"
  | "props"
  | "encounters"
  | "quests"
  | "users";

type AdminModal =
  | { kind: "enemy"; enemy: Enemy }
  | { kind: "item"; item: Item }
  | { kind: "npc"; npc: NPC }
  | { kind: "terminal"; terminal: Terminal }
  | { kind: "prop"; prop: PropDef }
  | { kind: "encounter"; encounter: Encounter }
  | { kind: "quest"; quest: QuestDef }
  | null;

interface UsageEntry {
  label: string;
  meta?: string;
  onClick?: () => void;
}

interface UsageModel {
  enemies: Map<string, UsageEntry[]>;
  items: Map<string, UsageEntry[]>;
  npcs: Map<string, UsageEntry[]>;
  terminals: Map<string, UsageEntry[]>;
  props: Map<string, UsageEntry[]>;
  assets: Map<string, UsageEntry[]>;
}

const TABS: Tab[] = ["overview", "map", "zones", "assets", "enemies", "items", "npcs", "terminals", "props", "encounters", "quests", "users"];
const DEFAULT_ENEMY_ASSET = "spr-enemy-rat-scavenger";
const DEFAULT_ICON_ASSET = "icon-prop-placeholder";
const DEFAULT_PORTRAIT_ASSET = "portrait-npc-placeholder";

function newEnemy(): Enemy {
  return { id: "", name: "", maxHp: 10, attack: 2, defense: 0, spritePath: DEFAULT_ENEMY_ASSET, introLine: "" };
}

function newItem(): Item {
  return { id: "", name: "", slot: "consumable", description: "", iconPath: DEFAULT_ICON_ASSET };
}

function newNpc(): NPC {
  return { id: "", name: "", role: "", portraitAssetId: DEFAULT_PORTRAIT_ASSET, dialogue: [] };
}

function newTerminal(): Terminal {
  return { id: "", title: "", logText: "", xpReward: 5 };
}

function newProp(): PropDef {
  return { id: "", name: "", description: "", iconLabel: "OBJ", assetId: DEFAULT_ICON_ASSET, renderHint: "billboard" };
}

function newEncounter(): Encounter {
  return { id: "", enemyId: "", intro: "", victoryText: "", defeatText: "", canFlee: true, rewardItemIds: [], once: true };
}

function newQuest(): QuestDef {
  return { id: "", title: "", description: "", objectives: [], xpReward: 0, creditReward: 0, trigger: { type: "on_start" } };
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }): JSX.Element {
  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
        <div className="admin-modal-header">
          <h3 className="admin-modal-title">{title}</h3>
          <button className="admin-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="admin-modal-body">{children}</div>
      </div>
    </div>
  );
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
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [focusedRoomId, setFocusedRoomId] = useState<string | null>(null);

  useEffect(() => { void loadData(); }, []);

  async function loadData(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      const [statsData, runsData, worldData, usersData] = await Promise.all([
        api.adminStats(),
        api.adminRuns(),
        api.adminWorld(),
        api.adminUsers(),
      ]);
      startTransition(() => {
        setStats(statsData);
        setRuns(runsData);
        setWorld(worldData);
        setUsers(usersData);
      });
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const focusRoom = useCallback((zoneId: string, roomId: string) => {
    setSelectedZoneId(zoneId);
    setFocusedRoomId(roomId);
    setTab("map");
  }, []);

  const usage = useMemo(() => buildUsageModel(world, focusRoom), [world, focusRoom]);
  const activeZone = world?.zones.find((zone) => zone.id === selectedZoneId) ?? world?.zones[0];
  const totalRooms = world?.zones.reduce((sum, zone) => sum + zone.rooms.length, 0) ?? 0;

  async function handleDeleteRun(slotId: string): Promise<void> {
    if (!confirm(`Delete run ${slotId}?`)) return;
    try {
      setBusy(true);
      await api.adminDeleteRun(slotId);
      setRuns((prev) => prev.filter((run) => run.slotId !== slotId));
      if (stats) {
        setStats({ ...stats, totalRuns: stats.totalRuns - 1 });
      }
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

  async function handleSetRole(userId: string, role: string): Promise<void> {
    try {
      setBusy(true);
      await api.adminSetRole(userId, role);
      setUsers((prev) => prev.map((user) => user.userId === userId ? { ...user, role } : user));
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveEnemy(enemy: Enemy): Promise<Enemy> {
    await api.adminUpsertEnemy(enemy.id, enemy);
    setWorld((prev) => prev ? { ...prev, enemies: upsertById(prev.enemies, enemy) } : prev);
    return enemy;
  }

  async function deleteEnemy(id: string): Promise<void> {
    if (!confirm(`Delete enemy "${id}"?`)) return;
    await api.adminDeleteEnemy(id);
    setWorld((prev) => prev ? { ...prev, enemies: prev.enemies.filter((enemy) => enemy.id !== id) } : prev);
    setModal(null);
  }

  async function saveItem(item: Item): Promise<Item> {
    await api.adminUpsertItem(item.id, item);
    setWorld((prev) => prev ? { ...prev, items: upsertById(prev.items, item) } : prev);
    return item;
  }

  async function deleteItem(id: string): Promise<void> {
    if (!confirm(`Delete item "${id}"?`)) return;
    await api.adminDeleteItem(id);
    setWorld((prev) => prev ? { ...prev, items: prev.items.filter((item) => item.id !== id) } : prev);
    setModal(null);
  }

  async function saveNpc(npc: NPC): Promise<NPC> {
    await api.adminUpsertNpc(npc.id, npc);
    setWorld((prev) => prev ? { ...prev, npcs: upsertById(prev.npcs, npc) } : prev);
    return npc;
  }

  async function deleteNpc(id: string): Promise<void> {
    if (!confirm(`Delete NPC "${id}"?`)) return;
    await api.adminDeleteNpc(id);
    setWorld((prev) => prev ? { ...prev, npcs: prev.npcs.filter((npc) => npc.id !== id) } : prev);
    setModal(null);
  }

  async function saveTerminal(terminal: Terminal): Promise<Terminal> {
    await api.adminUpsertTerminal(terminal.id, terminal);
    setWorld((prev) => prev ? { ...prev, terminals: upsertById(prev.terminals, terminal) } : prev);
    return terminal;
  }

  async function deleteTerminal(id: string): Promise<void> {
    if (!confirm(`Delete terminal "${id}"?`)) return;
    await api.adminDeleteTerminal(id);
    setWorld((prev) => prev ? { ...prev, terminals: prev.terminals.filter((terminal) => terminal.id !== id) } : prev);
    setModal(null);
  }

  async function saveProp(prop: PropDef): Promise<PropDef> {
    await api.adminUpsertProp(prop.id, prop);
    setWorld((prev) => prev ? { ...prev, props: upsertById(prev.props, prop) } : prev);
    return prop;
  }

  async function deleteProp(id: string): Promise<void> {
    if (!confirm(`Delete prop "${id}"?`)) return;
    await api.adminDeleteProp(id);
    setWorld((prev) => prev ? { ...prev, props: prev.props.filter((prop) => prop.id !== id) } : prev);
    setModal(null);
  }

  async function saveEncounter(encounter: Encounter): Promise<Encounter> {
    await api.adminUpsertEncounter(encounter.id, encounter);
    setWorld((prev) => prev ? { ...prev, encounters: upsertById(prev.encounters, encounter) } : prev);
    return encounter;
  }

  async function deleteEncounter(id: string): Promise<void> {
    if (!confirm(`Delete encounter "${id}"?`)) return;
    await api.adminDeleteEncounter(id);
    setWorld((prev) => prev ? { ...prev, encounters: prev.encounters.filter((encounter) => encounter.id !== id) } : prev);
    setModal(null);
  }

  async function saveQuest(quest: QuestDef): Promise<QuestDef> {
    await api.adminUpsertQuest(quest.id, quest);
    setWorld((prev) => prev ? { ...prev, quests: upsertById(prev.quests, quest) } : prev);
    return quest;
  }

  async function deleteQuest(id: string): Promise<void> {
    if (!confirm(`Delete quest "${id}"?`)) return;
    await api.adminDeleteQuest(id);
    setWorld((prev) => prev ? { ...prev, quests: prev.quests.filter((quest) => quest.id !== id) } : prev);
    setModal(null);
  }

  async function saveZone(zone: Zone): Promise<void> {
    await api.adminUpsertZone(zone.id, zone);
    setWorld((prev) => prev ? { ...prev, zones: upsertById(prev.zones, zone) } : prev);
  }

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
        {TABS.map((nextTab) => (
          <button key={nextTab} className={`admin-tab-btn${tab === nextTab ? " active" : ""}`} onClick={() => setTab(nextTab)}>
            {nextTab.charAt(0).toUpperCase() + nextTab.slice(1)}
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
                      <div className="admin-stat-card"><p className="stat-value">{world.npcs.length}</p><p className="stat-label">NPCs</p></div>
                      <div className="admin-stat-card"><p className="stat-value">{world.terminals.length}</p><p className="stat-label">Terminals</p></div>
                      <div className="admin-stat-card"><p className="stat-value">{world.props.length}</p><p className="stat-label">Props</p></div>
                      <div className="admin-stat-card"><p className="stat-value">{world.assets.length}</p><p className="stat-label">Assets</p></div>
                      <div className="admin-stat-card"><p className="stat-value">{world.encounters.length}</p><p className="stat-label">Encounters</p></div>
                      <div className="admin-stat-card"><p className="stat-value">{world.quests.length}</p><p className="stat-label">Quests</p></div>
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

            {tab === "map" && (activeZone && world ? (
              <section className="admin-section">
                <div className="admin-section-header">
                  <h2 className="admin-section-title">Zone Editor: {activeZone.title}</h2>
                  <select className="admin-zone-picker" value={activeZone.id} onChange={(event) => setSelectedZoneId(event.target.value)}>
                    {world.zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>{zone.title}</option>
                    ))}
                  </select>
                </div>
                <ZoneEditor
                  key={activeZone.id}
                  zone={activeZone}
                  assets={world.assets}
                  textureSets={world.textureSets}
                  enemies={world.enemies}
                  items={world.items}
                  npcs={world.npcs}
                  terminals={world.terminals}
                  props={world.props}
                  encounters={world.encounters}
                  focusRoomId={focusedRoomId}
                  onFocusRoomHandled={() => setFocusedRoomId(null)}
                  onSave={saveZone}
                  onSaveEnemy={saveEnemy}
                  onSaveItem={saveItem}
                  onSaveNpc={saveNpc}
                  onSaveTerminal={saveTerminal}
                  onSaveProp={saveProp}
                  onSaveEncounter={saveEncounter}
                />
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
                        <tr key={zone.id} onClick={() => { setSelectedZoneId(zone.id); setTab("map"); }} style={{ cursor: "pointer" }}>
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
                <p className="admin-hint" style={{ marginTop: "0.75rem" }}>Map editing now handles room content placement as well as geometry.</p>
              </section>
            )}

            {tab === "assets" && world && (
              <section className="admin-section">
                <div className="admin-section-header">
                  <h2 className="admin-section-title">Asset Registry ({world.assets.length})</h2>
                  <p className="admin-hint">Read-only registry view with current inbound usage.</p>
                </div>
                <AssetBrowser assets={world.assets} usageByAssetId={usage.assets} />
              </section>
            )}

            {tab === "enemies" && world && (
              <EntityTableSection
                title={`Enemies (${world.enemies.length})`}
                addLabel="+ New Enemy"
                onAdd={() => setModal({ kind: "enemy", enemy: newEnemy() })}
                headers={["ID", "Name", "HP", "ATK", "DEF", "Used In", ""]}
                rows={[...world.enemies].sort((left, right) => left.id.localeCompare(right.id)).map((enemy) => (
                  <tr key={enemy.id}>
                    <td className="run-slot">{enemy.id}</td>
                    <td>{enemy.name}</td>
                    <td>{enemy.maxHp}</td>
                    <td>{enemy.attack}</td>
                    <td>{enemy.defense}</td>
                    <td>{usage.enemies.get(enemy.id)?.length ?? 0}</td>
                    <td className="admin-row-actions">
                      <button onClick={() => setModal({ kind: "enemy", enemy })}>Edit</button>
                      <button className="btn-danger" onClick={() => void deleteEnemy(enemy.id)} disabled={busy}>Del</button>
                    </td>
                  </tr>
                ))}
              />
            )}

            {tab === "items" && world && (
              <EntityTableSection
                title={`Items (${world.items.length})`}
                addLabel="+ New Item"
                onAdd={() => setModal({ kind: "item", item: newItem() })}
                headers={["ID", "Name", "Slot", "ATK+", "DEF+", "Heal", "Used By", ""]}
                rows={[...world.items].sort((left, right) => left.id.localeCompare(right.id)).map((item) => (
                  <tr key={item.id}>
                    <td className="run-slot">{item.id}</td>
                    <td>{item.name}</td>
                    <td>{item.slot}</td>
                    <td>{item.attackBonus ?? "—"}</td>
                    <td>{item.defenseBonus ?? "—"}</td>
                    <td>{item.healAmount ?? "—"}</td>
                    <td>{usage.items.get(item.id)?.length ?? 0}</td>
                    <td className="admin-row-actions">
                      <button onClick={() => setModal({ kind: "item", item })}>Edit</button>
                      <button className="btn-danger" onClick={() => void deleteItem(item.id)} disabled={busy}>Del</button>
                    </td>
                  </tr>
                ))}
              />
            )}

            {tab === "npcs" && world && (
              <EntityTableSection
                title={`NPCs (${world.npcs.length})`}
                addLabel="+ New NPC"
                onAdd={() => setModal({ kind: "npc", npc: newNpc() })}
                headers={["ID", "Name", "Role", "Linked Rooms", ""]}
                rows={[...world.npcs].sort((left, right) => left.id.localeCompare(right.id)).map((npc) => (
                  <tr key={npc.id}>
                    <td className="run-slot">{npc.id}</td>
                    <td>{npc.name}</td>
                    <td>{npc.role}</td>
                    <td>{usage.npcs.get(npc.id)?.length ?? 0}</td>
                    <td className="admin-row-actions">
                      <button onClick={() => setModal({ kind: "npc", npc })}>Edit</button>
                      <button className="btn-danger" onClick={() => void deleteNpc(npc.id)} disabled={busy}>Del</button>
                    </td>
                  </tr>
                ))}
              />
            )}

            {tab === "terminals" && world && (
              <EntityTableSection
                title={`Terminals (${world.terminals.length})`}
                addLabel="+ New Terminal"
                onAdd={() => setModal({ kind: "terminal", terminal: newTerminal() })}
                headers={["ID", "Title", "XP", "Linked Rooms", ""]}
                rows={[...world.terminals].sort((left, right) => left.id.localeCompare(right.id)).map((terminal) => (
                  <tr key={terminal.id}>
                    <td className="run-slot">{terminal.id}</td>
                    <td>{terminal.title}</td>
                    <td>{terminal.xpReward ?? "—"}</td>
                    <td>{usage.terminals.get(terminal.id)?.length ?? 0}</td>
                    <td className="admin-row-actions">
                      <button onClick={() => setModal({ kind: "terminal", terminal })}>Edit</button>
                      <button className="btn-danger" onClick={() => void deleteTerminal(terminal.id)} disabled={busy}>Del</button>
                    </td>
                  </tr>
                ))}
              />
            )}

            {tab === "props" && world && (
              <EntityTableSection
                title={`Props (${world.props.length})`}
                addLabel="+ New Prop"
                onAdd={() => setModal({ kind: "prop", prop: newProp() })}
                headers={["ID", "Name", "Render", "Linked Rooms", ""]}
                rows={[...world.props].sort((left, right) => left.id.localeCompare(right.id)).map((prop) => (
                  <tr key={prop.id}>
                    <td className="run-slot">{prop.id}</td>
                    <td>{prop.name}</td>
                    <td>{prop.renderHint ?? "billboard"}</td>
                    <td>{usage.props.get(prop.id)?.length ?? 0}</td>
                    <td className="admin-row-actions">
                      <button onClick={() => setModal({ kind: "prop", prop })}>Edit</button>
                      <button className="btn-danger" onClick={() => void deleteProp(prop.id)} disabled={busy}>Del</button>
                    </td>
                  </tr>
                ))}
              />
            )}

            {tab === "encounters" && world && (
              <EntityTableSection
                title={`Encounters (${world.encounters.length})`}
                addLabel="+ New Encounter"
                onAdd={() => setModal({ kind: "encounter", encounter: newEncounter() })}
                headers={["ID", "Enemy", "Can Flee", "Rewards", ""]}
                rows={[...world.encounters].sort((left, right) => left.id.localeCompare(right.id)).map((encounter) => (
                  <tr key={encounter.id}>
                    <td className="run-slot">{encounter.id}</td>
                    <td>{encounter.enemyId}</td>
                    <td>{encounter.canFlee ? "Yes" : "No"}</td>
                    <td>{encounter.rewardItemIds.join(", ") || "—"}</td>
                    <td className="admin-row-actions">
                      <button onClick={() => setModal({ kind: "encounter", encounter })}>Edit</button>
                      <button className="btn-danger" onClick={() => void deleteEncounter(encounter.id)} disabled={busy}>Del</button>
                    </td>
                  </tr>
                ))}
              />
            )}

            {tab === "quests" && world && (
              <EntityTableSection
                title={`Quests (${world.quests.length})`}
                addLabel="+ New Quest"
                onAdd={() => setModal({ kind: "quest", quest: newQuest() })}
                headers={["ID", "Title", "Trigger", "Objectives", "XP", "Credits", ""]}
                rows={[...world.quests].sort((left, right) => left.id.localeCompare(right.id)).map((quest) => (
                  <tr key={quest.id}>
                    <td className="run-slot">{quest.id}</td>
                    <td>{quest.title}</td>
                    <td>{quest.trigger.type}{quest.trigger.targetId ? ` → ${quest.trigger.targetId}` : ""}</td>
                    <td>{quest.objectives.length}</td>
                    <td>{quest.xpReward}</td>
                    <td>{quest.creditReward}</td>
                    <td className="admin-row-actions">
                      <button onClick={() => setModal({ kind: "quest", quest })}>Edit</button>
                      <button className="btn-danger" onClick={() => void deleteQuest(quest.id)} disabled={busy}>Del</button>
                    </td>
                  </tr>
                ))}
              />
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
                        {users.map((user) => (
                          <tr key={user.userId}>
                            <td>{user.email}</td>
                            <td><span className={`status-badge ${user.role === "admin" ? "status-victory" : "status-active"}`}>{user.role}</span></td>
                            <td className="run-time">{new Date(user.createdAt).toLocaleDateString()}</td>
                            <td className="admin-row-actions">
                              {user.role === "admin"
                                ? <button onClick={() => void handleSetRole(user.userId, "player")} disabled={busy}>Demote</button>
                                : <button className="btn-primary" onClick={() => void handleSetRole(user.userId, "admin")} disabled={busy}>Make Admin</button>}
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

      {modal?.kind === "enemy" && world && <Modal title={modal.enemy.id ? `Edit Enemy: ${modal.enemy.id}` : "New Enemy"} onClose={() => setModal(null)}><EnemyEditor initial={modal.enemy} assets={world.assets} usage={usage.enemies.get(modal.enemy.id) ?? []} onSave={saveEnemy} onClose={() => setModal(null)} /></Modal>}
      {modal?.kind === "item" && world && <Modal title={modal.item.id ? `Edit Item: ${modal.item.id}` : "New Item"} onClose={() => setModal(null)}><ItemEditor initial={modal.item} assets={world.assets} usage={usage.items.get(modal.item.id) ?? []} onSave={saveItem} onClose={() => setModal(null)} /></Modal>}
      {modal?.kind === "npc" && world && <Modal title={modal.npc.id ? `Edit NPC: ${modal.npc.id}` : "New NPC"} onClose={() => setModal(null)}><NpcEditor initial={modal.npc} assets={world.assets} usage={usage.npcs.get(modal.npc.id) ?? []} onSave={saveNpc} onClose={() => setModal(null)} /></Modal>}
      {modal?.kind === "terminal" && <Modal title={modal.terminal.id ? `Edit Terminal: ${modal.terminal.id}` : "New Terminal"} onClose={() => setModal(null)}><TerminalEditor initial={modal.terminal} usage={usage.terminals.get(modal.terminal.id) ?? []} onSave={saveTerminal} onClose={() => setModal(null)} /></Modal>}
      {modal?.kind === "prop" && world && <Modal title={modal.prop.id ? `Edit Prop: ${modal.prop.id}` : "New Prop"} onClose={() => setModal(null)}><PropEditor initial={modal.prop} assets={world.assets} usage={usage.props.get(modal.prop.id) ?? []} onSave={saveProp} onClose={() => setModal(null)} /></Modal>}
      {modal?.kind === "encounter" && world && <Modal title={modal.encounter.id ? `Edit Encounter: ${modal.encounter.id}` : "New Encounter"} onClose={() => setModal(null)}><EncounterEditor initial={modal.encounter} enemies={world.enemies} items={world.items} onSave={saveEncounter} onClose={() => setModal(null)} /></Modal>}
      {modal?.kind === "quest" && <Modal title={modal.quest.id ? `Edit Quest: ${modal.quest.id}` : "New Quest"} onClose={() => setModal(null)}><QuestEditor initial={modal.quest} onSave={saveQuest} onClose={() => setModal(null)} /></Modal>}
    </div>
  );
}

function EntityTableSection({ title, addLabel, onAdd, headers, rows }: { title: string; addLabel: string; onAdd: () => void; headers: string[]; rows: React.ReactNode[] }): JSX.Element {
  return (
    <section className="admin-section">
      <div className="admin-section-header">
        <h2 className="admin-section-title">{title}</h2>
        <button className="btn-primary" onClick={onAdd}>{addLabel}</button>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </section>
  );
}

function upsertById<T extends { id: string }>(items: T[], nextItem: T): T[] {
  const filtered = items.filter((item) => item.id !== nextItem.id);
  return [...filtered, nextItem];
}

function buildUsageModel(world: WorldContent | null, focusRoom: (zoneId: string, roomId: string) => void): UsageModel {
  const usage: UsageModel = { enemies: new Map(), items: new Map(), npcs: new Map(), terminals: new Map(), props: new Map(), assets: new Map() };
  if (!world) return usage;
  const encounterRooms = new Map<string, Array<{ zone: Zone; room: ZoneRoom }>>();

  for (const zone of world.zones) {
    for (const room of zone.rooms) {
      if (room.npcId) pushUsage(usage.npcs, room.npcId, roomEntry(zone, room, focusRoom));
      if (room.terminalId) pushUsage(usage.terminals, room.terminalId, roomEntry(zone, room, focusRoom));
      if (room.prop) pushUsage(usage.props, room.prop, roomEntry(zone, room, focusRoom));
      for (const itemId of room.loot ?? []) pushUsage(usage.items, itemId, roomEntry(zone, room, focusRoom, "Loot"));
      if (room.encounterId) {
        const rooms = encounterRooms.get(room.encounterId) ?? [];
        rooms.push({ zone, room });
        encounterRooms.set(room.encounterId, rooms);
      }
    }
  }

  for (const encounter of world.encounters) {
    const roomEntries = (encounterRooms.get(encounter.id) ?? []).map(({ zone, room }) => roomEntry(zone, room, focusRoom, `Encounter ${encounter.id}`));
    for (const entry of roomEntries) pushUsage(usage.enemies, encounter.enemyId, entry);
    for (const itemId of encounter.rewardItemIds) {
      if (roomEntries.length === 0) pushUsage(usage.items, itemId, { label: `Encounter ${encounter.id}`, meta: "Reward item" });
      for (const entry of roomEntries) pushUsage(usage.items, itemId, { ...entry, meta: `Reward via ${encounter.id}` });
    }
  }

  for (const enemy of world.enemies) {
    const assetRef = world.assets.find((asset) => asset.id === enemy.spritePath || asset.path === enemy.spritePath)?.id;
    if (assetRef) pushUsage(usage.assets, assetRef, { label: `Enemy: ${enemy.name}`, meta: enemy.id });
    if (enemy.modelAssetId) {
      const modelRef = world.assets.find((asset) => asset.id === enemy.modelAssetId || asset.path === enemy.modelAssetId)?.id;
      if (modelRef) pushUsage(usage.assets, modelRef, { label: `Enemy Model: ${enemy.name}`, meta: enemy.id });
    }
  }
  for (const item of world.items) {
    const assetRef = world.assets.find((asset) => asset.id === item.iconPath || asset.path === item.iconPath)?.id;
    if (assetRef) pushUsage(usage.assets, assetRef, { label: `Item: ${item.name}`, meta: item.id });
    if (item.modelAssetId) {
      const modelRef = world.assets.find((asset) => asset.id === item.modelAssetId || asset.path === item.modelAssetId)?.id;
      if (modelRef) pushUsage(usage.assets, modelRef, { label: `Item Model: ${item.name}`, meta: item.id });
    }
  }
  for (const npc of world.npcs) {
    const assetRef = world.assets.find((asset) => asset.id === npc.portraitAssetId || asset.path === npc.portraitAssetId)?.id;
    if (assetRef) pushUsage(usage.assets, assetRef, { label: `NPC: ${npc.name}`, meta: npc.id });
  }
  for (const prop of world.props) {
    if (prop.assetId) {
      const assetRef = world.assets.find((asset) => asset.id === prop.assetId || asset.path === prop.assetId)?.id;
      if (assetRef) pushUsage(usage.assets, assetRef, { label: `Prop: ${prop.name}`, meta: prop.id });
    }
    if (prop.modelAssetId) {
      const modelRef = world.assets.find((asset) => asset.id === prop.modelAssetId || asset.path === prop.modelAssetId)?.id;
      if (modelRef) pushUsage(usage.assets, modelRef, { label: `Prop Model: ${prop.name}`, meta: prop.id });
    }
  }
  for (const textureSet of world.textureSets) {
    pushUsage(usage.assets, textureSet.wallAssetId, { label: `Texture Set: ${textureSet.id}`, meta: "Wall surface" });
    pushUsage(usage.assets, textureSet.floorAssetId, { label: `Texture Set: ${textureSet.id}`, meta: "Floor surface" });
  }
  return usage;
}

function roomEntry(zone: Zone, room: ZoneRoom, focusRoom: (zoneId: string, roomId: string) => void, meta?: string): UsageEntry {
  return { label: `${zone.title} / ${room.title}`, meta: meta ?? room.id, onClick: () => focusRoom(zone.id, room.id) };
}

function pushUsage(map: Map<string, UsageEntry[]>, id: string, entry: UsageEntry): void {
  const current = map.get(id) ?? [];
  map.set(id, [...current, entry]);
}
