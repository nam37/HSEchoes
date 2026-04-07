import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AssetDef, EdgeType, RoomSurfaces, TextureSet, Zone, ZoneEdge, ZoneRoom } from "../../../../shared/src/index";
import { findRoomContaining } from "../../../../shared/src/index";
import { RoomSidebar } from "./RoomSidebar";
import { buildAssetMap, buildTextureSetMap } from "../../lib/assets";

// ── Constants ─────────────────────────────────────────────────────────────────

const CELL = 72;
const SNAP = 16;
const HANDLE_HIT = 10; // px radius for resize handle hit detection
const HANDLE_DRAW = 5; // px half-size for drawn handle squares

const ROOM_PALETTE = [
  "#0d2035", "#1a0d35", "#0d3520", "#350d1a",
  "#35200d", "#0d3535", "#20350d", "#350d35",
  "#1a2010", "#102030", "#301020", "#203010",
];

const WALL_COLOR = "#4a8099";
const DOOR_COLOR = "#cc8800";
const GATE_COLOR = "#3366ff";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tool = "select" | "room" | "passage" | "erase";
type ResizeHandle = "tl" | "t" | "tr" | "r" | "br" | "b" | "bl" | "l";

type DragState =
  | { kind: "draw"; startCx: number; startCy: number; endCx: number; endCy: number }
  | { kind: "move"; room: ZoneRoom; originX: number; originY: number; downCx: number; downCy: number; candidateX: number; candidateY: number; valid: boolean }
  | { kind: "resize"; room: ZoneRoom; handle: ResizeHandle; candidateX: number; candidateY: number; candidateW: number; candidateH: number; valid: boolean };

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
    case "select":  return "Click to select a room. Drag to move it. Drag a corner/edge handle to resize.";
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

/** Remove edges that are no longer on a boundary between two different, present rooms. */
function pruneEdges(zone: Zone): Zone {
  const validEdges = zone.edges.filter((edge) => {
    const [cx1, cy1, cx2, cy2] = edge.dir === "v"
      ? [edge.x, edge.y, edge.x + 1, edge.y]
      : [edge.x, edge.y, edge.x, edge.y + 1];
    const r1 = zone.rooms.find((r) => cx1 >= r.x && cx1 < r.x + r.w && cy1 >= r.y && cy1 < r.y + r.h);
    const r2 = zone.rooms.find((r) => cx2 >= r.x && cx2 < r.x + r.w && cy2 >= r.y && cy2 < r.y + r.h);
    if (!r1 || !r2) return false;           // either side is void — orphaned edge
    if (r1.id === r2.id) return false;      // interior of same room
    return true;
  });
  return { ...zone, edges: validEdges };
}

/** True if edge lies on the boundary of the given room. */
function isOnRoomBoundary(edge: ZoneEdge, room: ZoneRoom): boolean {
  const { x: rx, y: ry, w: rw, h: rh } = room;
  if (edge.dir === "v") {
    // Left boundary: "v" edge at x=rx-1, between (rx-1,ey) and (rx,ey)
    if (edge.x === rx - 1     && edge.y >= ry && edge.y < ry + rh) return true;
    // Right boundary: "v" edge at x=rx+rw-1, between (rx+rw-1,ey) and (rx+rw,ey)
    if (edge.x === rx + rw - 1 && edge.y >= ry && edge.y < ry + rh) return true;
  } else {
    // Top boundary: "h" edge at y=ry-1, between (ex,ry-1) and (ex,ry)
    if (edge.y === ry - 1     && edge.x >= rx && edge.x < rx + rw) return true;
    // Bottom boundary: "h" edge at y=ry+rh-1, between (ex,ry+rh-1) and (ex,ry+rh)
    if (edge.y === ry + rh - 1 && edge.x >= rx && edge.x < rx + rw) return true;
  }
  return false;
}

/**
 * Move a room and translate all edges that were on its boundary by the same delta.
 * Uses a lenient prune after translation: keeps edges where one side is the moved room
 * and the other side is void (preserves passage markers on the room's sides so they
 * reconnect automatically if a neighbour is placed there later).
 * Only removes edges where both sides are void, or the edge is interior to one room.
 * Strict pruning (remove any void-side edge) is reserved for resize and erase.
 */
