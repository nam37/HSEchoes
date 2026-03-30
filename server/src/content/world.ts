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
  { id: "rusted_blade",   name: "Rusted Blade",   slot: "weapon",    description: "A nicked sword that still bites harder than bare hands.",             iconPath: "/assets/ui/icon-rusted-blade.png", attackBonus: 1 },
  { id: "gate_mail",      name: "Gate Mail",       slot: "armor",     description: "Patchwork chain that turns aside lesser cuts.",                       iconPath: "/assets/ui/icon-gate-mail.png",   defenseBonus: 1 },
  { id: "moon_charm",     name: "Moon Charm",      slot: "accessory", description: "A silver charm that hums near old wards.",                           iconPath: "/assets/ui/icon-moon-charm.png",  defenseBonus: 1, keyItem: true },
  { id: "amber_draught",  name: "Amber Draught",   slot: "consumable",description: "A bitter tonic that restores 4 HP.",                                  iconPath: "/assets/ui/icon-amber-draught.png",healAmount: 4 },
  { id: "starseer_blade", name: "Starseer Blade",  slot: "weapon",    description: "A narrow silvered sword that answers the ward-light with a sharper edge.", iconPath: "/assets/ui/icon-rusted-blade.png", attackBonus: 2 },
  { id: "star_sigil",     name: "Star Sigil",      slot: "accessory", description: "A vault sigil that still glows with captive dawn.",                  iconPath: "/assets/ui/icon-star-sigil.png",  attackBonus: 1, keyItem: true }
];

// ── Enemies ───────────────────────────────────────────────────────────────────

export const enemies: Enemy[] = [
  { id: "rat_scavenger",   name: "Rat Scavenger",   maxHp: 6,  attack: 2, defense: 0, spritePath: "/assets/sprites/rat-scavenger.png",  introLine: "Something small and hungry darts between the broken desks." },
  { id: "drowned_acolyte", name: "Drowned Acolyte", maxHp: 8,  attack: 3, defense: 1, spritePath: "/assets/sprites/drowned-acolyte.png", introLine: "A soaked cultist rises from the black water, chanting through ruined lungs." },
  { id: "ashen_pilgrim",   name: "Ashen Pilgrim",   maxHp: 10, attack: 3, defense: 1, spritePath: "/assets/sprites/drowned-acolyte.png", introLine: "An ash-veiled pilgrim drifts between the old moon wards with a blade of pale light." },
  { id: "bone_sentinel",   name: "Bone Sentinel",   maxHp: 12, attack: 4, defense: 1, spritePath: "/assets/sprites/bone-sentinel.png",  introLine: "A relic guardian unfolds from the dark with a spear of polished bone." }
];

// ── Encounters ────────────────────────────────────────────────────────────────

export const encounters: Encounter[] = [
  { id: "scriptorium_rats",   enemyId: "rat_scavenger",   intro: "Scratching erupts from the shelves as a rat scavenger lunges for your pack.",                  victoryText: "The scavenger collapses in a scatter of quills and dust.",                   defeatText: "You collapse under frantic bites in the dark.",                               canFlee: true,  rewardItemIds: ["amber_draught"],  once: true },
  { id: "flooded_acolyte",    enemyId: "drowned_acolyte", intro: "The water shivers and a drowned acolyte hauls itself upright.",                                 victoryText: "The acolyte sinks apart, leaving a moon charm caught in the reeds.",          defeatText: "The black water closes over your failing torch.",                             canFlee: true,  rewardItemIds: ["moon_charm"],     once: true },
  { id: "astral_pilgrim",     enemyId: "ashen_pilgrim",   intro: "Moon-bleached dust gathers into a pilgrim guardian that raises its silver blade toward you.",   victoryText: "The pilgrim scatters into ash, leaving behind a starseer blade across the stones.", defeatText: "Pale steel carves your lantern shadow from the floor.",                  canFlee: true,  rewardItemIds: ["starseer_blade"], once: true },
  { id: "reliquary_guardian", enemyId: "bone_sentinel",   intro: "A bone sentinel bars the reliquary threshold and lowers its spear.",                             victoryText: "The guardian shatters, revealing the Star Sigil in its ribcage.",            defeatText: "The guardian pins you beneath the old banners.",                              canFlee: false, rewardItemIds: ["star_sigil"],     once: true }
];

