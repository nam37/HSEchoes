import { randomUUID } from "node:crypto";
import type { Sql } from "../db/database.js";
import {
  findRoomContaining,
  findZoneEdge,
  forwardDelta,
  pushLog,
  resolveEdgeType,
  turnLeft,
  turnRight,
  type BootstrapData,
  type CombatAction,
  type CombatState,
  type Direction,
  type Enemy,
  type Encounter,
  type Item,
  type MovePayload,
  type PlayerState,
  type RunEnvelope,
  type RunState,
  type SaveSummary,
  type Zone,
  type ZoneRoom
} from "../../../shared/src/index.js";

interface MetaRow {
  title: string;
  intro: string;
  startX: number;
  startY: number;
  assets: BootstrapData["assets"];
}

export class GameService {
  private zone!: Zone;
  private enemies!: Map<string, Enemy>;
  private encounters!: Map<string, Encounter>;
  private items!: Map<string, Item>;
  private meta!: MetaRow;

  private constructor(
    private readonly sql: Sql,
    private readonly random: () => number = Math.random
  ) {}

  static async create(sql: Sql, random: () => number = Math.random): Promise<GameService> {
    const instance = new GameService(sql, random);
    instance.meta      = await instance.loadMeta();
    instance.zone      = await instance.loadZone();
    instance.enemies   = await instance.loadMap<Enemy>("enemy");
    instance.encounters = await instance.loadMap<Encounter>("encounter");
    instance.items     = await instance.loadMap<Item>("item");
    return instance;
  }

  async reload(): Promise<void> {
    this.meta      = await this.loadMeta();
    this.zone      = await this.loadZone();
    this.enemies   = await this.loadMap<Enemy>("enemy");
    this.encounters = await this.loadMap<Encounter>("encounter");
    this.items     = await this.loadMap<Item>("item");
  }

  // ── World data access for admin ──────────────────────────────────────────

  async getWorldData(): Promise<{ zones: Zone[]; enemies: Enemy[]; encounters: Encounter[]; items: Item[] }> {
    return {
      zones:      [this.zone],
      enemies:    [...this.enemies.values()],
      encounters: [...this.encounters.values()],
      items:      [...this.items.values()]
    };
  }

  async upsertWorldEntity(kind: string, id: string, data: unknown): Promise<void> {
    await this.sql`
      INSERT INTO world_data (kind, id, json)
      VALUES (${kind}, ${id}, ${JSON.stringify(data)})
      ON CONFLICT (kind, id) DO UPDATE SET json = EXCLUDED.json
    `;
  }

  async deleteWorldEntity(kind: string, id: string): Promise<void> {
    await this.sql`DELETE FROM world_data WHERE kind = ${kind} AND id = ${id}`;
  }

  // ── Bootstrap ────────────────────────────────────────────────────────────

  async getBootstrap(): Promise<BootstrapData> {
    return {
      title:   this.meta.title,
      intro:   this.meta.intro,
      startX:  this.meta.startX,
      startY:  this.meta.startY,
      zones:   [this.zone],
      enemies:    [...this.enemies.values()],
      encounters: [...this.encounters.values()],
      items:      [...this.items.values()],
      assets: this.meta.assets,
      saves:  await this.listSaves()
    };
  }

  async listSaves(): Promise<SaveSummary[]> {
    const rows = await this.sql<Array<{ slot_id: string; json: string; updated_at: string }>>`
      SELECT slot_id, json, updated_at FROM runs ORDER BY updated_at DESC
    `;
    return rows.map((row) => {
      const run = JSON.parse(row.json) as RunState;
      return {
        slotId:    row.slot_id,
        mode:      run.mode,
        status:    run.status,
        roomId:    run.roomId,
        updatedAt: row.updated_at
      };
    });
  }

  // ── Run lifecycle ────────────────────────────────────────────────────────

  async createNewRun(): Promise<RunState> {
    const now  = new Date().toISOString();
    const startRoom = findRoomContaining(this.zone, this.meta.startX, this.meta.startY);

    const run: RunState = {
      slotId:             randomUUID().slice(0, 8),
      mode:               "explore",
      status:             "active",
      zoneId:             this.zone.id,
      roomId:             startRoom?.id ?? "",
      posX:               this.meta.startX,
      posY:               this.meta.startY,
      previousRoomId:     null,
      facing:             "north",
      discoveredRoomIds:  startRoom ? [startRoom.id] : [],
      clearedEncounterIds:[],
      collectedItemIds:   ["rusted_blade"],
      player: {
        hp: 12, maxHp: 12,
        baseAttack: 2, baseDefense: 0,
        gold: 7,
        inventory: ["rusted_blade"],
        equipped: { weapon: "rusted_blade", armor: null, accessory: null }
      },
      combat:    null,
      log:       ["You descend beneath the Hollow Gate."],
      createdAt: now,
      updatedAt: now
    };

    if (startRoom) {
      this.applyRoomEffects(run, startRoom);
    }
    await this.persistRun(run);
    return run;
  }

