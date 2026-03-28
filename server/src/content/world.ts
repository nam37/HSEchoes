import type { AssetManifest, BootstrapData, CellFace, Direction, DungeonCell, Enemy, Encounter, Item } from "../../../shared/src/index.js";

export interface WorldSeed {
  title: string;
  intro: string;
  startCellId: string;
  assets: AssetManifest;
  cells: DungeonCell[];
  enemies: Enemy[];
  encounters: Encounter[];
  items: Item[];
}

export const assetManifest: AssetManifest = {
  titleSplash: "/assets/ui/title-splash.png",
  wallTexture: "/assets/textures/wall-stone.png",
  floorTexture: "/assets/textures/floor-granite.png",
  gateTexture: "/assets/textures/gate-iron.png",
  panelTexture: "/assets/ui/panel-parchment.png",
  enemySprites: [
    "/assets/sprites/rat-scavenger.png",
    "/assets/sprites/drowned-acolyte.png",
    "/assets/sprites/bone-sentinel.png"
  ],
  itemIcons: [
    "/assets/ui/icon-rusted-blade.png",
    "/assets/ui/icon-gate-mail.png",
    "/assets/ui/icon-moon-charm.png",
    "/assets/ui/icon-amber-draught.png",
    "/assets/ui/icon-star-sigil.png"
  ]
};

const wall = assetManifest.wallTexture;
const floor = assetManifest.floorTexture;

function sides(north: CellFace, east: CellFace, south: CellFace, west: CellFace): Record<Direction, CellFace> {
  return {
    north,
    east,
    south,
    west
  };
}

export const items: Item[] = [
  {
    id: "rusted_blade",
    name: "Rusted Blade",
    slot: "weapon",
    description: "A nicked sword that still bites harder than bare hands.",
    iconPath: "/assets/ui/icon-rusted-blade.png",
    attackBonus: 1
  },
  {
    id: "gate_mail",
    name: "Gate Mail",
    slot: "armor",
    description: "Patchwork chain that turns aside lesser cuts.",
    iconPath: "/assets/ui/icon-gate-mail.png",
    defenseBonus: 1
  },
  {
    id: "moon_charm",
    name: "Moon Charm",
    slot: "accessory",
    description: "A silver charm that hums near old wards.",
    iconPath: "/assets/ui/icon-moon-charm.png",
    defenseBonus: 1,
    keyItem: true
  },
  {
    id: "amber_draught",
    name: "Amber Draught",
    slot: "consumable",
    description: "A bitter tonic that restores 4 HP.",
    iconPath: "/assets/ui/icon-amber-draught.png",
    healAmount: 4
  },
  {
    id: "starseer_blade",
    name: "Starseer Blade",
    slot: "weapon",
    description: "A narrow silvered sword that answers the ward-light with a sharper edge.",
    iconPath: "/assets/ui/icon-rusted-blade.png",
    attackBonus: 2
  },
  {
    id: "star_sigil",
    name: "Star Sigil",
    slot: "accessory",
    description: "A vault sigil that still glows with captive dawn.",
    iconPath: "/assets/ui/icon-star-sigil.png",
    attackBonus: 1,
    keyItem: true
  }
];

export const enemies: Enemy[] = [
  {
    id: "rat_scavenger",
    name: "Rat Scavenger",
    maxHp: 6,
    attack: 2,
    defense: 0,
    spritePath: "/assets/sprites/rat-scavenger.png",
    introLine: "Something small and hungry darts between the broken desks."
  },
  {
    id: "drowned_acolyte",
    name: "Drowned Acolyte",
    maxHp: 8,
    attack: 3,
    defense: 1,
    spritePath: "/assets/sprites/drowned-acolyte.png",
    introLine: "A soaked cultist rises from the black water, chanting through ruined lungs."
  },
  {
    id: "ashen_pilgrim",
    name: "Ashen Pilgrim",
    maxHp: 10,
    attack: 3,
    defense: 1,
    spritePath: "/assets/sprites/drowned-acolyte.png",
    introLine: "An ash-veiled pilgrim drifts between the old moon wards with a blade of pale light."
  },
  {
    id: "bone_sentinel",
    name: "Bone Sentinel",
    maxHp: 12,
    attack: 4,
    defense: 1,
    spritePath: "/assets/sprites/bone-sentinel.png",
    introLine: "A relic guardian unfolds from the dark with a spear of polished bone."
  }
];