// ── Zone: Hollow Star Ruin ────────────────────────────────────────────────────
//
// Grid layout (y increases downward; north = y-1):
//
//  y=0          [star_sanctum   3,0]
//  y=1  [lunar  0,1][astral  1,1][seal   2,1][reliquary 3,1]
//  y=2  [shrine 0,2][flooded 1,2][echo   2,2][banner    3,2]
//  y=3  [scrip  0,3][antecham1,3][armory 2,3]
//  y=4             [gate     1,4]
//
// All rooms are 1×1 for the PoC. Walls are implicit (default).
// Only passable edges are stored.

const WALL  = "/assets/textures/wall-stone.png";
const FLOOR = "/assets/textures/floor-granite.png";
const MOON  = { itemId: "moon_charm", failureText: "The moon ward refuses you without the charm." };

export const hollowStarZone: Zone = {
  id: "zone_hollow_star",
  title: "Hollow Star Ruin",
  gridW: 4,
  gridH: 5,
  rooms: [
    { id: "gate",           x: 1, y: 4, w: 1, h: 1, title: "Hollow Gate",       description: "Rain hisses behind you while a lantern-lit stair sinks into the ruin below.",              wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#141012", discoveryText: "The old gate moans shut behind you." },
    { id: "antechamber",    x: 1, y: 3, w: 1, h: 1, title: "Lantern Antechamber", description: "A square chamber opens ahead, its three passages marked by cracked murals.",            wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#17151a", discoveryText: "Your footsteps stir years of settled ash." },
    { id: "scriptorium",    x: 0, y: 3, w: 1, h: 1, title: "Fallen Scriptorium", description: "Moldering desks and torn vellum fill a side room where the walls sweat ink-black damp.", wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#19141f", discoveryText: "Something skitters under the ruined desks.",      encounterId: "scriptorium_rats" },
    { id: "moon_shrine",    x: 0, y: 2, w: 1, h: 1, title: "Moon Shrine",        description: "An alcove shrine glimmers with old silver dust and a basin of cold wax.",                wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#1b1822", discoveryText: "The shrine answers with a faint lunar hum.",       loot: ["amber_draught"] },
    { id: "armory",         x: 2, y: 3, w: 1, h: 1, title: "Watch Armory",       description: "Collapsed racks lean against the wall beside a suit of chain that somehow escaped the rust.", wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#1a1715", discoveryText: "A steady drip taps on dented helms.", loot: ["gate_mail", "amber_draught"] },
    { id: "flooded_passage",x: 1, y: 2, w: 1, h: 1, title: "Flooded Passage",    description: "Black water laps over the stones and carries chanting from deeper in the dungeon.",     wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#132028", discoveryText: "The water surface dimples as if something just submerged.", encounterId: "flooded_acolyte" },
    { id: "echo_bridge",    x: 2, y: 2, w: 1, h: 1, title: "Echo Bridge",        description: "A narrow bridge spans a lightless shaft where distant voices answer your breath.",      wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#10161f", discoveryText: "The bridge stones vibrate with low music." },
    { id: "banner_hall",    x: 3, y: 2, w: 1, h: 1, title: "Banner Hall",        description: "Threadbare war banners shiver in a breathless hall leading toward the inner vault.",   wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#1a1112", discoveryText: "A spear haft knocks softly somewhere ahead." },
    { id: "lunar_archive",  x: 0, y: 1, w: 1, h: 1, title: "Lunar Archive",      description: "Silver leaf hangs from cracked shelves where observant monks once charted the tides of starlight.", wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#152030", discoveryText: "Dusty constellations flare across the archive walls.", loot: ["amber_draught"] },
    { id: "astral_gallery", x: 1, y: 1, w: 1, h: 1, title: "Astral Gallery",     description: "A crescent gallery overlooks the shaft below, its guard niches painted with flaking moons.", wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#102033", discoveryText: "Powdered ash swirls into the outline of a waiting figure.", encounterId: "astral_pilgrim" },
    { id: "seal_niche",     x: 2, y: 1, w: 1, h: 1, title: "Seal Niche",         description: "A tiny chapel recess shelters an extinguished brazier and a chest of untouched campaign tonics.", wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#151a2a", discoveryText: "The cold brazier briefly reflects your lantern like a second star.", loot: ["amber_draught"], prop: "brazier" },
    { id: "reliquary",      x: 3, y: 1, w: 1, h: 1, title: "Broken Reliquary",   description: "A shattered reliquary stands open beneath a cold beam of starlight from the ceiling crack above.", wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#0e1628", discoveryText: "The air tightens as an ancient oath wakes.", encounterId: "reliquary_guardian" },
    { id: "star_sanctum",   x: 3, y: 0, w: 1, h: 1, title: "Star Sanctum",       description: "A circular sanctum surrounds a dormant astrolabe altar waiting for its lost sigil.", wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#101a30", discoveryText: "The altar's grooves flare at your approach.", victory: true }
  ],
  edges: [
    // ── Open passages ─────────────────────────────────────────────────────────
    // antechamber(1,3) <-> gate(1,4):       h edge at (1,3)  type:gate (the entry gate)
    { x: 1, y: 3, dir: "h", type: "gate" },
    // scriptorium(0,3) <-> antechamber(1,3): v edge at (0,3)
    { x: 0, y: 3, dir: "v", type: "open" },
    // antechamber(1,3) <-> armory(2,3):     v edge at (1,3)
    { x: 1, y: 3, dir: "v", type: "open" },
    // antechamber(1,3) <-> flooded(1,2):    h edge at (1,2)
    { x: 1, y: 2, dir: "h", type: "open" },
    // scriptorium(0,3) <-> shrine(0,2):     h edge at (0,2)
    { x: 0, y: 2, dir: "h", type: "open" },
    // flooded(1,2) <-> echo(2,2):           v edge at (1,2)
    { x: 1, y: 2, dir: "v", type: "open" },
    // echo(2,2) <-> banner(3,2):            v edge at (2,2)
    { x: 2, y: 2, dir: "v", type: "open" },
    // echo(2,2) <-> seal_niche(2,1):        h edge at (2,1)
    { x: 2, y: 1, dir: "h", type: "open" },
    // lunar(0,1) <-> astral(1,1):           v edge at (0,1)
    { x: 0, y: 1, dir: "v", type: "open" },
    // astral(1,1) <-> seal(2,1):            v edge at (1,1)
    { x: 1, y: 1, dir: "v", type: "open" },
    // reliquary(3,1) <-> star_sanctum(3,0): h edge at (3,0)
    { x: 3, y: 0, dir: "h", type: "open" },
    // ── Moon-ward doors ───────────────────────────────────────────────────────
    // shrine(0,2) <-> lunar(0,1):           h edge at (0,1)  locked: moon_charm
    { x: 0, y: 1, dir: "h", type: "door", requirement: MOON },
    // flooded(1,2) <-> astral(1,1):         h edge at (1,1)  locked: moon_charm
    { x: 1, y: 1, dir: "h", type: "door", requirement: MOON },
    // banner(3,2) <-> reliquary(3,1):       h edge at (3,1)  locked: moon_charm
    { x: 3, y: 1, dir: "h", type: "door", requirement: MOON }
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
  intro: "Descend beneath the Hollow Gate, recover the Star Sigil, and silence the ruin before dawn.",
  startX: 1,
  startY: 4,
  zone: hollowStarZone,
  items,
  enemies,
  encounters,
  assets: assetManifest
};
