import { useCallback, useEffect, useRef, useState } from "react";
import type { EdgeType, Zone, ZoneEdge, ZoneRoom } from "../../../../shared/src/index";
import { findRoomContaining } from "../../../../shared/src/index";
import { RoomSidebar } from "./RoomSidebar";

// ── Constants ─────────────────────────────────────────────────────────────────

const CELL = 72;       // px per grid square
const SNAP = 16;       // px from a boundary to snap to it

const ROOM_PALETTE = [
  "#0d2035", "#1a0d35", "#0d3520", "#350d1a",
  "#35200d", "#0d3535", "#20350d", "#350d35",
  "#1a2010", "#102030", "#301020", "#203010",
];

const WALL_COLOR  = "#4a8099";
const DOOR_COLOR  = "#cc8800";
const GATE_COLOR  = "#3366ff";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tool = "select" | "room" | "passage" | "erase";

interface Drag { startCx: number; startCy: number; endCx: number; endCy: number; }
interface EdgeCoord { x: number; y: number; dir: "h" | "v"; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function deepClone<T>(v: T): T { return JSON.parse(JSON.stringify(v)) as T; }

function toolLabel(t: Tool): string {
  switch (t) {
    case "select":  return "Select";
    case "room":    return "Draw Room";
    case "passage": return "Passage";
    case "erase":   return "Erase";
  }
}

function toolHint(t: Tool): string {
  switch (t) {
    case "select":  return "Click a room to edit its properties in the sidebar.";
    case "room":    return "Drag to draw a new room rectangle. Click to create a 1×1 room.";
    case "passage": return "Click an edge between rooms to cycle: open → door → gate → (remove).";
    case "erase":   return "Click a room to remove it.";
  }
}

function edgeCoords(edge: EdgeCoord): [number, number, number, number] {
  if (edge.dir === "v") {
    const x = (edge.x + 1) * CELL;
    return [x, edge.y * CELL, x, (edge.y + 1) * CELL];
  } else {
    const y = (edge.y + 1) * CELL;
    return [edge.x * CELL, y, (edge.x + 1) * CELL, y];
  }
}

function snapEdge(px: number, py: number, gridW: number, gridH: number): EdgeCoord | null {
  const cx = Math.floor(px / CELL);
  const cy = Math.floor(py / CELL);
  const ox = px % CELL;
  const oy = py % CELL;
  if (ox < SNAP && cx > 0) return { x: cx - 1, y: cy, dir: "v" };
  if (ox > CELL - SNAP && cx < gridW - 1) return { x: cx, y: cy, dir: "v" };
  if (oy < SNAP && cy > 0) return { x: cx, y: cy - 1, dir: "h" };
  if (oy > CELL - SNAP && cy < gridH - 1) return { x: cx, y: cy, dir: "h" };
  return null;
}

function cycleEdge(zone: Zone, edge: EdgeCoord): Zone {
  const CYCLE: Array<EdgeType | null> = [null, "open", "door", "gate"];
  const existing = zone.edges.find((e) => e.x === edge.x && e.y === edge.y && e.dir === edge.dir);
  const idx = CYCLE.indexOf(existing?.type ?? null);
  const next = CYCLE[(idx + 1) % CYCLE.length];
  const filtered = zone.edges.filter((e) => !(e.x === edge.x && e.y === edge.y && e.dir === edge.dir));
  if (next === null) return { ...zone, edges: filtered };
  return { ...zone, edges: [...filtered, { x: edge.x, y: edge.y, dir: edge.dir, type: next } as ZoneEdge] };
}

// ── Canvas draw ───────────────────────────────────────────────────────────────

/**
 * Resolve what to draw on the edge between (cx,cy) and its neighbor.
 * - Explicit "open" edge  → gap (draw nothing)
 * - Explicit "door"/"gate" → colored marker
 * - No explicit edge, same room → gap (interior)
 * - No explicit edge, different rooms or void → wall
 */
function resolveDrawEdge(zone: Zone, cx: number, cy: number, dir: "h" | "v"): "wall" | "open" | "door" | "gate" {
  let ex: number, ey: number, nx: number, ny: number;
  if (dir === "v") { ex = cx; ey = cy; nx = cx + 1; ny = cy; }
  else              { ex = cx; ey = cy; nx = cx;     ny = cy + 1; }
  const explicit = zone.edges.find((e) => e.x === ex && e.y === ey && e.dir === dir);
  if (explicit) return explicit.type;
  const r1 = zone.rooms.find((r) => cx >= r.x && cx < r.x + r.w && cy >= r.y && cy < r.y + r.h);
  const r2 = zone.rooms.find((r) => nx >= r.x && nx < r.x + r.w && ny >= r.y && ny < r.y + r.h);
  if (r1 && r2 && r1.id === r2.id) return "open"; // interior
  return "wall";
}

function drawCanvas(
  ctx: CanvasRenderingContext2D,
  zone: Zone,
  selectedId: string | null,
  drag: Drag | null,
  hoverEdge: EdgeCoord | null,
  tool: Tool
): void {
  const W = zone.gridW * CELL;
  const H = zone.gridH * CELL;

  // Background
  ctx.fillStyle = "#08111a";
  ctx.fillRect(0, 0, W, H);

  // Room fills
  zone.rooms.forEach((room, i) => {
    ctx.fillStyle = ROOM_PALETTE[i % ROOM_PALETTE.length];
    ctx.globalAlpha = 0.8;
    ctx.fillRect(room.x * CELL, room.y * CELL, room.w * CELL, room.h * CELL);
    ctx.globalAlpha = 1;
  });

  // Faint grid lines (interior reference only)
  ctx.strokeStyle = "#1a2535";
  ctx.lineWidth = 0.5;
  ctx.setLineDash([]);
  for (let x = 0; x <= zone.gridW; x++) {
    ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke();
  }
  for (let y = 0; y <= zone.gridH; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); ctx.stroke();
  }