  async loadRun(slotId: string): Promise<RunState> {
    return this.readRun(slotId);
  }

  // ── Movement ─────────────────────────────────────────────────────────────

  async move(payload: MovePayload): Promise<RunEnvelope> {
    const run = await this.readRun(payload.slotId);
    if (run.status !== "active") {
      return { run, message: "This run has already reached its end." };
    }
    if (run.mode === "combat") {
      return { run, message: "Defeat the current threat before moving on." };
    }

    let message = "";

    if (payload.command === "turn-left") {
      run.facing = turnLeft(run.facing);
      message = `You turn left and now face ${run.facing}.`;
    } else if (payload.command === "turn-right") {
      run.facing = turnRight(run.facing);
      message = `You turn right and now face ${run.facing}.`;
    } else {
      const travelDir = payload.command === "back" ? oppositeDirection(run.facing) : run.facing;
      const delta = forwardDelta(travelDir);
      const nextX = run.posX + delta.x;
      const nextY = run.posY + delta.y;

      const currentRoom = findRoomContaining(this.zone, run.posX, run.posY);
      const nextRoom    = findRoomContaining(this.zone, nextX, nextY);

      if (!nextRoom) {
        message = "Darkness offers no passage here.";
      } else {
        const edge = findZoneEdge(this.zone, run.posX, run.posY, travelDir);
        const edgeType = resolveEdgeType(this.zone, run.posX, run.posY, travelDir);

        if (edgeType === "wall") {
          message = "Stone blocks your path.";
        } else if (edge?.requirement && !run.player.inventory.includes(edge.requirement.itemId)) {
          message = edge.requirement.failureText;
        } else {
          const prevRoomId = run.roomId;
          run.posX = nextX;
          run.posY = nextY;

          const enteredNewRoom = nextRoom.id !== prevRoomId || (currentRoom?.id !== nextRoom.id);
          run.previousRoomId = prevRoomId;
          run.roomId = nextRoom.id;

          if (!run.discoveredRoomIds.includes(nextRoom.id)) {
            run.discoveredRoomIds = [...run.discoveredRoomIds, nextRoom.id];
          }

          message = enteredNewRoom
            ? (nextRoom.discoveryText ?? `You enter ${nextRoom.title}.`)
            : `You move ${travelDir}.`;

          if (enteredNewRoom) {
            this.applyRoomEffects(run, nextRoom);
          }
        }
      }
    }

    run.log = pushLog(run.log, message);
    this.touch(run);
    await this.persistRun(run);
    return { run, message };
  }

  // ── Combat ───────────────────────────────────────────────────────────────