function moveRoomWithEdges(zone: Zone, oldRoom: ZoneRoom, newRoom: ZoneRoom): Zone {
  const dx = newRoom.x - oldRoom.x;
  const dy = newRoom.y - oldRoom.y;
  const newRooms = zone.rooms.map((r) => r.id === oldRoom.id ? newRoom : r);
  if (dx === 0 && dy === 0) return { ...zone, rooms: newRooms };

  // Translate boundary edges; leave all others in place
  const translated = zone.edges.map((edge) =>
    isOnRoomBoundary(edge, oldRoom)
      ? { ...edge, x: edge.x + dx, y: edge.y + dy }
      : edge
  );

  // Deduplicate by position+dir (last write wins)
  const edgeMap = new Map<string, ZoneEdge>();
  for (const edge of translated) edgeMap.set(`${edge.x},${edge.y},${edge.dir}`, edge);

  // Lenient prune: remove only if both sides void, or interior to same room
  const validEdges = [...edgeMap.values()].filter((edge) => {
    const [cx1, cy1, cx2, cy2] = edge.dir === "v"
      ? [edge.x, edge.y, edge.x + 1, edge.y]
      : [edge.x, edge.y, edge.x, edge.y + 1];
    const r1 = newRooms.find((r) => cx1 >= r.x && cx1 < r.x + r.w && cy1 >= r.y && cy1 < r.y + r.h);
    const r2 = newRooms.find((r) => cx2 >= r.x && cx2 < r.x + r.w && cy2 >= r.y && cy2 < r.y + r.h);
    if (!r1 && !r2) return false;                   // both void — pointless
    if (r1 && r2 && r1.id === r2.id) return false;  // interior of same room
    return true;                                     // room↔void or room↔room — keep
  });

  return { ...zone, rooms: newRooms, edges: validEdges };
}

/** True if candidate geometry doesn't overlap any other room and stays in bounds. */
function isValidGeometry(
  geo: { x: number; y: number; w: number; h: number },
  excludeId: string,
  zone: Zone,
  gridW: number,
  gridH: number
): boolean {
  if (geo.x < 0 || geo.y < 0 || geo.w < 1 || geo.h < 1) return false;
  if (geo.x + geo.w > gridW || geo.y + geo.h > gridH) return false;
  return !zone.rooms.some(
    (r) => r.id !== excludeId &&
      geo.x < r.x + r.w && geo.x + geo.w > r.x &&
      geo.y < r.y + r.h && geo.y + geo.h > r.y
  );
}

/** Return the 8 handle positions (pixel coords) for a room. */
function getHandles(room: ZoneRoom): Array<{ handle: ResizeHandle; px: number; py: number }> {
  const rx = room.x * CELL;
  const ry = room.y * CELL;
  const rw = room.w * CELL;
  const rh = room.h * CELL;
  return [
    { handle: "tl", px: rx,         py: ry },
    { handle: "t",  px: rx + rw / 2, py: ry },
    { handle: "tr", px: rx + rw,    py: ry },
    { handle: "r",  px: rx + rw,    py: ry + rh / 2 },
    { handle: "br", px: rx + rw,    py: ry + rh },
    { handle: "b",  px: rx + rw / 2, py: ry + rh },
    { handle: "bl", px: rx,         py: ry + rh },
    { handle: "l",  px: rx,         py: ry + rh / 2 },
  ];
}

function hitHandle(room: ZoneRoom, px: number, py: number): ResizeHandle | null {
  for (const h of getHandles(room)) {
    if (Math.abs(px - h.px) <= HANDLE_HIT && Math.abs(py - h.py) <= HANDLE_HIT) return h.handle;
  }
  return null;
}