  // Draw all edges: walls as solid, doors/gates as colored, open = nothing
  for (let cy = 0; cy < zone.gridH; cy++) {
    for (let cx = 0; cx < zone.gridW; cx++) {
      // Vertical edge to the right (between cx and cx+1)
      if (cx < zone.gridW - 1) {
        const type = resolveDrawEdge(zone, cx, cy, "v");
        if (type !== "open") {
          const x = (cx + 1) * CELL;
          ctx.beginPath(); ctx.moveTo(x, cy * CELL); ctx.lineTo(x, (cy + 1) * CELL);
          if (type === "wall") {
            ctx.strokeStyle = WALL_COLOR; ctx.lineWidth = 2; ctx.setLineDash([]);
          } else if (type === "door") {
            ctx.strokeStyle = DOOR_COLOR; ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
          } else {
            ctx.strokeStyle = GATE_COLOR; ctx.lineWidth = 3; ctx.setLineDash([3, 3]);
          }
          ctx.stroke(); ctx.setLineDash([]);
        }
      }
      // Horizontal edge below (between cy and cy+1)
      if (cy < zone.gridH - 1) {
        const type = resolveDrawEdge(zone, cx, cy, "h");
        if (type !== "open") {
          const y = (cy + 1) * CELL;
          ctx.beginPath(); ctx.moveTo(cx * CELL, y); ctx.lineTo((cx + 1) * CELL, y);
          if (type === "wall") {
            ctx.strokeStyle = WALL_COLOR; ctx.lineWidth = 2; ctx.setLineDash([]);
          } else if (type === "door") {
            ctx.strokeStyle = DOOR_COLOR; ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
          } else {
            ctx.strokeStyle = GATE_COLOR; ctx.lineWidth = 3; ctx.setLineDash([3, 3]);
          }
          ctx.stroke(); ctx.setLineDash([]);
        }
      }
    }
  }

