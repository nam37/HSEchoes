import type { AssetDef, CombatState, NPC, PropDef, Terminal, ZoneRoom } from "../../../shared/src/index";
import { resolveAssetPath } from "./assets";

export type RoomContentCardKind = "combat" | "npc" | "terminal" | "prop";

export interface RoomContentCard {
  kind: RoomContentCardKind;
  label: string;
  title: string;
  subtitle: string;
  portraitSrc?: string;
  badge?: string;
}

interface BuildRoomContentCardsArgs {
  room: ZoneRoom | null;
  combat: CombatState | null;
  npcMap: Map<string, NPC>;
  terminalMap: Map<string, Terminal>;
  propMap: Map<string, PropDef>;
  assetMap: Map<string, AssetDef>;
}

export function buildRoomContentCards({
  room,
  combat,
  npcMap,
  terminalMap,
  propMap,
  assetMap,
}: BuildRoomContentCardsArgs): RoomContentCard[] {
  const cards: RoomContentCard[] = [];

  if (combat) {
    cards.push({
      kind: "combat",
      label: "Combat Threat",
      title: combat.enemyName,
      subtitle: `${combat.enemyHp}/${combat.enemyMaxHp} HP • Movement locked`,
      badge: "ALRT",
    });
  }

  if (room?.npcId) {
    const npc = npcMap.get(room.npcId);
    if (npc) {
      cards.push({
        kind: "npc",
        label: "Live Contact",
        title: npc.name,
        subtitle: npc.role,
        portraitSrc: resolveAssetPath(npc.portraitAssetId, assetMap),
      });
    }
  }

  if (room?.terminalId) {
    const terminal = terminalMap.get(room.terminalId);
    if (terminal) {
      cards.push({
        kind: "terminal",
        label: "Terminal Link",
        title: terminal.title,
        subtitle: "Station system available for access.",
        badge: "SYS",
      });
    }
  }

  if (room?.prop) {
    const prop = propMap.get(room.prop);
    if (prop) {
      cards.push({
        kind: "prop",
        label: "Room Object",
        title: prop.name,
        subtitle: prop.description ?? "Environmental object detected.",
        portraitSrc: prop.assetId ? resolveAssetPath(prop.assetId, assetMap) : undefined,
        badge: prop.assetId ? undefined : prop.iconLabel ?? "OBJ",
      });
    }
  }

  return cards;
}
