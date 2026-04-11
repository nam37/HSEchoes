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

export interface RoomSurfaces {
  textureSetId?: string;
  wallTexture?: string;
  floorTexture?: string;
  ceilingTexture?: string;
  ceilingColor: string;
}

export type RoomSurfaceOverrides = Partial<RoomSurfaces>;

export interface ResolvedRoomSurfaces {
  wallTexture: string;
  floorTexture: string;
  ceilingTexture?: string;
  ceilingColor: string;
}

export interface TextureSet {
  id: string;
  wallAssetId: string;
  floorAssetId: string;
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
  surfaceOverrides?: RoomSurfaceOverrides;
  prop?: string;
  discoveryText?: string;
  encounterId?: string;
  loot?: string[];
  victory?: boolean;
  zoneLink?: ZoneLink;
  npcId?: string;
  terminalId?: string;
  // Legacy fields kept optional so older persisted zone JSON can still be normalized.
  textureSetId?: string;
  wallTexture?: string;
  floorTexture?: string;
  ceilingTexture?: string;
  ceilingColor?: string;
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
  surfaceDefaults: RoomSurfaces;
  rooms: ZoneRoom[];
  edges: ZoneEdge[];
}

export interface ZoneInput extends Omit<Zone, "rooms" | "surfaceDefaults"> {
  surfaceDefaults?: Partial<RoomSurfaces>;
  rooms: ZoneRoom[];
}

// ── NPCs and Terminals ────────────────────────────────────────────────────────

export interface DialogueLine {
  id: string;
  text: string;
  /** Optional trigger fired when this line is delivered (e.g. to unlock a quest). */
  triggerId?: string;
  /** ID of the next DialogueLine in sequence; undefined = end of dialogue. */
  nextId?: string;
}

export interface NPC {
  id: string;
  name: string;
  role: string;
  portraitAssetId?: string;
  dialogue: DialogueLine[];
}

export interface Terminal {
  id: string;
  title: string;
  logText: string;
  xpReward?: number;
}

export interface PropDef {
  id: string;
  name: string;
  description?: string;
  iconLabel?: string;
  assetId?: string;
  modelAssetId?: string;
  renderHint?: "billboard" | "mesh" | "none";
}

// ── Assets ────────────────────────────────────────────────────────────────────

export type AssetType = "texture" | "sprite" | "portrait" | "icon" | "audio" | "mesh";

export interface AssetDef {
  id: string;
  path: string;
  type: AssetType;
  width?: number;
  height?: number;
  format?: string;
}

// ── Entities ──────────────────────────────────────────────────────────────────

export interface Enemy {
  id: string;
  name: string;
  maxHp: number;
  attack: number;
  defense: number;
  spritePath: string;
  modelAssetId?: string;
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
  modelAssetId?: string;
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
  level: number;
  xp: number;
  xpToNextLevel: number; // 0 = max level
  inventory: string[];
  equipped: EquippedItems;
}

export const MAX_LEVEL = 5;

/** XP needed to advance FROM each level. No entry at index 5 = max level. */
export const XP_TABLE: Readonly<Record<number, number>> = {
  1: 50,
  2: 100,
  3: 200,
  4: 300,
};

/** Stat gains applied when leveling UP from each level. */
export const ADVANCEMENT_TABLE: Readonly<Record<number, { maxHp: number; baseAttack: number; baseDefense: number }>> = {
  1: { maxHp: 5, baseAttack: 1, baseDefense: 0 },
  2: { maxHp: 5, baseAttack: 0, baseDefense: 1 },
  3: { maxHp: 5, baseAttack: 1, baseDefense: 0 },
  4: { maxHp: 5, baseAttack: 1, baseDefense: 1 },
};

// ── Tablet messages ───────────────────────────────────────────────────────────

export type MessageTriggerType = "on_start" | "on_room_entry" | "on_zone_entry";

export interface TabletMessage {
  id: string;
  sender: string;
  subject: string;
  body: string;
  timestamp: string;  // in-world flavour date, e.g. "Cycle 47 — Station Time 08:14"
  read: boolean;
}