  // Room labels and selection highlight
  zone.rooms.forEach((room) => {
    if (selectedId === room.id) {
      ctx.strokeStyle = "#60b0ff";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(room.x * CELL + 1, room.y * CELL + 1, room.w * CELL - 2, room.h * CELL - 2);
    }
    ctx.fillStyle = "#8ab4d0";
    ctx.font = "bold 10px monospace";
    ctx.fillText(room.id, room.x * CELL + 5, room.y * CELL + 14);
    if (room.title && room.title !== room.id) {
      ctx.fillStyle = "#5a8090";
      ctx.font = "9px monospace";
      ctx.fillText(room.title, room.x * CELL + 5, room.y * CELL + 26);
    }
    if (room.encounterId) {
      ctx.fillStyle = "#cc4444"; ctx.font = "bold 10px monospace";
      ctx.fillText("!", room.x * CELL + room.w * CELL - 12, room.y * CELL + 14);
    }
    if (room.victory) {
      ctx.fillStyle = "#ccaa00"; ctx.font = "bold 10px monospace";
      ctx.fillText("★", room.x * CELL + room.w * CELL - 22, room.y * CELL + 14);
    }
  });

  // Drag preview (Draw Room tool)
  if (drag && tool === "room") {
    const rx = Math.min(drag.startCx, drag.endCx) * CELL;
    const ry = Math.min(drag.startCy, drag.endCy) * CELL;
    const rw = (Math.abs(drag.endCx - drag.startCx) + 1) * CELL;
    const rh = (Math.abs(drag.endCy - drag.startCy) + 1) * CELL;
    ctx.fillStyle = "rgba(32, 96, 160, 0.3)";
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = "#4090d0"; ctx.lineWidth = 2; ctx.setLineDash([]);
    ctx.strokeRect(rx, ry, rw, rh);
  }

  // Hovered edge (Passage tool)
  if (hoverEdge && tool === "passage") {
    const [x1, y1, x2, y2] = edgeCoords(hoverEdge);
    const existing = zone.edges.find((e) => e.x === hoverEdge.x && e.y === hoverEdge.y && e.dir === hoverEdge.dir);
    ctx.strokeStyle = existing ? "#ff6060" : "#40d090";
    ctx.lineWidth = 4; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.setLineDash([]);
  }
}

// ── ZoneEditor component ──────────────────────────────────────────────────────

interface Props {
  zone: Zone;
  onSave: (zone: Zone) => Promise<void>;
}

