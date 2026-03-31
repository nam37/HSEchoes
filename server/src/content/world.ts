import type { AssetManifest, Enemy, Encounter, Item, Zone } from "../../../shared/src/index.js";

// ── Assets ────────────────────────────────────────────────────────────────────

export const assetManifest: AssetManifest = {
  titleSplash:    "/assets/ui/title-splash.png",
  wallTexture:    "/assets/textures/wall-stone.png",
  floorTexture:   "/assets/textures/floor-granite.png",
  gateTexture:    "/assets/textures/gate-iron.png",
  panelTexture:   "/assets/ui/panel-parchment.png",
  enemySprites:   ["/assets/sprites/rat-scavenger.png", "/assets/sprites/drowned-acolyte.png", "/assets/sprites/bone-sentinel.png"],
  itemIcons:      ["/assets/ui/icon-rusted-blade.png", "/assets/ui/icon-gate-mail.png", "/assets/ui/icon-moon-charm.png", "/assets/ui/icon-amber-draught.png", "/assets/ui/icon-star-sigil.png"]
};

// ── Items ─────────────────────────────────────────────────────────────────────

export const items: Item[] = [
  { id: "maintenance_tool", name: "Maintenance Hook",  slot: "weapon",    description: "A heavy-gauge cargo hook repurposed for close-quarters work. Crude, but effective.",          iconPath: "/assets/ui/icon-rusted-blade.png", attackBonus: 1 },
  { id: "impact_plating",   name: "Impact Plating",    slot: "armor",     description: "Salvaged hull-panel sections lashed into a rough vest. Turns aside glancing hits.",           iconPath: "/assets/ui/icon-gate-mail.png",   defenseBonus: 1 },
  { id: "transit_key",      name: "Transit Key",       slot: "accessory", description: "A magnetic access fob that unlocks sealed bulkhead passages in this sector.",               iconPath: "/assets/ui/icon-moon-charm.png",  defenseBonus: 1, keyItem: true },
  { id: "medkit",           name: "Station Medkit",    slot: "consumable", description: "A standard-issue field kit. Restores 4 HP.",                                                iconPath: "/assets/ui/icon-amber-draught.png", healAmount: 4 },
  { id: "service_blade",    name: "Service Blade",     slot: "weapon",    description: "A cutting tool from the maintenance lockers, sharpened to an edge that means business.",     iconPath: "/assets/ui/icon-rusted-blade.png", attackBonus: 2 },
  { id: "signal_core",      name: "Signal Core",       slot: "accessory", description: "A compact relay unit still broadcasting on an encrypted Aligned frequency.",                iconPath: "/assets/ui/icon-star-sigil.png",  attackBonus: 1, keyItem: true }
];

// ── Enemies ───────────────────────────────────────────────────────────────────

export const enemies: Enemy[] = [
  { id: "rat_scavenger",   name: "Vermin Cluster",      maxHp: 6,  attack: 2, defense: 0, spritePath: "/assets/sprites/rat-scavenger.png",  introLine: "Something small and fast skitters out of the broken storage racks." },
  { id: "drowned_acolyte", name: "Corroded Unit",       maxHp: 8,  attack: 3, defense: 1, spritePath: "/assets/sprites/drowned-acolyte.png", introLine: "A malfunctioning maintenance drone drags itself upright from the flooded deck." },
  { id: "ashen_pilgrim",   name: "Station Drifter",     maxHp: 10, attack: 3, defense: 1, spritePath: "/assets/sprites/drowned-acolyte.png", introLine: "A figure in degraded EVA gear moves between the racks with unsettling purpose." },
  { id: "bone_sentinel",   name: "Security Automaton",  maxHp: 12, attack: 4, defense: 1, spritePath: "/assets/sprites/bone-sentinel.png",  introLine: "An old security unit powers up in the dark, its optical array locking onto you." }
];

// ── Encounters ────────────────────────────────────────────────────────────────

