import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import {
  forwardDelta,
  pushLog,
  turnLeft,
  turnRight,
  type BootstrapData,
  type CombatAction,
  type CombatState,
  type Direction,
  type DungeonCell,
  type Encounter,
  type Enemy,
  type Item,
  type MovePayload,
  type PlayerState,
  type RunEnvelope,
  type RunState,
  type SaveSummary
} from "../../../shared/src/index.js";

interface MetaRow {
  title: string;
  intro: string;
  startCellId: string;
  assets: BootstrapData["assets"];
}

export class GameService {
  private readonly cells: Map<string, DungeonCell>;
  private readonly enemies: Map<string, Enemy>;
  private readonly encounters: Map<string, Encounter>;
  private readonly items: Map<string, Item>;
  private readonly meta: MetaRow;

  constructor(
    private readonly db: Database.Database,
    private readonly random: () => number = Math.random
  ) {
    this.meta = this.loadMeta();
    this.cells = this.loadMap<DungeonCell>("cell");
    this.enemies = this.loadMap<Enemy>("enemy");
    this.encounters = this.loadMap<Encounter>("encounter");
    this.items = this.loadMap<Item>("item");
  }

  getBootstrap(): BootstrapData {
    return {
      title: this.meta.title,
      intro: this.meta.intro,
      startCellId: this.meta.startCellId,
      cells: [...this.cells.values()],
      enemies: [...this.enemies.values()],
      encounters: [...this.encounters.values()],
      items: [...this.items.values()],
      assets: this.meta.assets,
      saves: this.listSaves()
    };
  }

  listSaves(): SaveSummary[] {
    const rows = this.db.prepare("SELECT slot_id, json, updated_at FROM runs ORDER BY updated_at DESC").all() as Array<{ slot_id: string; json: string; updated_at: string }>;
    return rows.map((row) => {
      const run = JSON.parse(row.json) as RunState;
      return {
        slotId: row.slot_id,
        mode: run.mode,
        status: run.status,
        cellId: run.cellId,
        updatedAt: row.updated_at
      };
    });
  }

  createNewRun(): RunState {
    const now = new Date().toISOString();
    const run: RunState = {
      slotId: randomUUID().slice(0, 8),
      mode: "explore",
      status: "active",
      cellId: this.meta.startCellId,
      facing: "north",
      discoveredCellIds: [this.meta.startCellId],
      visitedCellIds: [this.meta.startCellId],
      clearedEncounterIds: [],
      collectedItemIds: ["rusted_blade"],
      player: {
        hp: 12,
        maxHp: 12,
        baseAttack: 2,
        baseDefense: 0,
        gold: 7,
        inventory: ["rusted_blade"],
        equipped: {
          weapon: "rusted_blade",
          armor: null,
          accessory: null
        }
      },
      combat: null,
      log: ["You descend beneath the Hollow Gate."],
      createdAt: now,
      updatedAt: now
    };

    this.applyCellEffects(run, this.getCell(run.cellId));
    this.persistRun(run);
    return run;
  }

  loadRun(slotId: string): RunState {
    return this.readRun(slotId);
  }

  move(payload: MovePayload): RunEnvelope {
    const run = this.readRun(payload.slotId);
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
      const current = this.getCell(run.cellId);
      const travelDirection = payload.command === "back" ? oppositeDirection(run.facing) : run.facing;
      const face = current.sides[travelDirection];
      if (face === "wall") {
        message = "Stone blocks your path.";
      } else {
        const requirement = current.passageRequirements?.[travelDirection];
        if (requirement && !run.player.inventory.includes(requirement.itemId)) {
          message = requirement.failureText;
        } else {
          const delta = forwardDelta(travelDirection);
          const next = this.findCellAt(current.x + delta.x, current.y + delta.y);
          if (!next) {
            message = "The passage ends in darkness.";
          } else {
            run.cellId = next.id;
            run.visitedCellIds = unique([...run.visitedCellIds, next.id]);
            run.discoveredCellIds = unique([...run.discoveredCellIds, next.id]);
            message = next.discoveryText ?? (payload.command === "back" ? `You step backward into ${next.title}.` : `You enter ${next.title}.`);
            this.applyCellEffects(run, next);
          }
        }
      }
    }

