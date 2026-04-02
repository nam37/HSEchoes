import React, { useState } from "react";
import type { Quest, TabletMessage, Zone, RunState } from "../../../shared/src/index";
import { findRoomContaining, resolveEdgeType } from "../../../shared/src/index";

type Tab = "messages" | "assignments" | "map";

interface Props {
  run: RunState;
  zone: Zone;
  onClose: () => void;
  onMarkRead: () => void;
  initialTab?: Tab;
}

export function TabletOverlay({ run, zone, onClose, onMarkRead, initialTab = "messages" }: Props): JSX.Element {
  const [tab, setTab] = useState<Tab>(initialTab);

  function handleTabChange(next: Tab) {
    setTab(next);
    if (next === "messages") {
      onMarkRead();
    }
  }

  const unreadCount = run.messages.filter(m => !m.read).length;

  return (
    <div className="tablet-overlay" role="dialog" aria-modal="true" aria-label="Tablet">
      <div className="tablet-shell">
        <header className="tablet-header">
          <div className="tablet-header-left">
            <span className="tablet-eyebrow">Personnel Tablet</span>
            <h2 className="tablet-title">UNIT 7 — STATION WEST</h2>
          </div>
          <button className="tablet-close" onClick={onClose} aria-label="Close tablet">✕</button>
        </header>

        <nav className="tablet-tabs">
          <button
            className={`tablet-tab${tab === "messages" ? " active" : ""}`}
            onClick={() => handleTabChange("messages")}
          >
            Messages
            {unreadCount > 0 && <span className="tablet-badge">{unreadCount}</span>}
          </button>
          <button
            className={`tablet-tab${tab === "assignments" ? " active" : ""}`}
            onClick={() => handleTabChange("assignments")}
          >
            Assignments
            {run.activeQuests.length > 0 && <span className="tablet-badge">{run.activeQuests.length}</span>}
          </button>
          <button
            className={`tablet-tab${tab === "map" ? " active" : ""}`}
            onClick={() => handleTabChange("map")}
          >
            Map
          </button>
        </nav>

        <div className="tablet-body">
          {tab === "messages" && <MessagesTab messages={run.messages} />}
          {tab === "assignments" && (
            <AssignmentsTab
              activeQuests={run.activeQuests}
              completedQuests={run.completedQuests ?? []}
            />
          )}
          {tab === "map" && <MapTab zone={zone} run={run} />}
        </div>
      </div>
    </div>
  );
}

// ── Messages tab ──────────────────────────────────────────────────────────────

function MessagesTab({ messages }: { messages: TabletMessage[] }): JSX.Element {
  const [selected, setSelected] = useState<string | null>(
    messages.length > 0 ? messages[messages.length - 1].id : null
  );
  const sorted = [...messages].reverse();
  const active = sorted.find(m => m.id === selected) ?? null;

  if (messages.length === 0) {
    return (
      <div className="tablet-empty">
        <p>No messages received.</p>
      </div>
    );
  }

  return (
    <div className="tablet-messages-layout">
      <aside className="tablet-message-list">
        {sorted.map(msg => (
          <button
            key={msg.id}
            className={`tablet-message-row${selected === msg.id ? " active" : ""}${!msg.read ? " unread" : ""}`}
            onClick={() => setSelected(msg.id)}
          >
            <span className="msg-sender">{msg.sender}</span>
            <span className="msg-subject">{msg.subject}</span>
            <span className="msg-timestamp">{msg.timestamp}</span>
          </button>
        ))}
      </aside>
      <main className="tablet-message-detail">
        {active ? (
          <>
            <div className="msg-detail-header">
              <p className="msg-detail-from"><strong>From:</strong> {active.sender}</p>
              <p className="msg-detail-subject"><strong>Subject:</strong> {active.subject}</p>
              <p className="msg-detail-time">{active.timestamp}</p>
            </div>
            <div className="msg-detail-body">
              {active.body.split("\n").map((line, i) => (
                <p key={i}>{line || <>&nbsp;</>}</p>
              ))}
            </div>
          </>
        ) : (
          <p className="tablet-empty-detail">Select a message.</p>
        )}
      </main>
    </div>
  );
}

// ── Assignments tab ───────────────────────────────────────────────────────────