export const encounters: Encounter[] = [
  {
    id: "scriptorium_rats",
    enemyId: "rat_scavenger",
    intro: "Scratching erupts from the shelves as a rat scavenger lunges for your pack.",
    victoryText: "The scavenger collapses in a scatter of quills and dust.",
    defeatText: "You collapse under frantic bites in the dark.",
    canFlee: true,
    rewardItemIds: ["amber_draught"],
    once: true
  },
  {
    id: "flooded_acolyte",
    enemyId: "drowned_acolyte",
    intro: "The water shivers and a drowned acolyte hauls itself upright.",
    victoryText: "The acolyte sinks apart, leaving a moon charm caught in the reeds.",
    defeatText: "The black water closes over your failing torch.",
    canFlee: true,
    rewardItemIds: ["moon_charm"],
    once: true
  },
  {
    id: "astral_pilgrim",
    enemyId: "ashen_pilgrim",
    intro: "Moon-bleached dust gathers into a pilgrim guardian that raises its silver blade toward you.",
    victoryText: "The pilgrim scatters into ash, leaving behind a starseer blade across the stones.",
    defeatText: "Pale steel carves your lantern shadow from the floor.",
    canFlee: true,
    rewardItemIds: ["starseer_blade"],
    once: true
  },
  {
    id: "reliquary_guardian",
    enemyId: "bone_sentinel",
    intro: "A bone sentinel bars the reliquary threshold and lowers its spear.",
    victoryText: "The guardian shatters, revealing the Star Sigil in its ribcage.",
    defeatText: "The guardian pins you beneath the old banners.",
    canFlee: false,
    rewardItemIds: ["star_sigil"],
    once: true
  }
];