  async handleCombat(slotId: string, action: CombatAction, itemId?: string): Promise<RunEnvelope> {
    const run = await this.readRun(slotId);
    const combat = run.combat;
    if (!combat) {
      return { run, message: "No enemy confronts you right now." };
    }

    const encounter = this.getEncounter(combat.encounterId);
    const enemy     = this.getEnemy(combat.enemyId);
    const parts: string[] = [];

    if (action === "attack") {
      const damage = Math.max(1, this.totalAttack(run.player) + this.roll(0, 2) - enemy.defense);
      combat.enemyHp -= damage;
      parts.push(`You strike ${combat.enemyName} for ${damage} damage.`);
    } else if (action === "defend") {
      combat.defending = true;
      parts.push("You brace behind your gear for the next blow.");
    } else if (action === "use-item") {
      if (!itemId) return { run, message: "Choose a consumable first." };
      parts.push(this.consumeItem(run, itemId));
    } else if (action === "flee") {
      if (!combat.canFlee) {
        parts.push("The guardian locks every exit in place.");
      } else if (this.random() >= 0.4) {
        run.mode   = "explore";
        run.combat = null;
        if (run.previousRoomId) {
          const prevRoom = this.zone.rooms.find(r => r.id === run.previousRoomId);
          if (prevRoom) {
            run.roomId = prevRoom.id;
            run.posX   = prevRoom.x;
            run.posY   = prevRoom.y;
          }
          run.previousRoomId = null;
        }
        parts.push("You break away and stagger back into the corridor.");
        run.log = pushLog(run.log, parts.join(" "));
        this.touch(run);
        await this.persistRun(run);
        return { run, message: parts.join(" ") };
      } else {
        parts.push("You lunge for an opening, but the foe cuts you off.");
      }
    }

    if (combat.enemyHp <= 0) {
      run.mode   = "explore";
      run.combat = null;
      run.clearedEncounterIds = unique([...run.clearedEncounterIds, encounter.id]);
      parts.push(encounter.victoryText);
      for (const rewardItemId of encounter.rewardItemIds) {
        this.addItem(run, rewardItemId, `You claim ${this.getItem(rewardItemId).name}.`);
      }
      const currentRoom = findRoomContaining(this.zone, run.posX, run.posY);
      if (currentRoom) this.applyRoomEffects(run, currentRoom);
      run.log = pushLog(run.log, parts.join(" "));
      this.touch(run);
      await this.persistRun(run);
      return { run, message: parts.join(" ") };
    }

    let incoming = Math.max(1, enemy.attack + this.roll(0, 2) - this.totalDefense(run.player));
    if (combat.defending) {
      incoming = Math.max(1, Math.floor(incoming / 2));
      combat.defending = false;
    }

    run.player.hp = Math.max(0, run.player.hp - incoming);
    parts.push(`${combat.enemyName} hits you for ${incoming} damage.`);

    if (run.player.hp <= 0) {
      run.status = "defeat";
      run.mode   = "defeat";
      run.combat = null;
      parts.push(encounter.defeatText);
    }

    run.log = pushLog(run.log, parts.join(" "));
    this.touch(run);
    await this.persistRun(run);
    return { run, message: parts.join(" ") };
  }

  async useItem(slotId: string, itemId: string): Promise<RunEnvelope> {
    const run = await this.readRun(slotId);
    const message = this.consumeItem(run, itemId);
    this.touch(run);
    await this.persistRun(run);
    return { run, message };
  }

  async equipItem(slotId: string, itemId: string): Promise<RunEnvelope> {
    const run = await this.readRun(slotId);
    if (!run.player.inventory.includes(itemId)) {
      return { run, message: "That item is not in your pack." };
    }
    const item = this.getItem(itemId);
    if (item.slot === "consumable") {
      return { run, message: `${item.name} is a consumable, not equipment.` };
    }
    const current = run.player.equipped[item.slot];
    run.player.equipped[item.slot] = current === itemId ? null : itemId;
    const verb    = current === itemId ? "stow" : "equip";
    const message = `You ${verb} ${item.name}.`;
    run.log = pushLog(run.log, message);
    this.touch(run);
    await this.persistRun(run);
    return { run, message };
  }