/** A message template stored in world_data — defines content and trigger. */
export interface MessageDef {
  id: string;
  sender: string;
  subject: string;
  body: string;
  timestamp: string;
  trigger: { type: MessageTriggerType; targetId?: string };
}

// ── Quest system ──────────────────────────────────────────────────────────────

export type QuestObjectiveType = "reach_room" | "defeat_enemy" | "collect_item" | "interact_terminal";
export type QuestStatus = "active" | "completed";
export type QuestTriggerType = "on_start" | "on_room_entry" | "on_item_collect" | "on_enemy_defeat" | "on_zone_entry";

export interface QuestObjective {
  id: string;
  description: string;
  type: QuestObjectiveType;
  targetId?: string;
  completed: boolean;
}

/** A quest instance stored inside RunState — tracks per-run progress. */
export interface Quest {
  id: string;
  title: string;
  description: string;
  status: QuestStatus;
  objectives: QuestObjective[];
  xpReward: number;
  creditReward: number;
}

/** A quest template stored in world_data — defines structure and trigger. */
export interface QuestDef {
  id: string;
  title: string;
  description: string;
  objectives: Omit<QuestObjective, "completed">[];
  xpReward: number;
  creditReward: number;
  trigger: { type: QuestTriggerType; targetId?: string };
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
  activeQuests: Quest[];
  completedQuestIds: string[];
  completedQuests: Quest[];
  messages: TabletMessage[];
  interactedTerminalIds: string[];
  log: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SaveSummary {
  slotId: string;
  slotNumber: number;
  mode: GameMode;
  status: RunStatus;
  roomId: string;
  roomTitle: string;
  level: number;
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
  npcs: NPC[];
  terminals: Terminal[];
  props: PropDef[];
  assets: AssetDef[];
  textureSets: TextureSet[];
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

export interface CreateRunPayload {
  slotNumber: number;
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

export interface InteractPayload {
  slotId: string;
}

export interface InteractResult {
  run: RunState;
  kind: "npc" | "terminal" | "none";
  npcId?: string;
  npcName?: string;
  npcRole?: string;
  npcPortrait?: string;
  lines?: DialogueLine[];
  terminalId?: string;
  terminalTitle?: string;
  terminalText?: string;
  message?: string;
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

const DEFAULT_CEILING_COLOR = "#3a4048";

interface SurfaceResolutionOptions {
  assetMap?: Map<string, AssetDef>;
  textureSetMap?: Map<string, TextureSet>;
  fallbackWallTexture?: string;
  fallbackFloorTexture?: string;
}

export function resolveRoomSurfaces(
  zone: Zone,
  room: ZoneRoom,
  options?: SurfaceResolutionOptions
): ResolvedRoomSurfaces {
  const overrides = room.surfaceOverrides ?? {};
  const wallTexture = pickTexturePath(
    resolveTextureAssetPath(overrides.textureSetId ?? room.textureSetId, "wall", options),
    overrides.wallTexture,
    room.wallTexture,
    resolveTextureAssetPath(zone.surfaceDefaults.textureSetId, "wall", options),
    zone.surfaceDefaults.wallTexture,
    options?.fallbackWallTexture
  ) ?? "";
  const floorTexture = pickTexturePath(
    resolveTextureAssetPath(overrides.textureSetId ?? room.textureSetId, "floor", options),
    overrides.floorTexture,
    room.floorTexture,
    resolveTextureAssetPath(zone.surfaceDefaults.textureSetId, "floor", options),
    zone.surfaceDefaults.floorTexture,
    options?.fallbackFloorTexture
  ) ?? "";
  const ceilingTexture = pickTexturePath(
    overrides.ceilingTexture,
    room.ceilingTexture,
    zone.surfaceDefaults.ceilingTexture
  );
  return {
    wallTexture,
    floorTexture,
    ceilingTexture,
    ceilingColor: overrides.ceilingColor
      ?? room.ceilingColor
      ?? zone.surfaceDefaults.ceilingColor
      ?? DEFAULT_CEILING_COLOR,
  };
}

export function normalizeZoneSurfaces(zone: ZoneInput): Zone {
  const defaults: RoomSurfaces = {
    textureSetId: zone.surfaceDefaults?.textureSetId ?? pickCommonValue(zone.rooms, (room) => room.textureSetId),
    wallTexture: zone.surfaceDefaults?.wallTexture ?? pickCommonValue(zone.rooms, (room) => room.wallTexture),
    floorTexture: zone.surfaceDefaults?.floorTexture ?? pickCommonValue(zone.rooms, (room) => room.floorTexture),
    ceilingTexture: zone.surfaceDefaults?.ceilingTexture ?? pickCommonValue(zone.rooms, (room) => room.ceilingTexture),
    ceilingColor: zone.surfaceDefaults?.ceilingColor ?? pickCommonValue(zone.rooms, (room) => room.ceilingColor) ?? DEFAULT_CEILING_COLOR,
  };

  return {
    ...zone,
    surfaceDefaults: defaults,
    rooms: zone.rooms.map((room) => {
      const merged: RoomSurfaceOverrides = {
        textureSetId: room.surfaceOverrides?.textureSetId ?? room.textureSetId,
        wallTexture: room.surfaceOverrides?.wallTexture ?? room.wallTexture,
        floorTexture: room.surfaceOverrides?.floorTexture ?? room.floorTexture,
        ceilingTexture: room.surfaceOverrides?.ceilingTexture ?? room.ceilingTexture,
        ceilingColor: room.surfaceOverrides?.ceilingColor ?? room.ceilingColor,
      };
      const surfaceOverrides = compactSurfaceOverrides({
        textureSetId: merged.textureSetId !== undefined && merged.textureSetId !== defaults.textureSetId ? merged.textureSetId : undefined,
        wallTexture: merged.wallTexture !== undefined && merged.wallTexture !== defaults.wallTexture ? merged.wallTexture : undefined,
        floorTexture: merged.floorTexture !== undefined && merged.floorTexture !== defaults.floorTexture ? merged.floorTexture : undefined,
        ceilingTexture: merged.ceilingTexture !== defaults.ceilingTexture ? merged.ceilingTexture : undefined,
        ceilingColor: merged.ceilingColor !== undefined && merged.ceilingColor !== defaults.ceilingColor ? merged.ceilingColor : undefined,
      });
      return {
        id: room.id,
        x: room.x,
        y: room.y,
        w: room.w,
        h: room.h,
        title: room.title,
        description: room.description,
        surfaceOverrides,
        prop: room.prop,
        discoveryText: room.discoveryText,
        encounterId: room.encounterId,
        loot: room.loot,
        victory: room.victory,
        zoneLink: room.zoneLink,
        npcId: room.npcId,
        terminalId: room.terminalId,
      };
    }),
  };
}

function compactSurfaceOverrides(overrides: RoomSurfaceOverrides): RoomSurfaceOverrides | undefined {
  const entries = Object.entries(overrides).filter(([, value]) => value !== undefined);
  return entries.length > 0 ? Object.fromEntries(entries) as RoomSurfaceOverrides : undefined;
}

function resolveTextureAssetPath(
  textureSetId: string | undefined,
  surface: "wall" | "floor",
  options?: SurfaceResolutionOptions
): string | undefined {
  if (!textureSetId) {
    return undefined;
  }

  const textureSet = options?.textureSetMap?.get(textureSetId);
  if (!textureSet) {
    return undefined;
  }

  const assetId = surface === "wall" ? textureSet.wallAssetId : textureSet.floorAssetId;
  return options?.assetMap?.get(assetId)?.path;
}

function pickTexturePath(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

function pickCommonValue<T>(items: readonly T[], select: (item: T) => string | undefined): string | undefined {
  const counts = new Map<string, number>();
  let bestValue: string | undefined;
  let bestCount = 0;

  for (const item of items) {
    const value = select(item);
    if (value === undefined) continue;
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);
    if (count > bestCount) {
      bestCount = count;
      bestValue = value;
    }
  }

  return bestValue;
}
