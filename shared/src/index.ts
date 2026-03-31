export type Direction = "north" | "east" | "south" | "west";
export type MovementCommand = "forward" | "back" | "turn-left" | "turn-right";
export type CombatAction = "attack" | "defend" | "use-item" | "flee";
export type GameMode = "explore" | "combat" | "victory" | "defeat";
export type RunStatus = "active" | "victory" | "defeat";
export type ItemSlot = "weapon" | "armor" | "accessory" | "consumable";
export type EdgeType = "wall" | "open" | "door" | "gate";
export type CellFace = EdgeType; // backward-compat alias

// ── Zone model ────────────────────────────────────────────────────────────────

export interface PassageRequirement {
  itemId: string;
  failureText: string;
}

export interface ZoneLink {
  toZoneId: string;
  toRoomId: string;
  entryX: number;
  entryY: number;
  facing?: Direction;
  transitionText?: string;
}

/** A named, rectangular region of grid squares. Rooms can be any width/height. */
export interface ZoneRoom {
  id: string;
  x: number;  // top-left grid column (inclusive)
  y: number;  // top-left grid row   (inclusive)
  w: number;  // width  in grid squares
  h: number;  // height in grid squares
  title: string;
  description: string;
  wallTexture: string;
  floorTexture: string;
  ceilingColor: string;
  prop?: string;
  discoveryText?: string;
  encounterId?: string;
  loot?: string[];
  victory?: boolean;
  zoneLink?: ZoneLink;
}

/**
 * An edge lives on the boundary between two grid squares.
 * dir "h": horizontal boundary between row y and row y+1 at column x.
 *          Moving south from (x,y) crosses this edge.
 * dir "v": vertical boundary between col x and col x+1 at row y.
 *          Moving east from (x,y) crosses this edge.
 * Edges are only stored when passable (open/door/gate).
 * An absent edge between two different rooms = wall.
 * An absent edge within the same room = open (free interior movement).
 */
export interface ZoneEdge {
  x: number;
  y: number;
  dir: "h" | "v";
  type: EdgeType;
  requirement?: PassageRequirement;
}

export interface Zone {
  id: string;
  title: string;
  gridW: number;
  gridH: number;
  rooms: ZoneRoom[];
  edges: ZoneEdge[];
}

// ── Assets ────────────────────────────────────────────────────────────────────

export interface AssetManifest {
  titleSplash: string;
  wallTexture: string;
  floorTexture: string;
  gateTexture: string;
  panelTexture: string;
  enemySprites: string[];
  itemIcons: string[];
}

// ── Entities ──────────────────────────────────────────────────────────────────

export interface Enemy {
  id: string;
  name: string;
  maxHp: number;
  attack: number;
  defense: number;
  spritePath: string;
  introLine: string;
}

export interface Encounter {
  id: string;
  enemyId: string;
  intro: string;
  victoryText: string;
  defeatText: string;
  canFlee: boolean;
  rewardItemIds: string[];
  once: boolean;
}

export interface Item {
  id: string;
  name: string;
  slot: ItemSlot;
  description: string;
  iconPath: string;
  attackBonus?: number;
  defenseBonus?: number;
  healAmount?: number;
  keyItem?: boolean;
}

// ── Player / run state ────────────────────────────────────────────────────────

export interface EquippedItems {
  weapon: string | null;
  armor: string | null;
  accessory: string | null;
}

export interface PlayerState {
  hp: number;
  maxHp: number;
  baseAttack: number;
  baseDefense: number;
  credits: number;
  inventory: string[];
  equipped: EquippedItems;
}

export interface CombatState {
  encounterId: string;
  enemyId: string;
  enemyName: string;
  enemyHp: number;
  enemyMaxHp: number;
  defending: boolean;
  canFlee: boolean;
}

export interface RunState {
  slotId: string;
  mode: GameMode;
  status: RunStatus;
  zoneId: string;
  roomId: string;       // current ZoneRoom.id
  posX: number;         // exact grid column
  posY: number;         // exact grid row
  previousRoomId: string | null;
  facing: Direction;
  discoveredRoomIds: string[];
  clearedEncounterIds: string[];
  collectedItemIds: string[];
  player: PlayerState;
  combat: CombatState | null;
  log: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SaveSummary {
  slotId: string;
  mode: GameMode;
  status: RunStatus;
  roomId: string;
  updatedAt: string;
}

export interface BootstrapData {
  title: string;
  intro: string;
  startX: number;
  startY: number;
  zones: Zone[];
  enemies: Enemy[];
  encounters: Encounter[];
  items: Item[];
  assets: AssetManifest;
  saves: SaveSummary[];
}

// ── API shapes ────────────────────────────────────────────────────────────────

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface RunEnvelope {
  run: RunState;
  message?: string;
}

export interface MovePayload {
  slotId: string;
  command: MovementCommand;
}

export interface CombatPayload {
  slotId: string;
  action: CombatAction;
  itemId?: string;
}

export interface InventoryPayload {
  slotId: string;
  itemId: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export const DIRECTIONS: Direction[] = ["north", "east", "south", "west"];

export function turnLeft(facing: Direction): Direction {
  const index = DIRECTIONS.indexOf(facing);
  return DIRECTIONS[(index + DIRECTIONS.length - 1) % DIRECTIONS.length];
}

export function turnRight(facing: Direction): Direction {
  const index = DIRECTIONS.indexOf(facing);
  return DIRECTIONS[(index + 1) % DIRECTIONS.length];
}

export function forwardDelta(facing: Direction): { x: number; y: number } {
  switch (facing) {
    case "north": return { x: 0, y: -1 };
    case "east":  return { x: 1,  y: 0  };
    case "south": return { x: 0,  y: 1  };
    case "west":  return { x: -1, y: 0  };
  }
}

export function pushLog(log: string[], message: string, maxEntries = 8): string[] {
  return [...log, message].slice(-maxEntries);
}

export function formatFaceLabel(face: EdgeType): string {
  switch (face) {
    case "door":  return "Door";
    case "gate":  return "Gate";
    case "open":  return "Passage";
    default:      return "Wall";
  }
}

/**
 * Resolve the edge type between (px,py) and its neighbor in `dir`.
 * - Explicit edge in zone.edges → returns that type.
 * - No edge, both squares in same room → "open" (free interior movement).
 * - No edge, different rooms or no room → "wall".
 */
export function resolveEdgeType(zone: Zone, px: number, py: number, dir: Direction): EdgeType {
  const edge = findZoneEdge(zone, px, py, dir);
  if (edge) return edge.type;
  // interior movement within same room
  const delta = forwardDelta(dir);
  const nx = px + delta.x, ny = py + delta.y;
  const r1 = findRoomContaining(zone, px, py);
  const r2 = findRoomContaining(zone, nx, ny);
  if (r1 && r2 && r1.id === r2.id) return "open";
  return "wall";
}

export function findZoneEdge(zone: Zone, px: number, py: number, dir: Direction): ZoneEdge | undefined {
  let ex: number, ey: number, eDir: "h" | "v";
  switch (dir) {
    case "east":  ex = px;    ey = py;    eDir = "v"; break;
    case "west":  ex = px-1;  ey = py;    eDir = "v"; break;
    case "south": ex = px;    ey = py;    eDir = "h"; break;
    case "north": ex = px;    ey = py-1;  eDir = "h"; break;
  }
  return zone.edges.find(e => e.x === ex && e.y === ey && e.dir === eDir);
}

export function findRoomContaining(zone: Zone, x: number, y: number): ZoneRoom | undefined {
  return zone.rooms.find(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
}