/** Compute new room geometry based on which handle is being dragged to (cx, cy). */
function computeResizedRoom(
  room: ZoneRoom,
  handle: ResizeHandle,
  cx: number,
  cy: number,
  gridW: number,
  gridH: number
): { x: number; y: number; w: number; h: number } {
  const cxC = Math.max(0, Math.min(gridW - 1, cx));
  const cyC = Math.max(0, Math.min(gridH - 1, cy));
  const right  = room.x + room.w;
  const bottom = room.y + room.h;

  switch (handle) {
    case "tl": { const nx = Math.min(cxC, right  - 1); const ny = Math.min(cyC, bottom - 1); return { x: nx, y: ny, w: right  - nx, h: bottom - ny }; }
    case "t":  { const ny = Math.min(cyC, bottom - 1); return { x: room.x, y: ny, w: room.w, h: bottom - ny }; }
    case "tr": { const ny = Math.min(cyC, bottom - 1); return { x: room.x, y: ny, w: Math.max(1, cxC - room.x + 1), h: bottom - ny }; }
    case "r":  { return { x: room.x, y: room.y, w: Math.max(1, cxC - room.x + 1), h: room.h }; }
    case "br": { return { x: room.x, y: room.y, w: Math.max(1, cxC - room.x + 1), h: Math.max(1, cyC - room.y + 1) }; }
    case "b":  { return { x: room.x, y: room.y, w: room.w, h: Math.max(1, cyC - room.y + 1) }; }
    case "bl": { const nx = Math.min(cxC, right  - 1); return { x: nx, y: room.y, w: right  - nx, h: Math.max(1, cyC - room.y + 1) }; }
    case "l":  { const nx = Math.min(cxC, right  - 1); return { x: nx, y: room.y, w: right  - nx, h: room.h }; }
  }
}

// ── Canvas draw ───────────────────────────────────────────────────────────────

function resolveDrawEdge(zone: Zone, cx: number, cy: number, dir: "h" | "v"): "wall" | "open" | "door" | "gate" {
  let ex: number, ey: number, nx: number, ny: number;
  if (dir === "v") { ex = cx; ey = cy; nx = cx + 1; ny = cy; }
  else              { ex = cx; ey = cy; nx = cx;     ny = cy + 1; }
  const explicit = zone.edges.find((e) => e.x === ex && e.y === ey && e.dir === dir);
  if (explicit) return explicit.type;
  const r1 = zone.rooms.find((r) => cx >= r.x && cx < r.x + r.w && cy >= r.y && cy < r.y + r.h);
  const r2 = zone.rooms.find((r) => nx >= r.x && nx < r.x + r.w && ny >= r.y && ny < r.y + r.h);
  if (r1 && r2 && r1.id === r2.id) return "open";
  return "wall";
}

function drawHandles(ctx: CanvasRenderingContext2D, room: { x: number; y: number; w: number; h: number }): void {
  const rx = room.x * CELL;
  const ry = room.y * CELL;
  const rw = room.w * CELL;
  const rh = room.h * CELL;
  const points = [
    [rx,         ry],
    [rx + rw / 2, ry],
    [rx + rw,    ry],
    [rx + rw,    ry + rh / 2],
    [rx + rw,    ry + rh],
    [rx + rw / 2, ry + rh],
    [rx,         ry + rh],
    [rx,         ry + rh / 2],
  ];
  ctx.fillStyle = "#60b0ff";
  ctx.strokeStyle = "#0a1a2a";
  ctx.lineWidth = 1;
  for (const [hx, hy] of points) {
    ctx.fillRect(hx - HANDLE_DRAW, hy - HANDLE_DRAW, HANDLE_DRAW * 2, HANDLE_DRAW * 2);
    ctx.strokeRect(hx - HANDLE_DRAW, hy - HANDLE_DRAW, HANDLE_DRAW * 2, HANDLE_DRAW * 2);
  }
}