    run.log = pushLog(run.log, message);
    this.touch(run);
    this.persistRun(run);
    return { run, message };
  }

  handleCombat(slotId: string, action: CombatAction, itemId?: string): RunEnvelope {
    const run = this.readRun(slotId);
    const combat = run.combat;
    if (!combat) {
      return { run, message: "No enemy confronts you right now." };
    }

    const encounter = this.getEncounter(combat.encounterId);
    const enemy = this.getEnemy(combat.enemyId);
    const parts: string[] = [];

    if (action === "attack") {
      const damage = Math.max(1, this.totalAttack(run.player) + this.roll(0, 2) - enemy.defense);
      combat.enemyHp -= damage;
      parts.push(`You strike ${combat.enemyName} for ${damage} damage.`);
    } else if (action === "defend") {
      combat.defending = true;
      parts.push("You brace behind your gear for the next blow.");
    } else if (action === "use-item") {
      if (!itemId) {
        return { run, message: "Choose a consumable first." };
      }
      parts.push(this.consumeItem(run, itemId));
    } else if (action === "flee") {
      if (!combat.canFlee) {
        parts.push("The guardian locks every exit in place.");
      } else if (this.random() >= 0.4) {
        run.mode = "explore";
        run.combat = null;
        parts.push("You break away and stagger back into the corridor.");
        run.log = pushLog(run.log, parts.join(" "));
        this.touch(run);
        this.persistRun(run);
        return { run, message: parts.join(" ") };
      } else {
        parts.push("You lunge for an opening, but the foe cuts you off.");
      }
    }

    if (combat.enemyHp <= 0) {
      run.mode = "explore";
      run.combat = null;
      run.clearedEncounterIds = unique([...run.clearedEncounterIds, encounter.id]);
      parts.push(encounter.victoryText);
      for (const rewardItemId of encounter.rewardItemIds) {
        this.addItem(run, rewardItemId, `You claim ${this.getItem(rewardItemId).name}.`);
      }
      this.applyCellEffects(run, this.getCell(run.cellId));
      run.log = pushLog(run.log, parts.join(" "));
      this.touch(run);
      this.persistRun(run);
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
      run.mode = "defeat";
      run.combat = null;
      parts.push(encounter.defeatText);
    }

    run.log = pushLog(run.log, parts.join(" "));
    this.touch(run);
    this.persistRun(run);
    return { run, message: parts.join(" ") };
  }

  useItem(slotId: string, itemId: string): RunEnvelope {
    const run = this.readRun(slotId);
    const message = this.consumeItem(run, itemId);
    this.touch(run);
    this.persistRun(run);
    return { run, message };
  }

  equipItem(slotId: string, itemId: string): RunEnvelope {
    const run = this.readRun(slotId);
    if (!run.player.inventory.includes(itemId)) {
      return { run, message: "That item is not in your pack." };
    }
    const item = this.getItem(itemId);
    if (item.slot === "consumable") {
      return { run, message: `${item.name} is a consumable, not equipment.` };
    }

    const current = run.player.equipped[item.slot];
    run.player.equipped[item.slot] = current === itemId ? null : itemId;
    const verb = current === itemId ? "stow" : "equip";
    const message = `You ${verb} ${item.name}.`;
    run.log = pushLog(run.log, message);
    this.touch(run);
    this.persistRun(run);
    return { run, message };
  }

  saveRun(slotId: string): RunEnvelope {
    const run = this.readRun(slotId);
    this.touch(run);
    this.persistRun(run);
    return { run, message: "Run saved to the local archive." };
  }

  private applyCellEffects(run: RunState, cell: DungeonCell): void {
    if (cell.loot) {
      for (const itemId of cell.loot) {
        if (!run.collectedItemIds.includes(itemId)) {
          this.addItem(run, itemId, `You find ${this.getItem(itemId).name}.`);
        }
      }
    }

    if (cell.encounterId && !run.clearedEncounterIds.includes(cell.encounterId)) {
      const encounter = this.getEncounter(cell.encounterId);
      const enemy = this.getEnemy(encounter.enemyId);
      const combat: CombatState = {
        encounterId: encounter.id,
        enemyId: enemy.id,
        enemyName: enemy.name,
        enemyHp: enemy.maxHp,
        enemyMaxHp: enemy.maxHp,
        defending: false,
        canFlee: encounter.canFlee
      };
      run.mode = "combat";
      run.combat = combat;
      run.log = pushLog(run.log, encounter.intro);
      return;
    }

    if (cell.victory) {
      if (run.player.inventory.includes("star_sigil")) {
        run.status = "victory";
        run.mode = "victory";
        run.log = pushLog(run.log, "The Star Sigil seats into the altar, and the dungeon finally falls silent.");
      } else {
        run.log = pushLog(run.log, "The altar waits for a missing sigil from deeper in the ruin.");
      }
    }
  }

  private consumeItem(run: RunState, itemId: string): string {
    if (!run.player.inventory.includes(itemId)) {
      return "That item is not in your pack.";
    }
    const item = this.getItem(itemId);
    if (item.slot !== "consumable" || !item.healAmount) {
      return `${item.name} cannot be used right now.`;
    }
    if (run.player.hp >= run.player.maxHp) {
      return "You are already at full strength.";
    }

    const before = run.player.hp;
    run.player.hp = Math.min(run.player.maxHp, run.player.hp + item.healAmount);
    run.player.inventory = run.player.inventory.filter((entry, index) => index !== run.player.inventory.indexOf(itemId));
    const healed = run.player.hp - before;
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
    const weapon = player.equipped.weapon ? this.getItem(player.equipped.weapon).attackBonus ?? 0 : 0;
    const accessory = player.equipped.accessory ? this.getItem(player.equipped.accessory).attackBonus ?? 0 : 0;
    return player.baseAttack + weapon + accessory;
  }

  private totalDefense(player: PlayerState): number {
    const armor = player.equipped.armor ? this.getItem(player.equipped.armor).defenseBonus ?? 0 : 0;
    const accessory = player.equipped.accessory ? this.getItem(player.equipped.accessory).defenseBonus ?? 0 : 0;
    return player.baseDefense + armor + accessory;
  }

  private roll(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  private readRun(slotId: string): RunState {
    const row = this.db.prepare("SELECT json FROM runs WHERE slot_id = ?").get(slotId) as { json: string } | undefined;
    if (!row) {
      throw new Error(`Run '${slotId}' not found.`);
    }
    return JSON.parse(row.json) as RunState;
  }

  private persistRun(run: RunState): void {
    this.db.prepare(`
      INSERT INTO runs (slot_id, json, created_at, updated_at)
      VALUES (@slot_id, @json, @created_at, @updated_at)
      ON CONFLICT(slot_id) DO UPDATE SET
        json = excluded.json,
        updated_at = excluded.updated_at
    `).run({
      slot_id: run.slotId,
      json: JSON.stringify(run),
      created_at: run.createdAt,
      updated_at: run.updatedAt
    });
  }

  private touch(run: RunState): void {
    run.updatedAt = new Date().toISOString();
  }

  private loadMeta(): MetaRow {
    const row = this.db.prepare("SELECT json FROM world_data WHERE kind = 'meta' AND id = 'bootstrap'").get() as { json: string } | undefined;
    if (!row) {
      throw new Error("World seed has not been loaded into SQLite. Run `npm run db:seed`.");
    }
    return JSON.parse(row.json) as MetaRow;
  }

  private loadMap<T>(kind: string): Map<string, T> {
    const rows = this.db.prepare("SELECT id, json FROM world_data WHERE kind = ?").all(kind) as Array<{ id: string; json: string }>;
    return new Map(rows.map((row) => [row.id, JSON.parse(row.json) as T]));
  }

  private getCell(id: string): DungeonCell {
    const cell = this.cells.get(id);
    if (!cell) {
      throw new Error(`Unknown cell '${id}'.`);
    }
    return cell;
  }

  private findCellAt(x: number, y: number): DungeonCell | undefined {
    return [...this.cells.values()].find((cell) => cell.x === x && cell.y === y);
  }

  private getEncounter(id: string): Encounter {
    const encounter = this.encounters.get(id);
    if (!encounter) {
      throw new Error(`Unknown encounter '${id}'.`);
    }
    return encounter;
  }

  private getEnemy(id: string): Enemy {
    const enemy = this.enemies.get(id);
    if (!enemy) {
      throw new Error(`Unknown enemy '${id}'.`);
    }
    return enemy;
  }

  private getItem(id: string): Item {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Unknown item '${id}'.`);
    }
    return item;
  }
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function oppositeDirection(direction: Direction): Direction {
  switch (direction) {
    case "north":
      return "south";
    case "east":
      return "west";
    case "south":
      return "north";
    case "west":
      return "east";
  }
}