  async saveRun(slotId: string): Promise<RunEnvelope> {
    const run = await this.readRun(slotId);
    this.touch(run);
    await this.persistRun(run);
    return { run, message: "Run saved to the local archive." };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private applyRoomEffects(run: RunState, room: ZoneRoom): void {
    if (room.loot) {
      for (const itemId of room.loot) {
        if (!run.collectedItemIds.includes(itemId)) {
          this.addItem(run, itemId, `You find ${this.getItem(itemId).name}.`);
        }
      }
    }

    if (room.encounterId && !run.clearedEncounterIds.includes(room.encounterId)) {
      const encounter = this.getEncounter(room.encounterId);
      const enemy     = this.getEnemy(encounter.enemyId);
      const combat: CombatState = {
        encounterId: encounter.id,
        enemyId:     enemy.id,
        enemyName:   enemy.name,
        enemyHp:     enemy.maxHp,
        enemyMaxHp:  enemy.maxHp,
        defending:   false,
        canFlee:     encounter.canFlee
      };
      run.mode   = "combat";
      run.combat = combat;
      run.log = pushLog(run.log, encounter.intro);
      return;
    }

    if (room.victory) {
      if (run.player.inventory.includes("star_sigil")) {
        run.status = "victory";
        run.mode   = "victory";
        run.log = pushLog(run.log, "The Star Sigil seats into the altar, and the dungeon finally falls silent.");
      } else {
        run.log = pushLog(run.log, "The altar waits for a missing sigil from deeper in the ruin.");
      }
    }
  }

  private consumeItem(run: RunState, itemId: string): string {
    if (!run.player.inventory.includes(itemId)) return "That item is not in your pack.";
    const item = this.getItem(itemId);
    if (item.slot !== "consumable" || !item.healAmount) return `${item.name} cannot be used right now.`;
    if (run.player.hp >= run.player.maxHp) return "You are already at full strength.";

    const before  = run.player.hp;
    run.player.hp = Math.min(run.player.maxHp, run.player.hp + item.healAmount);
    run.player.inventory = run.player.inventory.filter((_, i) => i !== run.player.inventory.indexOf(itemId));
    const healed  = run.player.hp - before;
    const message = `You drink ${item.name} and recover ${healed} HP.`;
    run.log = pushLog(run.log, message);
    return message;
  }

  private addItem(run: RunState, itemId: string, message: string): void {
    if (!run.player.inventory.includes(itemId)) {
      run.player.inventory = [...run.player.inventory, itemId];
    }
    run.collectedItemIds = unique([...run.collectedItemIds, itemId]);
    run.log = pushLog(run.log, message);
  }

  private totalAttack(player: PlayerState): number {
    const weapon    = player.equipped.weapon    ? this.getItem(player.equipped.weapon).attackBonus    ?? 0 : 0;
    const accessory = player.equipped.accessory ? this.getItem(player.equipped.accessory).attackBonus ?? 0 : 0;
    return player.baseAttack + weapon + accessory;
  }

  private totalDefense(player: PlayerState): number {
    const armor     = player.equipped.armor     ? this.getItem(player.equipped.armor).defenseBonus     ?? 0 : 0;
    const accessory = player.equipped.accessory ? this.getItem(player.equipped.accessory).defenseBonus ?? 0 : 0;
    return player.baseDefense + armor + accessory;
  }

  private roll(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  private async readRun(slotId: string): Promise<RunState> {
    const rows = await this.sql<Array<{ json: string }>>`SELECT json FROM runs WHERE slot_id = ${slotId}`;
    if (rows.length === 0) throw new Error(`Run '${slotId}' not found.`);
    return JSON.parse(rows[0].json) as RunState;
  }

  private async persistRun(run: RunState): Promise<void> {
    await this.sql`
      INSERT INTO runs (slot_id, json, created_at, updated_at)
      VALUES (${run.slotId}, ${JSON.stringify(run)}, ${run.createdAt}, ${run.updatedAt})
      ON CONFLICT (slot_id) DO UPDATE SET json = EXCLUDED.json, updated_at = EXCLUDED.updated_at
    `;
  }

  private touch(run: RunState): void {
    run.updatedAt = new Date().toISOString();
  }

  private async loadMeta(): Promise<MetaRow> {
    const rows = await this.sql<Array<{ json: string }>>`
      SELECT json FROM world_data WHERE kind = 'meta' AND id = 'bootstrap'
    `;
    if (rows.length === 0) throw new Error("World seed has not been loaded. Run `npm run db:seed`.");
    return JSON.parse(rows[0].json) as MetaRow;
  }

  private async loadZone(): Promise<Zone> {
    const rows = await this.sql<Array<{ json: string }>>`
      SELECT json FROM world_data WHERE kind = 'zone' LIMIT 1
    `;
    if (rows.length === 0) throw new Error("No zone found. Run `npm run db:seed`.");
    return JSON.parse(rows[0].json) as Zone;
  }

  private async loadMap<T>(kind: string): Promise<Map<string, T>> {
    const rows = await this.sql<Array<{ id: string; json: string }>>`
      SELECT id, json FROM world_data WHERE kind = ${kind}
    `;
    return new Map(rows.map((row) => [row.id, JSON.parse(row.json) as T]));
  }

  private getEncounter(id: string): Encounter {
    const e = this.encounters.get(id);
    if (!e) throw new Error(`Unknown encounter '${id}'.`);
    return e;
  }

  private getEnemy(id: string): Enemy {
    const e = this.enemies.get(id);
    if (!e) throw new Error(`Unknown enemy '${id}'.`);
    return e;
  }

  private getItem(id: string): Item {
    const e = this.items.get(id);
    if (!e) throw new Error(`Unknown item '${id}'.`);
    return e;
  }
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function oppositeDirection(direction: Direction): Direction {
  switch (direction) {
    case "north": return "south";
    case "east":  return "west";
    case "south": return "north";
    case "west":  return "east";
  }
}