function drawCanvas(
  ctx: CanvasRenderingContext2D,
  zone: Zone,
  selectedId: string | null,
  dragState: DragState | null,
  hoverEdge: EdgeCoord | null,
  tool: Tool
): void {
  const W = zone.gridW * CELL;
  const H = zone.gridH * CELL;

  ctx.fillStyle = "#08111a";
  ctx.fillRect(0, 0, W, H);

  zone.rooms.forEach((room, i) => {
    ctx.fillStyle = ROOM_PALETTE[i % ROOM_PALETTE.length];
    ctx.globalAlpha = 0.8;
    ctx.fillRect(room.x * CELL, room.y * CELL, room.w * CELL, room.h * CELL);
    ctx.globalAlpha = 1;
  });

  ctx.strokeStyle = "#1a2535";
  ctx.lineWidth = 0.5;
  ctx.setLineDash([]);
  for (let x = 0; x <= zone.gridW; x++) {
    ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke();
  }
  for (let y = 0; y <= zone.gridH; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); ctx.stroke();
  }

  for (let cy = 0; cy < zone.gridH; cy++) {
    for (let cx = 0; cx < zone.gridW; cx++) {
      if (cx < zone.gridW - 1) {
        const type = resolveDrawEdge(zone, cx, cy, "v");
        if (type !== "open") {
          const x = (cx + 1) * CELL;
          ctx.beginPath(); ctx.moveTo(x, cy * CELL); ctx.lineTo(x, (cy + 1) * CELL);
          if (type === "wall") { ctx.strokeStyle = WALL_COLOR; ctx.lineWidth = 2; ctx.setLineDash([]); }
          else if (type === "door") { ctx.strokeStyle = DOOR_COLOR; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); }
          else { ctx.strokeStyle = GATE_COLOR; ctx.lineWidth = 3; ctx.setLineDash([3, 3]); }
          ctx.stroke(); ctx.setLineDash([]);
        }
      }
      if (cy < zone.gridH - 1) {
        const type = resolveDrawEdge(zone, cx, cy, "h");
        if (type !== "open") {
          const y = (cy + 1) * CELL;
          ctx.beginPath(); ctx.moveTo(cx * CELL, y); ctx.lineTo((cx + 1) * CELL, y);
          if (type === "wall") { ctx.strokeStyle = WALL_COLOR; ctx.lineWidth = 2; ctx.setLineDash([]); }
          else if (type === "door") { ctx.strokeStyle = DOOR_COLOR; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); }
          else { ctx.strokeStyle = GATE_COLOR; ctx.lineWidth = 3; ctx.setLineDash([3, 3]); }
          ctx.stroke(); ctx.setLineDash([]);
        }
      }
    }
  }

  // Overlay dangling (invalid) passage edges in orange — one side has no room.
  // These are kept in zone.edges so they auto-reconnect if a room is placed next to them.
  zone.edges.forEach((edge) => {
    const [cx1, cy1, cx2, cy2] = edge.dir === "v"
      ? [edge.x, edge.y, edge.x + 1, edge.y]
      : [edge.x, edge.y, edge.x, edge.y + 1];
    const r1 = zone.rooms.find((r) => cx1 >= r.x && cx1 < r.x + r.w && cy1 >= r.y && cy1 < r.y + r.h);
    const r2 = zone.rooms.find((r) => cx2 >= r.x && cx2 < r.x + r.w && cy2 >= r.y && cy2 < r.y + r.h);
    if (r1 && r2 && r1.id !== r2.id) return; // valid — already rendered correctly
    if (!r1 && !r2) return;                   // fully void — would have been pruned
    // One side has a room, other is void → dangling passage
    const [x1, y1, x2, y2] = edgeCoords(edge);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = "#ff8800";
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  zone.rooms.forEach((room) => {
    if (selectedId === room.id) {
      ctx.strokeStyle = "#60b0ff";
      ctx.lineWidth = 2; ctx.setLineDash([]);
      ctx.strokeRect(room.x * CELL + 1, room.y * CELL + 1, room.w * CELL - 2, room.h * CELL - 2);
    }
    ctx.fillStyle = "#8ab4d0";
    ctx.font = "bold 10px monospace";
    ctx.fillText(room.id, room.x * CELL + 5, room.y * CELL + 14);
    if (room.title && room.title !== room.id) {
      ctx.fillStyle = "#5a8090"; ctx.font = "9px monospace";
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

  // Draw room tool drag preview
  if (dragState?.kind === "draw") {
    const rx = Math.min(dragState.startCx, dragState.endCx) * CELL;
    const ry = Math.min(dragState.startCy, dragState.endCy) * CELL;
    const rw = (Math.abs(dragState.endCx - dragState.startCx) + 1) * CELL;
    const rh = (Math.abs(dragState.endCy - dragState.startCy) + 1) * CELL;
    ctx.fillStyle = "rgba(32, 96, 160, 0.3)";
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = "#4090d0"; ctx.lineWidth = 2; ctx.setLineDash([]);
    ctx.strokeRect(rx, ry, rw, rh);
  }

  // Draw move/resize candidate preview + handles
  if (selectedId && tool === "select") {
    let handleGeo: { x: number; y: number; w: number; h: number } | null = null;

    if (dragState?.kind === "move") {
      const { candidateX, candidateY, room, valid } = dragState;
      const geo = { x: candidateX, y: candidateY, w: room.w, h: room.h };
      ctx.fillStyle = valid ? "rgba(40, 160, 90, 0.3)" : "rgba(180, 40, 40, 0.3)";
      ctx.fillRect(geo.x * CELL, geo.y * CELL, geo.w * CELL, geo.h * CELL);
      ctx.strokeStyle = valid ? "#40d080" : "#d04040";
      ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
      ctx.strokeRect(geo.x * CELL, geo.y * CELL, geo.w * CELL, geo.h * CELL);
      ctx.setLineDash([]);
      handleGeo = geo;
    } else if (dragState?.kind === "resize") {
      const { candidateX, candidateY, candidateW, candidateH, valid } = dragState;
      const geo = { x: candidateX, y: candidateY, w: candidateW, h: candidateH };
      ctx.fillStyle = valid ? "rgba(40, 160, 90, 0.3)" : "rgba(180, 40, 40, 0.3)";
      ctx.fillRect(geo.x * CELL, geo.y * CELL, geo.w * CELL, geo.h * CELL);
      ctx.strokeStyle = valid ? "#40d080" : "#d04040";
      ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
      ctx.strokeRect(geo.x * CELL, geo.y * CELL, geo.w * CELL, geo.h * CELL);
      ctx.setLineDash([]);
      handleGeo = geo;
    } else {
      const selRoom = zone.rooms.find((r) => r.id === selectedId);
      if (selRoom) handleGeo = selRoom;
    }

    if (handleGeo) drawHandles(ctx, handleGeo);
  }

  // Passage tool hover
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
  assets: AssetDef[];
  textureSets: TextureSet[];
  onSave: (zone: Zone) => Promise<void>;
}

export function ZoneEditor({ zone: initialZone, assets, textureSets, onSave }: Props): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draft, setDraft] = useState<Zone>(() => deepClone(initialZone));
  const [tool, setTool] = useState<Tool>("select");
  const [selectedRoom, setSelectedRoom] = useState<ZoneRoom | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoverEdge, setHoverEdge] = useState<EdgeCoord | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const assetMap = useMemo(() => buildAssetMap(assets), [assets]);
  const textureSetMap = useMemo(() => buildTextureSetMap(textureSets), [textureSets]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawCanvas(ctx, draft, selectedRoom?.id ?? null, dragState, hoverEdge, tool);
  }, [draft, selectedRoom, dragState, hoverEdge, tool]);

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

    if (tool === "passage") setHoverEdge(snapEdge(px, py, draft.gridW, draft.gridH));

    setDragState((prev) => {
      if (!prev) return null;
      if (prev.kind === "draw") return { ...prev, endCx: cx, endCy: cy };
      if (prev.kind === "move") {
        const dx = cx - prev.downCx;
        const dy = cy - prev.downCy;
        const candidateX = Math.max(0, Math.min(draft.gridW - prev.room.w, prev.originX + dx));
        const candidateY = Math.max(0, Math.min(draft.gridH - prev.room.h, prev.originY + dy));
        const valid = isValidGeometry({ x: candidateX, y: candidateY, w: prev.room.w, h: prev.room.h }, prev.room.id, draft, draft.gridW, draft.gridH);
        return { ...prev, candidateX, candidateY, valid };
      }
      if (prev.kind === "resize") {
        const geo = computeResizedRoom(prev.room, prev.handle, cx, cy, draft.gridW, draft.gridH);
        const valid = isValidGeometry(geo, prev.room.id, draft, draft.gridW, draft.gridH);
        return { ...prev, candidateX: geo.x, candidateY: geo.y, candidateW: geo.w, candidateH: geo.h, valid };
      }
      return prev;
    });
  }, [tool, draft]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const { px, py } = canvasPx(e);
    const { cx, cy } = toCell(px, py);

    if (tool === "select") {
      // Resize handles take priority
      if (selectedRoom) {
        const handle = hitHandle(selectedRoom, px, py);
        if (handle) {
          setDragState({ kind: "resize", room: selectedRoom, handle, candidateX: selectedRoom.x, candidateY: selectedRoom.y, candidateW: selectedRoom.w, candidateH: selectedRoom.h, valid: true });
          return;
        }
      }
      // Room hit → start move drag
      const room = findRoomContaining(draft, cx, cy);
      if (room) {
        setSelectedRoom(room);
        setDragState({ kind: "move", room, originX: room.x, originY: room.y, downCx: cx, downCy: cy, candidateX: room.x, candidateY: room.y, valid: true });
      } else {
        setSelectedRoom(null);
      }
      return;
    }

    if (tool === "room") {
      setDragState({ kind: "draw", startCx: cx, startCy: cy, endCx: cx, endCy: cy });
    }
  }, [tool, selectedRoom, draft]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const { px, py } = canvasPx(e);
    const { cx, cy } = toCell(px, py);

    if (!dragState) {
      if (tool === "passage") {
        const edge = snapEdge(px, py, draft.gridW, draft.gridH);
        if (edge) setDraft((prev) => cycleEdge(prev, edge));
      } else if (tool === "erase") {
        const room = findRoomContaining(draft, cx, cy);
        if (room && confirm(`Remove room "${room.id}"?`)) {
          setDraft((prev) => pruneEdges({ ...prev, rooms: prev.rooms.filter((r) => r.id !== room.id) }));
          if (selectedRoom?.id === room.id) setSelectedRoom(null);
        }
      }
      return;
    }

    if (dragState.kind === "draw") {
      const rx = Math.min(dragState.startCx, dragState.endCx);
      const ry = Math.min(dragState.startCy, dragState.endCy);
      const rw = Math.abs(dragState.endCx - dragState.startCx) + 1;
      const rh = Math.abs(dragState.endCy - dragState.startCy) + 1;
      const newRoom: ZoneRoom = {
        id: `room_${Date.now()}`,
        x: rx, y: ry, w: rw, h: rh,
        title: "New Room", description: "",
      };
      setDraft((prev) => ({ ...prev, rooms: [...prev.rooms, newRoom] }));
      setSelectedRoom(newRoom);
      setTool("select");
    } else if (dragState.kind === "move" && dragState.valid) {
      const updated: ZoneRoom = { ...dragState.room, x: dragState.candidateX, y: dragState.candidateY };
      setDraft((prev) => moveRoomWithEdges(prev, dragState.room, updated));
      setSelectedRoom(updated);
    } else if (dragState.kind === "resize" && dragState.valid) {
      const updated: ZoneRoom = { ...dragState.room, x: dragState.candidateX, y: dragState.candidateY, w: dragState.candidateW, h: dragState.candidateH };
      setDraft((prev) => pruneEdges({ ...prev, rooms: prev.rooms.map((r) => r.id === updated.id ? updated : r) }));
      setSelectedRoom(updated);
    }

    setDragState(null);
  }, [tool, dragState, draft, selectedRoom]);

  function handleMouseLeave(): void {
    setHoverEdge(null);
    // Cancel non-committed drags on leave
    if (dragState?.kind === "draw") setDragState(null);
  }

  function updateRoom(updated: ZoneRoom): void {
    setDraft((prev) => pruneEdges({ ...prev, rooms: prev.rooms.map((r) => r.id === updated.id ? updated : r) }));
    setSelectedRoom(updated);
  }

  function updateSurfaceDefault<K extends keyof RoomSurfaces>(key: K, value: RoomSurfaces[K]): void {
    setDraft((prev) => ({
      ...prev,
      surfaceDefaults: {
        ...prev.surfaceDefaults,
        [key]: value,
      },
    }));
  }

  function setGridW(val: number): void {
    const n = Math.max(1, val);
    const maxExtent = Math.max(0, ...draft.rooms.map((r) => r.x + r.w));
    if (n < maxExtent) { setMsg(`Cannot shrink: rooms extend to column ${maxExtent}.`); return; }
    setDraft((prev) => ({ ...prev, gridW: n }));
  }

  function setGridH(val: number): void {
    const n = Math.max(1, val);
    const maxExtent = Math.max(0, ...draft.rooms.map((r) => r.y + r.h));
    if (n < maxExtent) { setMsg(`Cannot shrink: rooms extend to row ${maxExtent}.`); return; }
    setDraft((prev) => ({ ...prev, gridH: n }));
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
    setDragState(null);
  }

  return (
    <div className="zone-editor">
      <div className="zone-editor-toolbar">
        <div className="zone-tool-group">
          {(["select", "room", "passage", "erase"] as Tool[]).map((t) => (
            <button
              key={t}
              className={`zone-tool-btn${tool === t ? " active" : ""}`}
              onClick={() => { setTool(t); setDragState(null); setHoverEdge(null); }}
            >
              {toolLabel(t)}
            </button>
          ))}
        </div>
        <div className="zone-tool-group zone-grid-controls">
          <label className="zone-grid-label">
            Grid W
            <input type="number" min={1} value={draft.gridW} onChange={(e) => setGridW(Number(e.target.value))} className="zone-grid-input" />
          </label>
          <label className="zone-grid-label">
            Grid H
            <input type="number" min={1} value={draft.gridH} onChange={(e) => setGridH(Number(e.target.value))} className="zone-grid-input" />
          </label>
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
        <div className="zone-editor-sidebars">
          <aside className="zone-sidebar">
            <div className="zone-sidebar-header">
              <h3>Zone Defaults</h3>
            </div>
            <div className="zone-sidebar-body">
              <label>Texture Set<input value={draft.surfaceDefaults.textureSetId ?? ""} onChange={(e) => updateSurfaceDefault("textureSetId", e.target.value || undefined)} /></label>
              <label>Wall Texture<input value={draft.surfaceDefaults.wallTexture ?? ""} onChange={(e) => updateSurfaceDefault("wallTexture", e.target.value || undefined)} /></label>
              <label>Floor Texture<input value={draft.surfaceDefaults.floorTexture ?? ""} onChange={(e) => updateSurfaceDefault("floorTexture", e.target.value || undefined)} /></label>
              <label>Ceiling Texture<input value={draft.surfaceDefaults.ceilingTexture ?? ""} onChange={(e) => updateSurfaceDefault("ceilingTexture", e.target.value || undefined)} /></label>
              <label>Ceiling Tint
                <div className="zone-surface-row">
                  <input type="color" value={draft.surfaceDefaults.ceilingColor} onChange={(e) => updateSurfaceDefault("ceilingColor", e.target.value)} style={{ width: "2.5rem", padding: "0.1rem" }} />
                  <input value={draft.surfaceDefaults.ceilingColor} onChange={(e) => updateSurfaceDefault("ceilingColor", e.target.value)} />
                </div>
              </label>
            </div>
          </aside>
          {selectedRoom && (
            <RoomSidebar
              zone={draft}
              room={selectedRoom}
              gridW={draft.gridW}
              gridH={draft.gridH}
              assetMap={assetMap}
              textureSetMap={textureSetMap}
              onChange={updateRoom}
              onClose={() => setSelectedRoom(null)}
            />
          )}
        </div>
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