export const encounters: Encounter[] = [
  { id: "scriptorium_rats",   enemyId: "rat_scavenger",   intro: "A cluster of station vermin erupts from behind the toppled storage units, going straight for your pack.",                         victoryText: "They scatter back into the conduit gaps. Something small rolls out of the wreckage.",         defeatText: "They overwhelm you in the dark, small claws finding every opening.",                     canFlee: true,  rewardItemIds: ["medkit"],          once: true },
  { id: "flooded_acolyte",    enemyId: "drowned_acolyte", intro: "The coolant surface breaks and a corroded maintenance drone hauls itself upright, actuators grinding.",                            victoryText: "The unit seizes and drops. A transit key bobs to the surface in the slick.",               defeatText: "Coolant floods your helmet seals. The drone's weight holds you down.",                    canFlee: true,  rewardItemIds: ["transit_key"],     once: true },
  { id: "astral_pilgrim",     enemyId: "ashen_pilgrim",   intro: "The drifter spots you from the catwalk and drops down between you and the far corridor, cutting tool raised.",                    victoryText: "They collapse against the railing. A service blade clatters to the grating beside them.", defeatText: "The cutting tool finds the gap between your plates.",                                     canFlee: true,  rewardItemIds: ["service_blade"],   once: true },
  { id: "reliquary_guardian", enemyId: "bone_sentinel",   intro: "The security automaton steps from its alcove and levels a restraint arm across the corridor. It is not asking.",                  victoryText: "It crashes to the deck, housing cracked. The signal core falls from its chassis housing.", defeatText: "The automaton pins you to the bulkhead. Restraint locks engage.",                         canFlee: false, rewardItemIds: ["signal_core"],     once: true }
];

// ── Zone: Station West — Maintenance Ring ─────────────────────────────────────
//
// Grid layout (y increases downward; north = y-1):
//
//  y=0                    [signal_core  3,0]
//  y=1  [nav_records 0,1][obs_mezzanine 1,1][ration_cache 2,1][secure_hold 3,1]
//  y=2  [coolant_alc 0,2][flooded_corr  1,2][cable_gantry 2,2][long_corridor 3,2]
//  y=3  [records_bay 0,3][proc_hub      1,3][equip_locker 2,3]
//  y=4               [maint_airlock 1,4]
//
// All rooms are 1×1. Walls are implicit. Only passable edges are stored.

const WALL  = "/assets/textures/wall-stone.png";
const FLOOR = "/assets/textures/floor-granite.png";
const TKEY  = { itemId: "transit_key", failureText: "The bulkhead panel flashes red. A transit key is required." };

