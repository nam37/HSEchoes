import { randomUUID } from "node:crypto";
import type { Sql } from "../db/database.js";
import {
  ADVANCEMENT_TABLE,
  findRoomContaining,
  findZoneEdge,
  forwardDelta,
  MAX_LEVEL,
  pushLog,
  resolveEdgeType,
  turnLeft,
  turnRight,
  XP_TABLE,
  type BootstrapData,
  type CombatAction,
  type CombatState,
  type Direction,
  type Enemy,
  type Encounter,
  type InteractResult,
  type Item,
  type MessageDef,
  type MovePayload,
  type NPC,
  type PlayerState,
  type Quest,
  type QuestDef,
  type RunEnvelope,
  type RunState,
  type SaveSummary,
  type TabletMessage,
  type Terminal,
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
  private zones!: Map<string, Zone>;
  private enemies!: Map<string, Enemy>;
  private encounters!: Map<string, Encounter>;
  private items!: Map<string, Item>;
  private quests!: Map<string, QuestDef>;
  private messageDefs!: Map<string, MessageDef>;
  private npcs!: Map<string, NPC>;
  private terminals!: Map<string, Terminal>;
  private meta!: MetaRow;

  private constructor(
    private readonly sql: Sql,
    private readonly random: () => number = Math.random
  ) {}

  static async create(sql: Sql, random: () => number = Math.random): Promise<GameService> {
    const instance = new GameService(sql, random);
    instance.meta        = await instance.loadMeta();
    instance.zones       = await instance.loadZones();
    instance.enemies     = await instance.loadMap<Enemy>("enemy");
    instance.encounters  = await instance.loadMap<Encounter>("encounter");
    instance.items       = await instance.loadMap<Item>("item");
    instance.quests      = await instance.loadMap<QuestDef>("quest");
    instance.messageDefs = await instance.loadMap<MessageDef>("message");
    instance.npcs        = await instance.loadMap<NPC>("npc");
    instance.terminals   = await instance.loadMap<Terminal>("terminal");
    return instance;
  }

  async reload(): Promise<void> {
    this.meta        = await this.loadMeta();
    this.zones       = await this.loadZones();
    this.enemies     = await this.loadMap<Enemy>("enemy");
    this.encounters  = await this.loadMap<Encounter>("encounter");
    this.items       = await this.loadMap<Item>("item");
    this.quests      = await this.loadMap<QuestDef>("quest");
    this.messageDefs = await this.loadMap<MessageDef>("message");
    this.npcs        = await this.loadMap<NPC>("npc");
    this.terminals   = await this.loadMap<Terminal>("terminal");
  }

  private getZone(zoneId: string): Zone {
    const z = this.zones.get(zoneId);
    if (!z) throw new Error(`Unknown zone '${zoneId}'.`);
    return z;
  }

  // ── World data access for admin ──────────────────────────────────────────

  async getWorldData(): Promise<{ zones: Zone[]; enemies: Enemy[]; encounters: Encounter[]; items: Item[]; quests: QuestDef[] }> {
    return {
      zones:      [...this.zones.values()],
      enemies:    [...this.enemies.values()],
      encounters: [...this.encounters.values()],
      items:      [...this.items.values()],
      quests:     [...this.quests.values()]
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

  async getBootstrap(userId: string): Promise<BootstrapData> {
    return {
      title:   this.meta.title,
      intro:   this.meta.intro,
      startX:  this.meta.startX,
      startY:  this.meta.startY,
      zones:   [...this.zones.values()],
      enemies:    [...this.enemies.values()],
      encounters: [...this.encounters.values()],
      items:      [...this.items.values()],
      npcs:       [...this.npcs.values()],
      terminals:  [...this.terminals.values()],
      assets: this.meta.assets,
      saves:  await this.listSaves(userId)
    };
  }

  async listSaves(userId: string): Promise<SaveSummary[]> {
    const rows = await this.sql<Array<{ slot_id: string; json: string; updated_at: string }>>`
      SELECT slot_id, json, updated_at FROM runs WHERE user_id = ${userId} ORDER BY updated_at DESC
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

  async listAllSaves(): Promise<SaveSummary[]> {
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

  async createNewRun(userId: string): Promise<RunEnvelope> {
    const now  = new Date().toISOString();
    const startZone = [...this.zones.values()][0];
    const startRoom = findRoomContaining(startZone, this.meta.startX, this.meta.startY);

    const run: RunState = {
      slotId:             randomUUID().slice(0, 8),
      mode:               "explore",
      status:             "active",
      zoneId:             startZone.id,
      roomId:             startRoom?.id ?? "",
      posX:               this.meta.startX,
      posY:               this.meta.startY,
      previousRoomId:     null,
      facing:             "north",
      discoveredRoomIds:  startRoom ? [startRoom.id] : [],
      clearedEncounterIds:[],
      collectedItemIds:   ["maintenance_tool"],
      player: {
        hp: 20, maxHp: 20,
        baseAttack: 2, baseDefense: 0,
        credits: 7,
        level: 1,
        xp: 0,
        xpToNextLevel: XP_TABLE[1],
        inventory: ["maintenance_tool"],
        equipped: { weapon: "maintenance_tool", armor: null, accessory: null }
      },
      combat:                   null,
      activeQuests:             [],
      completedQuestIds:        [],
      completedQuests:          [],
      messages:                 [],
      interactedTerminalIds:    [],
      log:       ["You cycle through the maintenance airlock and descend into the ring."],
      createdAt: now,
      updatedAt: now
    };

    if (startRoom) {
      this.applyRoomEffects(run, startRoom);
    }
    this.triggerQuestsForEvent(run, { type: "game_start" });
    this.deliverMessages(run, { type: "game_start" });
    await this.persistRun(run, userId, true);

    // Surface all run-start notifications in the ribbon so none are hidden behind log.at(-1).
    const notifications = run.log.slice(1); // skip the entry-text flavour line
    const message = notifications.length > 0 ? notifications.join("  ·  ") : undefined;
    return { run, message };
  }

  async loadRun(slotId: string, userId: string): Promise<RunState> {
    // Load from checkpoint (last manual save), falling back to auto-save if never manually saved.
    // Also reset json to the checkpoint so subsequent moves start from the correct position.
    await this.sql`
      UPDATE runs SET json = COALESCE(checkpoint_json, json), updated_at = ${new Date().toISOString()}
      WHERE slot_id = ${slotId} AND user_id = ${userId}
    `;
    return this.readRun(slotId, userId);
  }

  // ── Movement ─────────────────────────────────────────────────────────────

  async move(payload: MovePayload, userId: string): Promise<RunEnvelope> {
    const run = await this.readRun(payload.slotId, userId);
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

      const zone = this.getZone(run.zoneId);
      const currentRoom = findRoomContaining(zone, run.posX, run.posY);
      const nextRoom    = findRoomContaining(zone, nextX, nextY);

      if (!nextRoom) {
        message = "No passage in that direction.";
      } else {
        const edge = findZoneEdge(zone, run.posX, run.posY, travelDir);
        const edgeType = resolveEdgeType(zone, run.posX, run.posY, travelDir);

        if (edgeType === "wall") {
          message = "Solid bulkhead. No passage.";
        } else if (edge?.requirement && !run.player.inventory.includes(edge.requirement.itemId)) {
          message = edge.requirement.failureText;
        } else {
          const prevRoomId = run.roomId;
          run.posX = nextX;
          run.posY = nextY;

          const enteredNewRoom = nextRoom.id !== prevRoomId || (currentRoom?.id !== nextRoom.id);
          run.previousRoomId = prevRoomId;
          run.roomId = nextRoom.id;

          const firstTimeInRoom = !run.discoveredRoomIds.includes(nextRoom.id);
          if (firstTimeInRoom) {
            run.discoveredRoomIds = [...run.discoveredRoomIds, nextRoom.id];
          }

          message = enteredNewRoom
            ? (nextRoom.discoveryText ?? `You enter ${nextRoom.title}.`)
            : `You move ${travelDir}.`;

          if (enteredNewRoom) {
            if (firstTimeInRoom) {
              this.awardXp(run, 5);
            }
            this.triggerQuestsForEvent(run, { type: "room_entry", targetId: nextRoom.id });
            this.checkObjectives(run, { type: "room_entry", targetId: nextRoom.id });
            this.deliverMessages(run, { type: "room_entry", targetId: nextRoom.id });
            const transitionMsg = this.applyRoomEffects(run, nextRoom);
            if (transitionMsg !== undefined) {
              // Zone boundary crossed — transition message already pushed to log inside applyRoomEffects.
              this.touch(run);
              await this.persistRun(run, userId);
              return { run, message: transitionMsg };
            }
          }
        }
      }
    }

    run.log = pushLog(run.log, message);
    // Always auto-save json so combat/move handlers read the correct state.
    // checkpoint_json is what protects Load Latest from restoring mid-fight.
    this.touch(run);
    await this.persistRun(run, userId);
    return { run, message };
  }

  // ── Combat ───────────────────────────────────────────────────────────────

  async handleCombat(slotId: string, action: CombatAction, userId: string, itemId?: string): Promise<RunEnvelope> {
    const run = await this.readRun(slotId, userId);
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
          const prevRoom = this.getZone(run.zoneId).rooms.find(r => r.id === run.previousRoomId);
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
        await this.persistRun(run, userId);
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
      this.awardXp(run, enemy.maxHp * 2);
      this.triggerQuestsForEvent(run, { type: "enemy_defeat", targetId: encounter.id });
      this.checkObjectives(run, { type: "enemy_defeat", targetId: encounter.id });
      const currentRoom = findRoomContaining(this.getZone(run.zoneId), run.posX, run.posY);
      if (currentRoom) this.applyRoomEffects(run, currentRoom);
      run.log = pushLog(run.log, parts.join(" "));
      this.touch(run);
      await this.persistRun(run, userId);
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
    // Don't persist on defeat — DB retains last alive state so Load Latest can restore it
    if (run.status !== "defeat") {
      this.touch(run);
      await this.persistRun(run, userId);
    }
    return { run, message: parts.join(" ") };
  }

  async useItem(slotId: string, itemId: string, userId: string): Promise<RunEnvelope> {
    const run = await this.readRun(slotId, userId);
    const message = this.consumeItem(run, itemId);
    this.touch(run);
    await this.persistRun(run, userId);
    return { run, message };
  }

  async equipItem(slotId: string, itemId: string, userId: string): Promise<RunEnvelope> {
    const run = await this.readRun(slotId, userId);
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
    await this.persistRun(run, userId);
    return { run, message };
  }

  async saveRun(slotId: string, userId: string): Promise<RunEnvelope> {
    const run = await this.readRun(slotId, userId);
    if (run.mode === "combat") {
      return { run, message: "Cannot save during combat." };
    }
    // Copy the current auto-save state into checkpoint_json
    await this.sql`
      UPDATE runs SET checkpoint_json = json WHERE slot_id = ${slotId} AND user_id = ${userId}
    `;
    return { run, message: "Progress saved." };
  }

  // ── Interact ─────────────────────────────────────────────────────────────

  async interact(slotId: string, userId: string): Promise<InteractResult> {
    const run = await this.readRun(slotId, userId);
    if (run.mode === "combat") {
      return { run, kind: "none", message: "Finish the fight first." };
    }

    const zone = this.getZone(run.zoneId);
    const room = findRoomContaining(zone, run.posX, run.posY);
    if (!room) {
      return { run, kind: "none", message: "Nothing to interact with here." };
    }

    if (room.npcId) {
      const npc = this.npcs.get(room.npcId);
      if (!npc) return { run, kind: "none", message: "Nothing to interact with here." };
      return {
        run,
        kind:       "npc",
        npcId:      npc.id,
        npcName:    npc.name,
        npcRole:    npc.role,
        npcPortrait: npc.portraitAssetId,
        lines:      npc.dialogue
      };
    }

    if (room.terminalId) {
      const terminal = this.terminals.get(room.terminalId);
      if (!terminal) return { run, kind: "none", message: "Nothing to interact with here." };

      const firstTime = !run.interactedTerminalIds.includes(terminal.id);
      if (firstTime) {
        run.interactedTerminalIds = unique([...run.interactedTerminalIds, terminal.id]);
        if (terminal.xpReward) {
          this.awardXp(run, terminal.xpReward);
        }
        run.log = pushLog(run.log, `You access the terminal: ${terminal.title}.`);
        this.checkObjectives(run, { type: "terminal_interact", targetId: terminal.id });
        this.touch(run);
        await this.persistRun(run, userId);
      }

      return {
        run,
        kind:          "terminal",
        terminalId:    terminal.id,
        terminalTitle: terminal.title,
        terminalText:  terminal.logText
      };
    }

    return { run, kind: "none", message: "Nothing to interact with here." };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /** Apply room effects. Returns zone-transition message if a zone boundary was crossed, undefined otherwise. */
  private applyRoomEffects(run: RunState, room: ZoneRoom): string | undefined {
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
      return undefined;
    }

    if (room.zoneLink) {
      const link = room.zoneLink;
      const targetZone = this.zones.get(link.toZoneId);
      if (targetZone) {
        const firstTimeInZone = run.zoneId !== link.toZoneId;
        run.zoneId         = link.toZoneId;
        run.posX           = link.entryX;
        run.posY           = link.entryY;
        run.roomId         = link.toRoomId;
        run.previousRoomId = null;
        if (link.facing) run.facing = link.facing;
        if (!run.discoveredRoomIds.includes(link.toRoomId)) {
          run.discoveredRoomIds = [...run.discoveredRoomIds, link.toRoomId];
        }
        const msg = link.transitionText ?? `You pass through the bulkhead into ${targetZone.title}.`;
        run.log = pushLog(run.log, msg);
        if (firstTimeInZone) {
          this.awardXp(run, 25);
          this.deliverMessages(run, { type: "zone_entry", targetId: link.toZoneId });
          this.triggerQuestsForEvent(run, { type: "zone_entry", targetId: link.toZoneId });
        }
        const entryRoom = findRoomContaining(targetZone, link.entryX, link.entryY);
        if (entryRoom) this.applyRoomEffects(run, entryRoom);
        return msg;
      }
    }

    if (room.victory) {
      if (run.zoneId === "zone_sphere_arrival") {
        run.status = "victory";
        run.mode   = "victory";
        run.log = pushLog(run.log, "The tablet opens on an encrypted channel: 'Signal confirmed. You are the first Aligned contact inside the Hollow Star. Stay mobile — extraction is being calculated.' The Sphere stretches around you, vast and alive.");
      } else if (run.player.inventory.includes("signal_core")) {
        run.status = "victory";
        run.mode   = "victory";
        run.log = pushLog(run.log, "The signal core slots into the array. Encrypted carrier tone locks in. Transmission away.");
      } else {
        run.log = pushLog(run.log, "The antenna array is ready but has no signal source. Find the signal core.");
      }
    }

    return undefined;
  }

  /**
   * Award XP and apply any level-ups that result.
   * Level-ups are deferred while in combat — applied when mode returns to explore.
   */
  private awardXp(run: RunState, amount: number): void {
    if (run.player.level >= MAX_LEVEL) return;
    run.player.xp += amount;
    run.log = pushLog(run.log, `+${amount} XP.`);

    while (run.player.level < MAX_LEVEL && run.player.xp >= XP_TABLE[run.player.level]) {
      const gains = ADVANCEMENT_TABLE[run.player.level];
      run.player.xp -= XP_TABLE[run.player.level];
      run.player.level += 1;

      const prevMaxHp = run.player.maxHp;
      run.player.maxHp        += gains.maxHp;
      run.player.baseAttack   += gains.baseAttack;
      run.player.baseDefense  += gains.baseDefense;
      // Scale current HP proportionally
      run.player.hp = Math.round((run.player.hp / prevMaxHp) * run.player.maxHp);
      run.player.xpToNextLevel = XP_TABLE[run.player.level] ?? 0;

      run.log = pushLog(run.log, `LEVEL UP — you are now Level ${run.player.level}. Max HP +${gains.maxHp}, ATK +${gains.baseAttack}, DEF +${gains.baseDefense}.`);
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
    const isNew = !run.player.inventory.includes(itemId);
    if (isNew) {
      run.player.inventory = [...run.player.inventory, itemId];
    }
    run.collectedItemIds = unique([...run.collectedItemIds, itemId]);
    run.log = pushLog(run.log, message);
    if (isNew) {
      this.triggerQuestsForEvent(run, { type: "item_collect", targetId: itemId });
      this.checkObjectives(run, { type: "item_collect", targetId: itemId });
    }
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

  private async readRun(slotId: string, userId: string): Promise<RunState> {
    const rows = await this.sql<Array<{ json: string }>>`
      SELECT json FROM runs WHERE slot_id = ${slotId} AND user_id = ${userId}
    `;
    if (rows.length === 0) throw new Error(`Run '${slotId}' not found.`);
    const run = JSON.parse(rows[0].json) as RunState;
    // Migrate older saves that predate these systems
    run.activeQuests           ??= [];
    run.completedQuestIds      ??= [];
    run.completedQuests        ??= [];
    run.messages               ??= [];
    run.interactedTerminalIds  ??= [];
    return run;
  }

  private async persistRun(run: RunState, userId: string, asCheckpoint = false): Promise<void> {
    const j = JSON.stringify(run);
    await this.sql`
      INSERT INTO runs (slot_id, user_id, json, checkpoint_json, created_at, updated_at)
      VALUES (${run.slotId}, ${userId}, ${j}, ${asCheckpoint ? j : null}, ${run.createdAt}, ${run.updatedAt})
      ON CONFLICT (slot_id) DO UPDATE SET json = EXCLUDED.json, updated_at = EXCLUDED.updated_at, user_id = EXCLUDED.user_id
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

  private async loadZones(): Promise<Map<string, Zone>> {
    const rows = await this.sql<Array<{ json: string }>>`
      SELECT json FROM world_data WHERE kind = 'zone'
    `;
    if (rows.length === 0) throw new Error("No zone found. Run `npm run db:seed`.");
    const map = new Map<string, Zone>();
    for (const row of rows) {
      const z = JSON.parse(row.json) as Zone;
      map.set(z.id, z);
    }
    return map;
  }

  private async loadMap<T>(kind: string): Promise<Map<string, T>> {
    const rows = await this.sql<Array<{ id: string; json: string }>>`
      SELECT id, json FROM world_data WHERE kind = ${kind}
    `;
    return new Map(rows.map((row) => [row.id, JSON.parse(row.json) as T]));
  }

  // ── Message delivery ─────────────────────────────────────────────────────

  async markMessagesRead(slotId: string, userId: string): Promise<RunEnvelope> {
    const run = await this.readRun(slotId, userId);
    let changed = false;
    for (const msg of run.messages) {
      if (!msg.read) { msg.read = true; changed = true; }
    }
    if (changed) {
      this.touch(run);
      await this.persistRun(run, userId);
    }
    return { run };
  }

  private deliverMessages(run: RunState, event: MessageEvent): void {
    for (const [, def] of this.messageDefs) {
      if (run.messages.some(m => m.id === def.id)) continue;
      const t = def.trigger;
      const matches =
        (t.type === "on_start"      && event.type === "game_start") ||
        (t.type === "on_room_entry" && event.type === "room_entry"  && t.targetId === event.targetId) ||
        (t.type === "on_zone_entry" && event.type === "zone_entry"  && t.targetId === event.targetId);
      if (matches) {
        const msg: TabletMessage = {
          id:        def.id,
          sender:    def.sender,
          subject:   def.subject,
          body:      def.body,
          timestamp: def.timestamp,
          read:      false
        };
        run.messages = [...run.messages, msg];
        run.log = pushLog(run.log, `New message from ${def.sender}: "${def.subject}". [Open Tablet → Messages]`);
      }
    }
  }

  // ── Quest engine ─────────────────────────────────────────────────────────

  private triggerQuestsForEvent(run: RunState, event: QuestEvent): void {
    for (const [, def] of this.quests) {
      if (run.activeQuests.some(q => q.id === def.id) || run.completedQuestIds.includes(def.id)) continue;
      const t = def.trigger;
      const matches =
        (t.type === "on_start"        && event.type === "game_start") ||
        (t.type === "on_room_entry"   && event.type === "room_entry"   && t.targetId === event.targetId) ||
        (t.type === "on_item_collect" && event.type === "item_collect" && t.targetId === event.targetId) ||
        (t.type === "on_enemy_defeat" && event.type === "enemy_defeat" && t.targetId === event.targetId) ||
      (t.type === "on_zone_entry"   && event.type === "zone_entry"   && t.targetId === event.targetId);
      if (matches) this.startQuest(run, def.id);
    }
  }

  private startQuest(run: RunState, questId: string): void {
    if (run.activeQuests.some(q => q.id === questId) || run.completedQuestIds.includes(questId)) return;
    const def = this.quests.get(questId);
    if (!def) return;
    const quest: Quest = {
      id:           def.id,
      title:        def.title,
      description:  def.description,
      status:       "active",
      objectives:   def.objectives.map(o => ({ ...o, completed: false })),
      xpReward:     def.xpReward,
      creditReward: def.creditReward
    };
    run.activeQuests = [...run.activeQuests, quest];
    run.log = pushLog(run.log, `Assignment received: ${def.title}. [Open Tablet → Assignments]`);
  }

  private checkObjectives(run: RunState, event: QuestEvent): void {
    for (const quest of run.activeQuests) {
      if (quest.status !== "active") continue;
      let changed = false;
      for (const obj of quest.objectives) {
        if (obj.completed) continue;
        const matches =
          (obj.type === "reach_room"         && event.type === "room_entry"       && event.targetId === obj.targetId) ||
          (obj.type === "defeat_enemy"       && event.type === "enemy_defeat"     && event.targetId === obj.targetId) ||
          (obj.type === "collect_item"       && event.type === "item_collect"     && event.targetId === obj.targetId) ||
          (obj.type === "interact_terminal"  && event.type === "terminal_interact" && event.targetId === obj.targetId);
        if (matches) {
          obj.completed = true;
          changed = true;
          run.log = pushLog(run.log, `Objective complete: ${obj.description}.`);
        }
      }
      if (changed && quest.objectives.every(o => o.completed)) {
        this.completeQuest(run, quest.id);
      }
    }
  }

  private completeQuest(run: RunState, questId: string): void {
    const idx = run.activeQuests.findIndex(q => q.id === questId);
    if (idx === -1) return;
    const quest = run.activeQuests[idx];
    quest.status = "completed";
    run.activeQuests      = run.activeQuests.filter(q => q.id !== questId);
    run.completedQuestIds = unique([...run.completedQuestIds, questId]);
    run.completedQuests   = [...(run.completedQuests ?? []), quest];
    run.log = pushLog(run.log, `Assignment complete: ${quest.title}.`);
    if (quest.xpReward > 0) this.awardXp(run, quest.xpReward);
    if (quest.creditReward > 0) {
      run.player.credits += quest.creditReward;
      run.log = pushLog(run.log, `+${quest.creditReward} credits.`);
    }
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

type QuestEvent =
  | { type: "game_start" }
  | { type: "room_entry";        targetId: string }
  | { type: "enemy_defeat";      targetId: string }
  | { type: "item_collect";      targetId: string }
  | { type: "terminal_interact"; targetId: string }
  | { type: "zone_entry";        targetId: string };

type MessageEvent =
  | { type: "game_start" }
  | { type: "room_entry"; targetId: string }
  | { type: "zone_entry"; targetId: string };

function oppositeDirection(direction: Direction): Direction {
  switch (direction) {
    case "north": return "south";
    case "east":  return "west";
    case "south": return "north";
    case "west":  return "east";
  }
}
