export type Direction = "north" | "east" | "south" | "west";
export type MovementCommand = "forward" | "back" | "turn-left" | "turn-right";
export type CombatAction = "attack" | "defend" | "use-item" | "flee";
export type GameMode = "explore" | "combat" | "victory" | "defeat";
export type RunStatus = "active" | "victory" | "defeat";
export type ItemSlot = "weapon" | "armor" | "accessory" | "consumable";
export type CellFace = "wall" | "open" | "door" | "gate";

export interface PassageRequirement {
  itemId: string;
  failureText: string;
}

export interface AssetManifest {
  titleSplash: string;
  wallTexture: string;
  floorTexture: string;
  gateTexture: string;
  panelTexture: string;
  enemySprites: string[];
  itemIcons: string[];
}

export interface DungeonCell {
  id: string;
  title: string;
  description: string;
  x: number;
  y: number;
  sides: Record<Direction, CellFace>;
  passageRequirements?: Partial<Record<Direction, PassageRequirement>>;
  wallTexture: string;
  floorTexture: string;
  ceilingColor: string;
  prop?: string;
  discoveryText?: string;
  encounterId?: string;
  loot?: string[];
  victory?: boolean;
}

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
  gold: number;
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

export interface SaveSummary {
  slotId: string;
  mode: GameMode;
  status: RunStatus;
  cellId: string;
  updatedAt: string;
}

export interface RunState {
  slotId: string;
  mode: GameMode;
  status: RunStatus;
  cellId: string;
  facing: Direction;
  discoveredCellIds: string[];
  visitedCellIds: string[];
  clearedEncounterIds: string[];
  collectedItemIds: string[];
  player: PlayerState;
  combat: CombatState | null;
  log: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BootstrapData {
  title: string;
  intro: string;
  startCellId: string;
  cells: DungeonCell[];
  enemies: Enemy[];
  encounters: Encounter[];
  items: Item[];
  assets: AssetManifest;
  saves: SaveSummary[];
}

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
    case "north":
      return { x: 0, y: -1 };
    case "east":
      return { x: 1, y: 0 };
    case "south":
      return { x: 0, y: 1 };
    case "west":
      return { x: -1, y: 0 };
  }
}

export function pushLog(log: string[], message: string, maxEntries = 8): string[] {
  return [...log, message].slice(-maxEntries);
}

export function formatFaceLabel(face: CellFace): string {
  switch (face) {
    case "door":
      return "Door";
    case "gate":
      return "Gate";
    case "open":
      return "Passage";
    default:
      return "Wall";
  }
}