export const hollowStarZone: Zone = {
  id: "zone_hollow_star",
  title: "Station West — Maintenance Ring",
  gridW: 4,
  gridH: 5,
  rooms: [
    { id: "gate",           x: 1, y: 4, w: 1, h: 1, title: "Maintenance Airlock",    description: "Worn decking and stenciled hazard lines lead down into the station's lower maintenance ring. The outer seal has not opened in years.",                                     wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#141012", discoveryText: "The airlock cycles behind you with a tired hiss." },
    { id: "antechamber",    x: 1, y: 3, w: 1, h: 1, title: "Processing Hub",         description: "A wide junction lined with dark monitors and branching conduits. Three passages lead deeper into the maintenance ring.",                                                    wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#17151a", discoveryText: "Your footsteps ring off the deck plating." },
    { id: "scriptorium",    x: 0, y: 3, w: 1, h: 1, title: "Records Bay",            description: "Shelves of outdated storage cores lean against walls slick with coolant seepage. Half the ceiling panels have buckled.",                                                    wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#19141f", discoveryText: "Something shifts behind the fallen rack.",        encounterId: "scriptorium_rats" },
    { id: "moon_shrine",    x: 0, y: 2, w: 1, h: 1, title: "Coolant Alcove",         description: "A recessed alcove beside a sealed duct junction. Emergency supply shelving still holds a few kits behind a cracked safety panel.",                                          wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#1b1822", discoveryText: "The alcove hums faintly from residual coolant flow.", loot: ["medkit"] },
    { id: "armory",         x: 2, y: 3, w: 1, h: 1, title: "Equipment Locker",       description: "Collapsed racks and dented lockers. A suit of salvaged impact plating survived the neglect, still hanging on its pegs.",                                                   wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#1a1715", discoveryText: "A steady drip taps on dented plating.",            loot: ["impact_plating", "medkit"] },
    { id: "flooded_passage",x: 1, y: 2, w: 1, h: 1, title: "Flooded Service Corridor", description: "Dark coolant has pooled across the deck to ankle depth. The lights are dead. Something beneath the surface disturbs the liquid.",                                       wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#132028", discoveryText: "The coolant surface breaks in a slow, spreading ripple.", encounterId: "flooded_acolyte" },
    { id: "echo_bridge",    x: 2, y: 2, w: 1, h: 1, title: "Cable Gantry",           description: "A narrow walkway crosses a vertical service shaft. The station's vent system carries fragmented audio up from decks below — voices, or interference, it is hard to say.", wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#10161f", discoveryText: "The gantry grating vibrates with low-frequency hum." },
    { id: "banner_hall",    x: 3, y: 2, w: 1, h: 1, title: "Long Corridor",          description: "A stripped thoroughfare, everything removable long since stripped by whoever was here last. At the far end, a sealed bulkhead.",                                          wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#1a1112", discoveryText: "Your footfalls carry a long way in the silence." },
    { id: "lunar_archive",  x: 0, y: 1, w: 1, h: 1, title: "Navigation Records Room", description: "Rows of outdated star charts and crew manifests, all obsolete. The data cores are dead but the shelves are structurally intact and one kit remains.",                  wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#152030", discoveryText: "Dust drifts from the shelves as you enter.",         loot: ["medkit"] },
    { id: "astral_gallery", x: 1, y: 1, w: 1, h: 1, title: "Observation Mezzanine", description: "A mezzanine catwalk overlooks the service shaft below, its guard rails bent outward. The upper racks hold shadows that shift.",                                            wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#102033", discoveryText: "Movement registers in the high shadows above the railing.", encounterId: "astral_pilgrim" },
    { id: "seal_niche",     x: 2, y: 1, w: 1, h: 1, title: "Ration Cache",           description: "A small recess shelters a locker of emergency rations, sealed against the station's recycled air. The lock is corroded but yields.",                                      wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#151a2a", discoveryText: "The locker seal breaks with a sharp crack.",          loot: ["medkit"], prop: "brazier" },
    { id: "reliquary",      x: 3, y: 1, w: 1, h: 1, title: "Secure Cargo Hold",      description: "A reinforced hold, its blast door wrenched aside from the inside. Equipment manifests are pinned to the walls, most items checked off against a long absence.",            wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#0e1628", discoveryText: "A power-on cycle spins up somewhere in the dark.",     encounterId: "reliquary_guardian" },
    { id: "star_sanctum",   x: 3, y: 0, w: 1, h: 1, title: "Signal Core Chamber",    description: "A circular chamber houses a derelict antenna array, its dish angled toward a fixed point in the dark beyond the station hull. The relay equipment is intact.",             wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#101a30", discoveryText: "The array indicators flicker green as you approach.", victory: true }
  ],
  edges: [
    // ── Open passages ─────────────────────────────────────────────────────────
    // airlock(1,4) <-> hub(1,3):           h edge at (1,3) type:gate
    { x: 1, y: 3, dir: "h", type: "gate" },
    // records_bay(0,3) <-> hub(1,3):       v edge at (0,3)
    { x: 0, y: 3, dir: "v", type: "open" },
    // hub(1,3) <-> equip_locker(2,3):      v edge at (1,3)
    { x: 1, y: 3, dir: "v", type: "open" },
    // hub(1,3) <-> flooded(1,2):           h edge at (1,2)
    { x: 1, y: 2, dir: "h", type: "open" },
    // records_bay(0,3) <-> coolant(0,2):   h edge at (0,2)
    { x: 0, y: 2, dir: "h", type: "open" },
    // flooded(1,2) <-> gantry(2,2):        v edge at (1,2)
    { x: 1, y: 2, dir: "v", type: "open" },
    // gantry(2,2) <-> long_corridor(3,2):  v edge at (2,2)
    { x: 2, y: 2, dir: "v", type: "open" },
    // gantry(2,2) <-> ration_cache(2,1):   h edge at (2,1)
    { x: 2, y: 1, dir: "h", type: "open" },
    // nav_records(0,1) <-> obs_mezz(1,1):  v edge at (0,1)
    { x: 0, y: 1, dir: "v", type: "open" },
    // obs_mezz(1,1) <-> ration_cache(2,1): v edge at (1,1)
    { x: 1, y: 1, dir: "v", type: "open" },
    // secure_hold(3,1) <-> signal_core(3,0): h edge at (3,0)
    { x: 3, y: 0, dir: "h", type: "open" },
    // ── Transit-key bulkheads ─────────────────────────────────────────────────
    // coolant(0,2) <-> nav_records(0,1):   h edge at (0,1) locked: transit_key
    { x: 0, y: 1, dir: "h", type: "door", requirement: TKEY },
    // flooded(1,2) <-> obs_mezz(1,1):      h edge at (1,1) locked: transit_key
    { x: 1, y: 1, dir: "h", type: "door", requirement: TKEY },
    // long_corridor(3,2) <-> secure_hold(3,1): h edge at (3,1) locked: transit_key
    { x: 3, y: 1, dir: "h", type: "door", requirement: TKEY }
  ]
};

export interface WorldSeed {
  title: string;
  intro: string;
  startX: number;
  startY: number;
  zone: Zone;
  items: Item[];
  enemies: Enemy[];
  encounters: Encounter[];
  assets: AssetManifest;
}

export const worldSeed: WorldSeed = {
  title: "Echoes of the Hollow Star",
  intro: "Navigate the station's maintenance ring, reach the signal core, and get a transmission out before the sector goes dark.",
  startX: 1,
  startY: 4,
  zone: hollowStarZone,
  items,
  enemies,
  encounters,
  assets: assetManifest
};