function AssignmentsTab({ activeQuests, completedQuests }: { activeQuests: Quest[]; completedQuests: Quest[] }): JSX.Element {
  return (
    <div className="tablet-assignments">
      {activeQuests.length === 0 && completedQuests.length === 0 && (
        <p className="tablet-empty-detail">No assignments on file.</p>
      )}
      {activeQuests.length > 0 && (
        <section className="tablet-assignment-section">
          <h3 className="tablet-section-label">Active</h3>
          {activeQuests.map(quest => (
            <div key={quest.id} className="tablet-quest-card">
              <p className="tablet-quest-title">{quest.title}</p>
              <p className="tablet-quest-desc">{quest.description}</p>
              <ul className="tablet-quest-objectives">
                {quest.objectives.map(obj => (
                  <li key={obj.id} className={obj.completed ? "obj-done" : "obj-pending"}>
                    {obj.description}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
      {completedQuests.length > 0 && (
        <section className="tablet-assignment-section">
          <h3 className="tablet-section-label">Completed</h3>
          {completedQuests.map(quest => (
            <div key={quest.id} className="tablet-quest-card completed">
              <p className="tablet-quest-title">{quest.title}</p>
              <ul className="tablet-quest-objectives">
                {quest.objectives.map(obj => (
                  <li key={obj.id} className="obj-done">{obj.description}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

// ── Map tab ───────────────────────────────────────────────────────────────────

type CellFace = "wall" | "open" | "door" | "gate";

function faceBorder(face: CellFace): string {
  switch (face) {
    case "wall": return "1px solid rgba(0, 200, 240, 0.7)";
    case "door": return "1px solid rgba(255, 170, 0, 0.7)";
    case "gate": return "1px solid rgba(0, 100, 255, 0.7)";
    case "open": return "none";
  }
}

const FACING_CHAR: Record<string, string> = { north: "▲", east: "▶", south: "▼", west: "◀" };
const CELL = 48; // px per cell in the full map — matches admin zone editor scale

function MapTab({ zone, run }: { zone: Zone; run: RunState }): JSX.Element {
  const cells: JSX.Element[] = [];

  for (let y = 0; y < zone.gridH; y++) {
    for (let x = 0; x < zone.gridW; x++) {
      const room = findRoomContaining(zone, x, y);
      const discovered = room ? run.discoveredRoomIds.includes(room.id) : false;
      const current = x === run.posX && y === run.posY;

      const style: React.CSSProperties = discovered ? {
        borderTop:    faceBorder(resolveEdgeType(zone, x, y, "north")),
        borderRight:  faceBorder(resolveEdgeType(zone, x, y, "east")),
        borderBottom: faceBorder(resolveEdgeType(zone, x, y, "south")),
        borderLeft:   faceBorder(resolveEdgeType(zone, x, y, "west")),
        left: x * (CELL + 1),
        top:  y * (CELL + 1),
      } : { left: x * (CELL + 1), top: y * (CELL + 1) };

      // Only show label on the top-left cell of each room to avoid repetition
      const isRoomOrigin = room && room.x === x && room.y === y;
      cells.push(
        <div
          key={`${x}-${y}`}
          className={current ? "full-map-cell current" : discovered ? "full-map-cell discovered" : "full-map-cell hidden"}
          style={style}
        >
          {current && <span className="full-map-facing">{FACING_CHAR[run.facing]}</span>}
          {discovered && isRoomOrigin && !current && (
            <span className="full-map-label">{room!.title}</span>
          )}
        </div>
      );
    }
  }

  const currentRoom = findRoomContaining(zone, run.posX, run.posY);
  const discovered = run.discoveredRoomIds.length;
  const total = zone.rooms.length;

  return (
    <div className="tablet-map-tab">
      <div className="tablet-map-header">
        <span className="tablet-map-zone">{zone.title}</span>
        <span className="tablet-map-progress">{discovered}/{total} rooms surveyed</span>
      </div>
      <div
        className="full-map-grid"
        style={{
          width:  zone.gridW * (CELL + 1),
          height: zone.gridH * (CELL + 1),
        }}
      >
        {cells}
      </div>
      {currentRoom && (
        <p className="tablet-map-room">Current: {currentRoom.title}</p>
      )}
    </div>
  );
}