export const cells: DungeonCell[] = [
  {
    id: "gate",
    title: "Hollow Gate",
    description: "Rain hisses behind you while a lantern-lit stair sinks into the ruin below.",
    x: 1,
    y: 2,
    sides: sides("gate", "wall", "wall", "wall"),
    wallTexture: wall,
    floorTexture: floor,
    ceilingColor: "#141012",
    discoveryText: "The old gate moans shut behind you."
  },
  {
    id: "antechamber",
    title: "Lantern Antechamber",
    description: "A square chamber opens ahead, its three passages marked by cracked murals.",
    x: 1,
    y: 1,
    sides: sides("open", "open", "gate", "open"),
    wallTexture: wall,
    floorTexture: floor,
    ceilingColor: "#17151a",
    discoveryText: "Your footsteps stir years of settled ash."
  },
  {
    id: "scriptorium",
    title: "Fallen Scriptorium",
    description: "Moldering desks and torn vellum fill a side room where the walls sweat ink-black damp.",
    x: 0,
    y: 1,
    sides: sides("open", "open", "wall", "wall"),
    wallTexture: wall,
    floorTexture: floor,
    ceilingColor: "#19141f",
    encounterId: "scriptorium_rats",
    discoveryText: "Something skitters under the ruined desks."
  },
  {
    id: "moon_shrine",
    title: "Moon Shrine",
    description: "An alcove shrine glimmers with old silver dust and a basin of cold wax.",
    x: 0,
    y: 0,
    sides: sides("door", "wall", "open", "wall"),
    passageRequirements: {
      north: {
        itemId: "moon_charm",
        failureText: "The shrine door rejects you without the moon charm."
      }
    },
    wallTexture: wall,
    floorTexture: floor,
    ceilingColor: "#1b1822",
    loot: ["amber_draught"],
    discoveryText: "The shrine answers with a faint lunar hum."
  },
  {
    id: "armory",
    title: "Watch Armory",
    description: "Collapsed racks lean against the wall beside a suit of chain that somehow escaped the rust.",
    x: 2,
    y: 1,
    sides: sides("open", "wall", "wall", "open"),
    wallTexture: wall,
    floorTexture: floor,
    ceilingColor: "#1a1715",
    loot: ["gate_mail", "amber_draught"],
    discoveryText: "A steady drip taps on dented helms."
  },
  {
    id: "flooded_passage",
    title: "Flooded Passage",
    description: "Black water laps over the stones and carries chanting from deeper in the dungeon.",
    x: 1,
    y: 0,
    sides: sides("door", "open", "open", "wall"),
    passageRequirements: {
      north: {
        itemId: "moon_charm",
        failureText: "Silver warding bars the upper gallery until the moon charm answers."
      }
    },
    wallTexture: wall,
    floorTexture: floor,
    ceilingColor: "#132028",
    encounterId: "flooded_acolyte",
    discoveryText: "The water surface dimples as if something just submerged."
  },
  {
    id: "echo_bridge",
    title: "Echo Bridge",
    description: "A narrow bridge spans a lightless shaft where distant voices answer your breath.",
    x: 2,
    y: 0,
    sides: sides("open", "open", "wall", "open"),
    wallTexture: wall,
    floorTexture: floor,
    ceilingColor: "#10161f",
    discoveryText: "The bridge stones vibrate with low music."
  },
  {
    id: "banner_hall",
    title: "Banner Hall",
    description: "Threadbare war banners shiver in a breathless hall leading toward the inner vault.",
    x: 3,
    y: 0,
    sides: sides("door", "wall", "wall", "open"),
    passageRequirements: {
      north: {
        itemId: "moon_charm",
        failureText: "A moon-stamped ward seals the reliquary stair."
      }
    },
    wallTexture: wall,
    floorTexture: floor,
    ceilingColor: "#1a1112",
    discoveryText: "A spear haft knocks softly somewhere ahead."
  },
  {
    id: "lunar_archive",
    title: "Lunar Archive",
    description: "Silver leaf hangs from cracked shelves where observant monks once charted the tides of starlight.",
    x: 0,
    y: -1,
    sides: sides("wall", "open", "door", "wall"),
    passageRequirements: {
      south: {
        itemId: "moon_charm",
        failureText: "The shrine door will not yield until the moon charm is raised again."
      }
    },
    wallTexture: wall,
    floorTexture: floor,
    ceilingColor: "#152030",
    loot: ["amber_draught"],
    discoveryText: "Dusty constellations flare across the archive walls."
  },
  {
    id: "astral_gallery",
    title: "Astral Gallery",
    description: "A crescent gallery overlooks the shaft below, its guard niches painted with flaking moons.",
    x: 1,
    y: -1,
    sides: sides("wall", "open", "door", "open"),
    passageRequirements: {
      south: {
        itemId: "moon_charm",
        failureText: "The silver wards hum and refuse to part without the moon charm."
      }
    },
    wallTexture: wall,
    floorTexture: floor,
    ceilingColor: "#102033",
    encounterId: "astral_pilgrim",
    discoveryText: "Powdered ash swirls into the outline of a waiting figure."
  },
  {
    id: "seal_niche",
    title: "Seal Niche",
    description: "A tiny chapel recess shelters an extinguished brazier and a chest of untouched campaign tonics.",
    x: 2,
    y: -1,
    sides: sides("wall", "wall", "open", "open"),
    wallTexture: wall,
    floorTexture: floor,
    ceilingColor: "#151a2a",
    loot: ["amber_draught"],
    prop: "brazier",
    discoveryText: "The cold brazier briefly reflects your lantern like a second star."
  },
  {
    id: "reliquary",
    title: "Broken Reliquary",
    description: "A shattered reliquary stands open beneath a cold beam of starlight from the ceiling crack above.",
    x: 3,
    y: -1,
    sides: sides("open", "wall", "door", "wall"),
    passageRequirements: {
      south: {
        itemId: "moon_charm",
        failureText: "The moon ward clenches around the stair until the charm answers it."
      }
    },
    wallTexture: wall,
    floorTexture: floor,
    ceilingColor: "#0e1628",
    encounterId: "reliquary_guardian",
    discoveryText: "The air tightens as an ancient oath wakes."
  },
  {
    id: "star_sanctum",
    title: "Star Sanctum",
    description: "A circular sanctum surrounds a dormant astrolabe altar waiting for its lost sigil.",
    x: 3,
    y: -2,
    sides: sides("wall", "wall", "open", "wall"),
    wallTexture: wall,
    floorTexture: floor,
    ceilingColor: "#101a30",
    victory: true,
    discoveryText: "The altar's grooves flare at your approach."
  }
];

export const worldSeed: WorldSeed = {
  title: "Echoes of the Hollow Star",
  intro: "Descend beneath the Hollow Gate, recover the Star Sigil, and silence the ruin before dawn.",
  startCellId: "gate",
  assets: assetManifest,
  cells,
  enemies,
  encounters,
  items
};

export function toBootstrapData(saves: BootstrapData["saves"]): BootstrapData {
  return {
    title: worldSeed.title,
    intro: worldSeed.intro,
    startCellId: worldSeed.startCellId,
    cells: worldSeed.cells,
    enemies: worldSeed.enemies,
    encounters: worldSeed.encounters,
    items: worldSeed.items,
    assets: worldSeed.assets,
    saves
  };
}