export function ZoneEditor({ zone: initialZone, onSave }: Props): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draft, setDraft] = useState<Zone>(() => deepClone(initialZone));
  const [tool, setTool] = useState<Tool>("select");
  const [selectedRoom, setSelectedRoom] = useState<ZoneRoom | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hoverEdge, setHoverEdge] = useState<EdgeCoord | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Redraw whenever relevant state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawCanvas(ctx, draft, selectedRoom?.id ?? null, drag, hoverEdge, tool);
  }, [draft, selectedRoom, drag, hoverEdge, tool]);

  function canvasPx(e: React.MouseEvent<HTMLCanvasElement>): { px: number; py: number } {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { px: e.clientX - rect.left, py: e.clientY - rect.top };
  }

  function toCell(px: number, py: number): { cx: number; cy: number } {
    return {
      cx: Math.max(0, Math.min(draft.gridW - 1, Math.floor(px / CELL))),
      cy: Math.max(0, Math.min(draft.gridH - 1, Math.floor(py / CELL))),
    };
  }

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { px, py } = canvasPx(e);
    const { cx, cy } = toCell(px, py);
    if (tool === "passage") {
      setHoverEdge(snapEdge(px, py, draft.gridW, draft.gridH));
    }
    if (drag) {
      setDrag((prev) => prev ? { ...prev, endCx: cx, endCy: cy } : null);
    }
  }, [tool, drag, draft.gridW, draft.gridH]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const { px, py } = canvasPx(e);
    const { cx, cy } = toCell(px, py);
    if (tool === "room") {
      setDrag({ startCx: cx, startCy: cy, endCx: cx, endCy: cy });
    }
  }, [tool]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const { px, py } = canvasPx(e);
    const { cx, cy } = toCell(px, py);

    if (tool === "room" && drag) {
      const rx = Math.min(drag.startCx, drag.endCx);
      const ry = Math.min(drag.startCy, drag.endCy);
      const rw = Math.abs(drag.endCx - drag.startCx) + 1;
      const rh = Math.abs(drag.endCy - drag.startCy) + 1;
      const newRoom: ZoneRoom = {
        id: `room_${Date.now()}`,
        x: rx, y: ry, w: rw, h: rh,
        title: "New Room",
        description: "",
        wallTexture: "/assets/textures/wall-stone.png",
        floorTexture: "/assets/textures/floor-granite.png",
        ceilingColor: "#141012",
      };
      setDraft((prev) => ({ ...prev, rooms: [...prev.rooms, newRoom] }));
      setSelectedRoom(newRoom);
      setTool("select");
      setDrag(null);
      return;
    }

    setDrag(null);

    if (tool === "passage") {
      const edge = snapEdge(px, py, draft.gridW, draft.gridH);
      if (edge) setDraft((prev) => cycleEdge(prev, edge));
      return;
    }

    if (tool === "select") {
      const room = findRoomContaining(draft, cx, cy);
      setSelectedRoom(room ?? null);
      return;
    }

    if (tool === "erase") {
      const room = findRoomContaining(draft, cx, cy);
      if (room && confirm(`Remove room "${room.id}"?`)) {
        setDraft((prev) => ({ ...prev, rooms: prev.rooms.filter((r) => r.id !== room.id) }));
        if (selectedRoom?.id === room.id) setSelectedRoom(null);
      }
    }
  }, [tool, drag, draft, selectedRoom]);

  function handleMouseLeave(): void {
    setHoverEdge(null);
    setDrag(null);
  }

  function updateRoom(updated: ZoneRoom): void {
    setDraft((prev) => ({ ...prev, rooms: prev.rooms.map((r) => r.id === updated.id ? updated : r) }));
    setSelectedRoom(updated);
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    try {
      await onSave(draft);
      setMsg("Saved to DB.");
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      setMsg(`Error: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  function handleReset(): void {
    if (!confirm("Discard all unsaved changes?")) return;
    setDraft(deepClone(initialZone));
    setSelectedRoom(null);
  }

  return (
    <div className="zone-editor">
      <div className="zone-editor-toolbar">
        <div className="zone-tool-group">
          {(["select", "room", "passage", "erase"] as Tool[]).map((t) => (
            <button
              key={t}
              className={`zone-tool-btn${tool === t ? " active" : ""}`}
              onClick={() => { setTool(t); setDrag(null); setHoverEdge(null); }}
            >
              {toolLabel(t)}
            </button>
          ))}
        </div>
        <div className="zone-tool-group">
          <button onClick={handleReset} className="btn-secondary">Reset</button>
          <button onClick={() => void handleSave()} className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save Zone"}
          </button>
          {msg && <span className="zone-editor-msg">{msg}</span>}
        </div>
      </div>

      <div className="zone-editor-hint">{toolHint(tool)}</div>

      <div className="zone-editor-body">
        <div className="zone-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={draft.gridW * CELL}
            height={draft.gridH * CELL}
            className="zone-canvas"
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          />
        </div>
        {selectedRoom && (
          <RoomSidebar
            room={selectedRoom}
            onChange={updateRoom}
            onClose={() => setSelectedRoom(null)}
          />
        )}
      </div>

      <div className="zone-editor-legend">
        <span style={{ color: WALL_COLOR }}>▬ wall</span>
        <span style={{ color: DOOR_COLOR }}>╌ door</span>
        <span style={{ color: GATE_COLOR }}>╌ gate</span>
        <span style={{ color: "#3a5060" }}>· open (no line)</span>
      </div>
    </div>
  );
}
