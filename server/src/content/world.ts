import { normalizeZoneSurfaces } from "../../../shared/src/index.js";
import type { AssetManifest, Enemy, Encounter, Item, MessageDef, NPC, QuestDef, Terminal, Zone, ZoneInput } from "../../../shared/src/index.js";

// ── Assets ────────────────────────────────────────────────────────────────────

export const assetManifest: AssetManifest = {
  titleSplash:    "/assets/ui/title-splash.png",
  wallTexture:    "/assets/textures/wall-maintenance-a.png",
  floorTexture:   "/assets/textures/floor-station-a.png",
  gateTexture:    "/assets/textures/gate-iron.png",
  panelTexture:   "/assets/ui/panel-parchment.png",
  enemySprites:   ["/assets/sprites/rat-scavenger.png", "/assets/sprites/drowned-acolyte.png", "/assets/sprites/bone-sentinel.png"],
  itemIcons:      ["/assets/ui/icon-rusted-blade.png", "/assets/ui/icon-gate-mail.png", "/assets/ui/icon-moon-charm.png", "/assets/ui/icon-amber-draught.png", "/assets/ui/icon-star-sigil.png"]
};

const WALL_MAINT_A = "/assets/textures/wall-maintenance-a.png";
const WALL_MAINT_B = "/assets/textures/wall-maintenance-b.png";
const FLOOR_STATION_A = "/assets/textures/floor-station-a.png";
const CEILING_STATION_A = "/assets/textures/ceiling-station-a.png";

const WEST_SURFACES: Zone["surfaceDefaults"] = {
  wallTexture: WALL_MAINT_A,
  floorTexture: FLOOR_STATION_A,
  ceilingTexture: CEILING_STATION_A,
  ceilingColor: "#17151a",
};

const INDUSTRIAL_SURFACES: Zone["surfaceDefaults"] = {
  wallTexture: WALL_MAINT_B,
  floorTexture: FLOOR_STATION_A,
  ceilingTexture: CEILING_STATION_A,
  ceilingColor: "#161318",
};

const EAST_SURFACES: Zone["surfaceDefaults"] = {
  wallTexture: WALL_MAINT_B,
  floorTexture: FLOOR_STATION_A,
  ceilingTexture: CEILING_STATION_A,
  ceilingColor: "#1d1010",
};

const SHIP_SURFACES: Zone["surfaceDefaults"] = {
  wallTexture: WALL_MAINT_B,
  floorTexture: FLOOR_STATION_A,
  ceilingTexture: CEILING_STATION_A,
  ceilingColor: "#0d1b20",
};

const SPHERE_SURFACES: Zone["surfaceDefaults"] = {
  wallTexture: WALL_MAINT_A,
  floorTexture: FLOOR_STATION_A,
  ceilingTexture: CEILING_STATION_A,
  ceilingColor: "#0d1c2a",
};

function defineZone(zone: ZoneInput): Zone {
  return normalizeZoneSurfaces(zone, assetManifest);
}

// ── Items ─────────────────────────────────────────────────────────────────────

export const items: Item[] = [
  { id: "maintenance_tool", name: "Maintenance Hook",  slot: "weapon",    description: "A heavy-gauge cargo hook repurposed for close-quarters work. Crude, but effective.",          iconPath: "/assets/ui/icon-rusted-blade.png", attackBonus: 1 },
  { id: "impact_plating",   name: "Impact Plating",    slot: "armor",     description: "Salvaged hull-panel sections lashed into a rough vest. Turns aside glancing hits.",           iconPath: "/assets/ui/icon-gate-mail.png",   defenseBonus: 1 },
  { id: "transit_key",      name: "Transit Key",       slot: "accessory", description: "A magnetic access fob that unlocks sealed bulkhead passages in this sector.",               iconPath: "/assets/ui/icon-moon-charm.png",  defenseBonus: 1, keyItem: true },
  { id: "medkit",           name: "Station Medkit",    slot: "consumable", description: "A standard-issue field kit. Restores 4 HP.",                                                iconPath: "/assets/ui/icon-amber-draught.png", healAmount: 4 },
  { id: "service_blade",    name: "Service Blade",     slot: "weapon",    description: "A cutting tool from the maintenance lockers, sharpened to an edge that means business.",     iconPath: "/assets/ui/icon-rusted-blade.png", attackBonus: 2 },
  { id: "signal_core",      name: "Signal Core",       slot: "accessory", description: "A compact relay unit still broadcasting on an encrypted Aligned frequency.",                iconPath: "/assets/ui/icon-star-sigil.png",  attackBonus: 1, keyItem: true },
  { id: "sphereal_sidearm",     name: "Sphereal Sidearm",      slot: "weapon",    description: "A compact directed-energy weapon recovered from a fallen boarder. The trigger feels strange under your fingers, but the output is unmistakable.", iconPath: "/assets/ui/icon-rusted-blade.png", attackBonus: 3 },
  { id: "neodymium_fragment",   name: "Neodymium Fragment",    slot: "accessory", description: "A dense metallic component stripped from the raider's drive assembly. Something about its composition is unusual — it reads as neodymium on your scanner.", iconPath: "/assets/ui/icon-star-sigil.png", keyItem: true }
];

// ── Enemies ───────────────────────────────────────────────────────────────────

export const enemies: Enemy[] = [
  { id: "rat_scavenger",   name: "Vermin Cluster",      maxHp: 6,  attack: 2, defense: 0, spritePath: "/assets/sprites/rat-scavenger.png",  introLine: "Something small and fast skitters out of the broken storage racks." },
  { id: "drowned_acolyte", name: "Corroded Unit",       maxHp: 8,  attack: 3, defense: 1, spritePath: "/assets/sprites/drowned-acolyte.png", introLine: "A malfunctioning maintenance drone drags itself upright from the flooded deck." },
  { id: "ashen_pilgrim",   name: "Station Drifter",     maxHp: 10, attack: 3, defense: 1, spritePath: "/assets/sprites/drowned-acolyte.png", introLine: "A figure in degraded EVA gear moves between the racks with unsettling purpose." },
  { id: "bone_sentinel",   name: "Security Automaton",  maxHp: 12, attack: 4, defense: 1, spritePath: "/assets/sprites/bone-sentinel.png",  introLine: "An old security unit powers up in the dark, its optical array locking onto you." },
  { id: "feral_service_bot", name: "Feral Service Drone", maxHp: 8,  attack: 3, defense: 1, spritePath: "/assets/sprites/drowned-acolyte.png", introLine: "A maintenance drone lurches out of its charging bay, actuators sparking, operational protocols gone." },
  { id: "sphereal_boarder",  name: "Sphereal Raider",     maxHp: 14, attack: 5, defense: 2, spritePath: "/assets/sprites/bone-sentinel.png",   introLine: "A figure in angular combat plating steps from the shadows. The armour design is unlike anything in Aligned inventory." },
  { id: "sphereal_elite",    name: "Sphereal Combat Unit", maxHp: 18, attack: 6, defense: 3, spritePath: "/assets/sprites/bone-sentinel.png",   introLine: "A heavily armoured figure blocks the passage. Its visor is opaque. It does not speak." }
];

// ── Encounters ────────────────────────────────────────────────────────────────

export const encounters: Encounter[] = [
  { id: "scriptorium_rats",   enemyId: "rat_scavenger",   intro: "A cluster of station vermin erupts from behind the toppled storage units, going straight for your pack.",                         victoryText: "They scatter back into the conduit gaps. Something small rolls out of the wreckage.",         defeatText: "They overwhelm you in the dark, small claws finding every opening.",                     canFlee: true,  rewardItemIds: ["medkit"],          once: true },
  { id: "flooded_acolyte",    enemyId: "drowned_acolyte", intro: "The coolant surface breaks and a corroded maintenance drone hauls itself upright, actuators grinding.",                            victoryText: "The unit seizes and drops. A transit key bobs to the surface in the slick.",               defeatText: "Coolant floods your helmet seals. The drone's weight holds you down.",                    canFlee: true,  rewardItemIds: ["transit_key"],     once: true },
  { id: "astral_pilgrim",     enemyId: "ashen_pilgrim",   intro: "The drifter spots you from the catwalk and drops down between you and the far corridor, cutting tool raised.",                    victoryText: "They collapse against the railing. A service blade clatters to the grating beside them.", defeatText: "The cutting tool finds the gap between your plates.",                                     canFlee: true,  rewardItemIds: ["service_blade"],   once: true },
  { id: "reliquary_guardian", enemyId: "bone_sentinel",   intro: "The security automaton steps from its alcove and levels a restraint arm across the corridor. It is not asking.",                  victoryText: "It crashes to the deck, housing cracked. The signal core falls from its chassis housing.", defeatText: "The automaton pins you to the bulkhead. Restraint locks engage.",                         canFlee: false, rewardItemIds: ["signal_core"],     once: true },
  { id: "ind_bot_encounter",   enemyId: "feral_service_bot", intro: "A maintenance drone detaches from its bay, sparks cascading off its frame. Its pathfinding is erratic but its cutting arm is not.",                                                                                        victoryText: "The drone stutters and collapses, actuators grinding to a halt. The machine deck is quiet again.", defeatText: "The cutting arm finds a gap in your kit. Systems failing.",                                                       canFlee: true,  rewardItemIds: [],                  once: true },
  { id: "boarder_ambush",      enemyId: "sphereal_boarder",  intro: "A figure in angular combat plating drops from a ceiling duct and levels a weapon at your chest. It hasn't fired yet.",                                                                                                   victoryText: "The raider stumbles and goes down. Whatever they came for, they found something else.", defeatText: "The weapon fires at close range. You do not get up.",                                                                          canFlee: true,  rewardItemIds: [],                  once: true },
  { id: "boarder_ambush_2",    enemyId: "sphereal_boarder",  intro: "Two corridors converge ahead. A second boarder holds the junction, cutting off the route forward.",                                                                                                                      victoryText: "The raider goes down hard. The route to the breach point is clear.", defeatText: "The raider holds the junction. You do not.",                                                                                                  canFlee: true,  rewardItemIds: [],                  once: true },
  { id: "ship_corridor_fight", enemyId: "sphereal_boarder",  intro: "A raider at the far end of the ship corridor raises a weapon. Aboard their own vessel, they are not interested in prisoners.",                                                                                          victoryText: "The boarder falls. The corridor to the bridge is open.", defeatText: "On their own ship, they had the advantage. They used it.",                                                                                               canFlee: false, rewardItemIds: [],                  once: true },
  { id: "bridge_guard_fight",  enemyId: "sphereal_elite",    intro: "The bridge door is blocked by a hulking figure in heavy plate. It has clearly been waiting. The weapon it carries is not standard issue.",                                                                              victoryText: "The combat unit crashes to the deck. A sidearm clatters loose from its holster. The bridge console is ahead.", defeatText: "The combat unit is faster and heavier than anything you have faced. It ends quickly.",                  canFlee: false, rewardItemIds: ["sphereal_sidearm"], once: true },
  { id: "boarder_patrol_ind",    enemyId: "sphereal_boarder", intro: "A boarder has penetrated the lower industrial corridors and is moving with purpose — not searching, patrolling.",                                                                         victoryText: "The boarder goes down in the narrow passage. Their patrol route ends here.",                                    defeatText: "In the tight confines of the lower corridor, the boarder had the advantage.",        canFlee: true,  rewardItemIds: [],          once: true },
  { id: "boarder_east_security", enemyId: "sphereal_boarder", intro: "The security hub is occupied. A boarder has set up a forward position at the console and has already spotted you.",                                                                          victoryText: "The boarder collapses behind the console. A medkit falls from their kit.",            defeatText: "The security hub position was too defensible. You learn this too late.",             canFlee: true,  rewardItemIds: ["medkit"],  once: true },
  { id: "ship_crew_patrol",      enemyId: "sphereal_boarder", intro: "The crew quarters are not empty. A raider stands at the weapon rack, armoured and alert, and turns as you enter.",                                                                           victoryText: "The crew member falls. Something useful was left in the struggle.",                   defeatText: "They were on their own ship. You were not.",                                          canFlee: true,  rewardItemIds: ["medkit"],  once: true }
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

const WALL  = WALL_MAINT_A;
const FLOOR = FLOOR_STATION_A;
const TKEY  = { itemId: "transit_key", failureText: "The bulkhead panel flashes red. A transit key is required." };

export const hollowStarZone: Zone = defineZone({
  id: "zone_hollow_star",
  title: "Station West — Maintenance Ring",
  gridW: 5,
  gridH: 5,
  surfaceDefaults: WEST_SURFACES,
  rooms: [
    { id: "gate",           x: 1, y: 4, w: 1, h: 1, title: "Maintenance Airlock",    description: "Worn decking and stenciled hazard lines lead down into the station's lower maintenance ring. The outer seal has not opened in years.",                                     wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#141012", discoveryText: "The airlock cycles behind you with a tired hiss.", npcId: "cdr_vasek" },
    { id: "antechamber",    x: 1, y: 3, w: 1, h: 1, title: "Processing Hub",         description: "A wide junction lined with dark monitors and branching conduits. Three passages lead deeper into the maintenance ring.",                                                    wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#17151a", discoveryText: "Your footsteps ring off the deck plating.", terminalId: "proc_hub_terminal" },
    { id: "scriptorium",    x: 0, y: 3, w: 1, h: 1, title: "Records Bay",            description: "Shelves of outdated storage cores lean against walls slick with coolant seepage. Half the ceiling panels have buckled.",                                                    wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#19141f", discoveryText: "Something shifts behind the fallen rack.",        encounterId: "scriptorium_rats" },
    { id: "moon_shrine",    x: 0, y: 2, w: 1, h: 1, title: "Coolant Alcove",         description: "A recessed alcove beside a sealed duct junction. Emergency supply shelving still holds a few kits behind a cracked safety panel.",                                          wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#1b1822", discoveryText: "The alcove hums faintly from residual coolant flow.", loot: ["medkit"] },
    { id: "armory",         x: 2, y: 3, w: 1, h: 1, title: "Equipment Locker",       description: "Collapsed racks and dented lockers. A suit of salvaged impact plating survived the neglect, still hanging on its pegs.",                                                   wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#1a1715", discoveryText: "A steady drip taps on dented plating.",            loot: ["impact_plating", "medkit"] },
    { id: "flooded_passage",x: 1, y: 2, w: 1, h: 1, title: "Flooded Service Corridor", description: "Dark coolant has pooled across the deck to ankle depth. The lights are dead. Something beneath the surface disturbs the liquid.",                                       wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#132028", discoveryText: "The coolant surface breaks in a slow, spreading ripple.", encounterId: "flooded_acolyte" },
    { id: "echo_bridge",    x: 2, y: 2, w: 1, h: 1, title: "Cable Gantry",           description: "A narrow walkway crosses a vertical service shaft. The station's vent system carries fragmented audio up from decks below — voices, or interference, it is hard to say.", wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#10161f", discoveryText: "The gantry grating vibrates with low-frequency hum." },
    { id: "banner_hall",    x: 3, y: 2, w: 1, h: 2, title: "Long Corridor",          description: "A stripped thoroughfare running two full deck sections, everything removable long since stripped by whoever was here last. At the far end, a sealed bulkhead.",                                          wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#1a1112", discoveryText: "Your footfalls carry a long way in the silence." },
    { id: "lunar_archive",  x: 0, y: 0, w: 1, h: 2, title: "Navigation Records Room", description: "A tall double-height bay of outdated star charts and crew manifests, all obsolete. The data cores are dead but the shelves rise above head height.",                  wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#152030", discoveryText: "Dust drifts from the shelves as you enter.",         loot: ["medkit"] },
    { id: "astral_gallery", x: 1, y: 1, w: 1, h: 1, title: "Observation Mezzanine", description: "A mezzanine catwalk overlooks the service shaft below, its guard rails bent outward. The upper racks hold shadows that shift.",                                            wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#102033", discoveryText: "Movement registers in the high shadows above the railing.", encounterId: "astral_pilgrim" },
    { id: "seal_niche",     x: 2, y: 1, w: 1, h: 1, title: "Ration Cache",           description: "A small recess shelters a locker of emergency rations, sealed against the station's recycled air. The lock is corroded but yields.",                                      wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#151a2a", discoveryText: "The locker seal breaks with a sharp crack.",          loot: ["medkit"], prop: "brazier" },
    { id: "reliquary",      x: 3, y: 1, w: 1, h: 1, title: "Secure Cargo Hold",      description: "A reinforced hold, its blast door wrenched aside from the inside. Equipment manifests are pinned to the walls, most items checked off against a long absence.",            wallTexture: WALL_MAINT_B, floorTexture: FLOOR, ceilingColor: "#0e1628", discoveryText: "A power-on cycle spins up somewhere in the dark.",     encounterId: "reliquary_guardian" },
    { id: "star_sanctum",   x: 3, y: 0, w: 2, h: 1, title: "Signal Core Chamber",    description: "A wide chamber houses a derelict antenna array, its dish angled toward a fixed point in the dark beyond the station hull. The relay equipment spans the full width of the room.",             wallTexture: WALL_MAINT_B, floorTexture: FLOOR, ceilingColor: "#101a30", discoveryText: "The array indicators flicker green as you approach.", victory: true },
    { id: "east_threshold", x: 4, y: 2, w: 1, h: 1, title: "East Passage",            description: "A narrow inter-section corridor. The decking changes from maintenance-worn to industrial-grade plating. Beyond, the hum of heavy machinery is audible.",                    wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#16181e", zoneLink: { toZoneId: "zone_station_industrial", toRoomId: "ind_entry", entryX: 0, entryY: 1, facing: "east", transitionText: "You cross the section boundary into Station Industrial. The machinery is louder here." } }
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
    { x: 3, y: 1, dir: "h", type: "door", requirement: TKEY },
    // long_corridor(3,2) <-> east_threshold(4,2): v edge at (3,2)
    { x: 3, y: 2, dir: "v", type: "open" }
  ]
});

// ── Zone: Station Industrial ──────────────────────────────────────────────────

export const stationIndustrialZone: Zone = defineZone({
  id: "zone_station_industrial",
  title: "Station West — Industrial Section",
  gridW: 5,
  gridH: 3,
  surfaceDefaults: INDUSTRIAL_SURFACES,
  rooms: [
    { id: "ind_supervisor_office", x: 0, y: 0, w: 1, h: 1, title: "Shift Supervisor's Office",  description: "A cramped office with a terminal still active on the desk. Shift logs, anomaly reports, and a long list of unanswered requisition forms cover every surface.",                                         wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#1a1518", discoveryText: "The chair is still warm.", npcId: "ind_supervisor_merrak" },
    { id: "ind_relay_station",     x: 1, y: 0, w: 1, h: 1, title: "Relay Station",              description: "A junction room packed with signal-routing hardware. Most units are functional, but the maintenance log shows a pattern of missing components that no one has explained.",                           wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#171218", discoveryText: "The equipment hums normally, but the component bays have gaps.", terminalId: "ind_relay_log" },
    { id: "ind_cargo_office",      x: 2, y: 0, w: 1, h: 1, title: "Cargo Office",               description: "A small office used for manifest reconciliation. Someone left in a hurry — a half-eaten ration pack sits on the console and the terminal is still logged in.",                                        wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#151218", discoveryText: "Papers are scattered across the deck plating.", loot: ["medkit"] },
    { id: "ind_entry",             x: 0, y: 1, w: 1, h: 1, title: "Industrial Section Entry",   description: "The transition corridor between the maintenance ring and the industrial decks. The noise level rises sharply here — cooling fans, conveyor systems, the deep thrum of active machinery.",              wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#161318", discoveryText: "The air smells of machine oil and recycled atmosphere." },
    { id: "ind_machine_deck",      x: 1, y: 1, w: 1, h: 1, title: "Machine Deck",               description: "A wide deck lined with industrial machinery — press units, fabrication arms, heavy-load conveyors. Several units show signs of hasty disassembly, components stripped and missing.",                 wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#161014", discoveryText: "Something is wrong with one of the fabrication arms — it is moving when it should not be.", encounterId: "ind_bot_encounter" },
    { id: "ind_cargo_hold",        x: 2, y: 1, w: 1, h: 1, title: "Cargo Hold",                 description: "A large hold with rack storage running floor to ceiling. Several racks have been stripped bare. The hold manifest terminal is active — someone was checking inventory before the shift ended.",       wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#151014", discoveryText: "The hold is mostly empty. Something has been here and taken things.", terminalId: "ind_cargo_manifest", loot: ["medkit"] },
    { id: "ind_east_approach",     x: 3, y: 1, w: 1, h: 1, title: "Eastern Approach Corridor",  description: "A long corridor connecting the industrial section to the station's eastern blocks. The bulkhead ahead shows recent stress marks — something heavy was recently moved against it.",                    wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#141018" },
    { id: "ind_east_exit",         x: 4, y: 1, w: 1, h: 1, title: "East Section Bulkhead",      description: "The boundary threshold between industrial and the station's eastern operational sections. Through the reinforced door, the layout opens out into dock-adjacent corridors.",                          wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#131018", zoneLink: { toZoneId: "zone_station_east", toRoomId: "east_entry", entryX: 0, entryY: 1, facing: "east", transitionText: "You push through the east bulkhead. The sounds ahead are wrong — alarms, distant impacts. Something is happening in Station East." } },
    { id: "ind_stripped_bay",      x: 1, y: 2, w: 1, h: 1, title: "Stripped Service Bay",       description: "A service bay where three maintenance drones sit in their charging cradles, stripped to their frames. Motor assemblies, guidance units, every neodymium-bearing component — gone. The work was fast and precise.",  wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#161215", discoveryText: "Three drone chassis, emptied with surgical efficiency." },
    { id: "ind_loading_bay",       x: 2, y: 2, w: 1, h: 1, title: "Loading Bay",                description: "A bay used for staging heavy cargo. The blast door to the external dock interface has been forced from the outside. Boot prints in the dust lead from the forced door toward the interior.",            wallTexture: WALL_MAINT_A, floorTexture: FLOOR, ceilingColor: "#150e12", discoveryText: "Someone came in through the dock interface. Someone from outside.", encounterId: "boarder_ambush" },
    { id: "ind_holding_cells",     x: 3, y: 2, w: 2, h: 1, title: "Holding Cells",              description: "A wide short-term detention area spanning two cell bays, rarely used. The cell doors are open. Someone left a kit behind — possibly a station worker who was moving fast.",                                                        wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#141018", discoveryText: "The cells are empty. The medkit on the bench has not been claimed.", loot: ["medkit"] },
    { id: "ind_break_room",     x: 3, y: 0, w: 1, h: 1, title: "Crew Break Room",         description: "A small rest area — lockers, a bolted-down table, a coffee dispensary long out of service. Someone is hiding behind the last row of lockers, very still.",                                                                              wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#161318", discoveryText: "A sound from behind the lockers. Not a threat — someone trying very hard not to move.", npcId: "tech_sandor", loot: ["medkit"] },
    { id: "ind_power_junction", x: 4, y: 0, w: 1, h: 1, title: "Power Junction",           description: "A node room for the section's power distribution. Three conduit runs meet here, monitored by draw-recording units. One monitor shows an anomalous historical record that someone annotated by hand.",                                   wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#151318", discoveryText: "The draw monitors are still logging. Something in the record stands out.", terminalId: "ind_power_log", loot: ["medkit"] },
    { id: "ind_lower_corridor", x: 0, y: 2, w: 1, h: 1, title: "Lower Service Corridor",   description: "A cramped service passage running beneath the machine deck. Tight enough that two people would struggle to pass. Something heavy is moving at the far end.",                                                                            wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#151014", discoveryText: "Footsteps. Heavy. Coming your way.", encounterId: "boarder_patrol_ind" }
  ],
  edges: [
    { x: 0, y: 0, dir: "h", type: "open" },
    { x: 1, y: 0, dir: "h", type: "open" },
    { x: 2, y: 0, dir: "h", type: "open" },
    { x: 1, y: 1, dir: "h", type: "open" },
    { x: 2, y: 1, dir: "h", type: "open" },
    { x: 3, y: 1, dir: "h", type: "open" },
    { x: 0, y: 0, dir: "v", type: "open" },
    { x: 1, y: 0, dir: "v", type: "open" },
    { x: 0, y: 1, dir: "v", type: "open" },
    { x: 1, y: 1, dir: "v", type: "open" },
    { x: 2, y: 1, dir: "v", type: "open" },
    { x: 3, y: 1, dir: "v", type: "open" },
    { x: 1, y: 2, dir: "v", type: "open" },
    { x: 2, y: 2, dir: "v", type: "open" },
    { x: 2, y: 0, dir: "v", type: "open" },
    { x: 3, y: 0, dir: "v", type: "open" },
    { x: 3, y: 0, dir: "h", type: "open" },
    { x: 4, y: 0, dir: "h", type: "open" },
    { x: 0, y: 1, dir: "h", type: "open" }
  ]
});

// ── Zone: Station East — Attack Zone ─────────────────────────────────────────

export const stationEastZone: Zone = defineZone({
  id: "zone_station_east",
  title: "Station East — Docking Sectors",
  gridW: 4,
  gridH: 3,
  surfaceDefaults: EAST_SURFACES,
  rooms: [
    { id: "comms_room",      x: 0, y: 0, w: 1, h: 1, title: "Communications Room",     description: "The station's primary communications relay for the eastern section. Screens show fragmented incoming signals and one sustained encrypted burst that the system cannot decode. A live log is still running.",   wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#201010", discoveryText: "The consoles are lit up with alerts. Something has already happened.", terminalId: "east_comms_terminal" },
    { id: "armory_east",     x: 1, y: 0, w: 1, h: 1, title: "East Section Armory",      description: "A small equipment locker room, its cage door hanging open. Most of the weapons have been issued already. One medkit remains on the emergency shelf.",                                                         wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#1e1010", discoveryText: "The armory has been raided from the inside — station personnel taking what they could before evacuating.", loot: ["medkit"] },
    { id: "breach_staging",  x: 2, y: 0, w: 1, h: 1, title: "Staging Corridor",         description: "A wide corridor used for staging heavy equipment before dock operations. Smoke from an electrical fault hangs near the ceiling. The lights at the far end have been shot out.",                               wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#1c1212", discoveryText: "The smell of burning insulation and something unfamiliar — the boarders' weapons." },
    { id: "east_entry",      x: 0, y: 1, w: 1, h: 1, title: "East Section Entry",        description: "The main access corridor into the eastern docking sections. Blast marks on the bulkheads. A body — station security — lies near the far wall. The attack is not over.",                                      wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#201414", discoveryText: "The attack reached here before you did." },
    { id: "docking_bay",     x: 1, y: 1, w: 1, h: 1, title: "Docking Bay",               description: "A large pressurised docking bay, currently breached on the far side. Decompression safety systems have sealed the outer doors, but boarders are already on this side of them.",                             wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#1e1212", discoveryText: "A figure in unknown armour is moving through the dock. It sees you.", encounterId: "boarder_ambush_2" },
    { id: "breach_corridor", x: 2, y: 1, w: 1, h: 1, title: "Breach Corridor",           description: "A section of corridor that connects the dock to the hull breach point. The walls are scorched and one ceiling panel has collapsed. Whoever forced this route was not concerned about collateral damage.",      wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#1a1010", discoveryText: "The route ahead is clear, but barely passable." },
    { id: "hull_breach",     x: 3, y: 1, w: 1, h: 2, title: "Hull Breach Point",         description: "A tall two-section area where the raider vessel physically docked through a forced breach in the station's outer hull. The airlock interface is improvised but functional. Through it, the angular interior of an alien ship is visible.",  wallTexture: WALL_MAINT_A, floorTexture: FLOOR, ceilingColor: "#181818", discoveryText: "The ship is right there. The breach is open.", zoneLink: { toZoneId: "zone_enemy_ship", toRoomId: "ship_airlock", entryX: 1, entryY: 2, facing: "north", transitionText: "You step through the breach and into the raider. The geometry of the interior is subtly wrong — angles that do not correspond to Aligned construction standards." } },
    { id: "emergency_bay",   x: 1, y: 2, w: 1, h: 1, title: "Emergency Response Bay",    description: "A staging area for emergency response teams. It has been used — equipment is strewn across the floor, a medkit remains on the kit rack. Whoever was here left in a hurry.",                                wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#1c1010", discoveryText: "Signs of a rapid evacuation. Someone thought ahead enough to leave the medkit.", loot: ["medkit"] },
    { id: "east_security_hub",  x: 3, y: 0, w: 1, h: 1, title: "Security Operations Hub",  description: "The eastern section's security monitoring station. Camera feeds cover every dock approach — most are offline now, but the recording logs are intact. A boarder has taken up a defensive position at the console.",                      wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#1e1010", discoveryText: "The screens show chaos. A figure at the console turns as you enter.", encounterId: "boarder_east_security", terminalId: "east_security_log" },
    { id: "east_medbay",        x: 0, y: 2, w: 1, h: 1, title: "Medical Bay",                description: "The section's compact medical bay, supplies half-distributed before the attack. One security officer is propped against the far wall — wounded but conscious. The kit rack near the door still has supplies.",                           wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#1c1010", discoveryText: "A figure against the wall. Alive — barely. Station security uniform.", npcId: "security_chen", loot: ["medkit"] },
    { id: "east_storage_bay",   x: 2, y: 2, w: 1, h: 1, title: "Emergency Storage Bay",     description: "A sealed bay for emergency equipment. The alarm state unlocked it automatically. Whoever came through took the weapons — the medical supplies were left behind.",                                                                         wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#1c1212", discoveryText: "The bay was sealed until the alarm opened it. Medical supplies still here.", loot: ["medkit", "medkit"] }
  ],
  edges: [
    { x: 0, y: 0, dir: "h", type: "open" },
    { x: 1, y: 0, dir: "h", type: "open" },
    { x: 1, y: 1, dir: "h", type: "open" },
    { x: 0, y: 0, dir: "v", type: "open" },
    { x: 1, y: 0, dir: "v", type: "open" },
    { x: 0, y: 1, dir: "v", type: "open" },
    { x: 1, y: 1, dir: "v", type: "open" },
    { x: 2, y: 1, dir: "v", type: "open" },
    { x: 2, y: 0, dir: "v", type: "open" },
    { x: 3, y: 0, dir: "h", type: "open" },
    { x: 0, y: 1, dir: "h", type: "open" },
    { x: 2, y: 1, dir: "h", type: "open" },
    { x: 1, y: 2, dir: "v", type: "open" }
  ]
});

// ── Zone: Enemy Ship ──────────────────────────────────────────────────────────

export const enemyShipZone: Zone = defineZone({
  id: "zone_enemy_ship",
  title: "Sphereal Raider Vessel",
  gridW: 3,
  gridH: 3,
  surfaceDefaults: SHIP_SURFACES,
  rooms: [
    { id: "ship_bridge",          x: 1, y: 0, w: 1, h: 1, title: "Raider Bridge",              description: "The command deck of the Sphereal vessel. Consoles display navigation data in script you cannot read. At the centre, a transit apparatus pulses with low blue light — the Echo Transit system, still active and primed.",  wallTexture: WALL_MAINT_A, floorTexture: FLOOR, ceilingColor: "#0c1820", discoveryText: "The transit system is powered. Whatever its destination, it is ready to depart.", zoneLink: { toZoneId: "zone_sphere_arrival", toRoomId: "sphere_transit_point", entryX: 1, entryY: 2, facing: "north", transitionText: "The bridge pulses with blue-white light. You brace. The universe inverts for one impossible instant — and then you are somewhere else entirely." } },
    { id: "ship_hold",            x: 0, y: 1, w: 1, h: 1, title: "Cargo Hold",                 description: "The raider's cargo hold. Sealed containers are stacked along one wall. An active manifest terminal shows the ship's most recent acquisition record — a precise list of components taken from a station that matches the one you just left.",  wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#0d1a22", discoveryText: "The hold is organised with military precision. Every container is labelled in the same unreadable script.", terminalId: "ship_cargo_log", loot: ["neodymium_fragment"] },
    { id: "ship_corridor",        x: 1, y: 1, w: 1, h: 1, title: "Main Corridor",              description: "The ship's central passage. The ceiling is lower than station standard and the lighting has a cold blue-green quality that makes everything look clinical. This crew did not consider comfort.",                                wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#0e1a20", discoveryText: "The corridor smells of recirculated air and something you cannot identify — machinery, or biology, or both.", encounterId: "ship_corridor_fight" },
    { id: "ship_bridge_approach", x: 2, y: 1, w: 1, h: 1, title: "Bridge Approach",            description: "The final corridor before the bridge. A heavy blast door stands partially open. The guard stationed here has not moved since you entered the ship.",                                                                                wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#0c1c22", discoveryText: "The guard at the bridge door is still at their post. They are aware of you.", encounterId: "bridge_guard_fight" },
    { id: "ship_airlock",         x: 0, y: 2, w: 2, h: 1, title: "Boarding Airlock",           description: "A wide improvised airlock spanning the breach point where the raider vessel forced contact with the station hull. The seals are temporary. Looking back through the breach, the station corridor is visible but already distant.",                    wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#0e181e", discoveryText: "You are aboard the raider vessel. The breach seal holds, for now." },
    { id: "ship_bunk_room",      x: 0, y: 0, w: 1, h: 1, title: "Crew Quarters",    description: "Compact bunks bolted to the walls, personal effects in sealed containers. A personal log is open on a bedside screen, mid-composition. The crew who slept here thought they were coming back.",                                                  wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#0d1a22", discoveryText: "The bunks are made. These people were disciplined.", terminalId: "ship_crew_log", loot: ["medkit"] },
    { id: "ship_weapons_cache",  x: 2, y: 0, w: 1, h: 1, title: "Weapons Storage",  description: "A secured cage holding the ship's equipment reserve — spare combat gear and directed-energy weapons. The cage door is open. A crew member who did not make it to the bridge is still inside.",                                                   wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#0c1c24", discoveryText: "The cage is open. Something moves inside.", encounterId: "ship_crew_patrol", loot: ["medkit"] }
  ],
  edges: [
    { x: 1, y: 0, dir: "h", type: "open" },
    { x: 1, y: 1, dir: "h", type: "open" },
    { x: 0, y: 1, dir: "v", type: "open" },
    { x: 1, y: 1, dir: "v", type: "open" },
    { x: 0, y: 0, dir: "h", type: "open" },
    { x: 0, y: 0, dir: "v", type: "open" },
    { x: 1, y: 0, dir: "v", type: "open" },
    { x: 2, y: 0, dir: "h", type: "open" }
  ]
});

// ── Zone: Sphere Arrival Sector ───────────────────────────────────────────────

export const sphereArrivalZone: Zone = defineZone({
  id: "zone_sphere_arrival",
  title: "Hollow Star — Arrival Sector",
  gridW: 3,
  gridH: 3,
  surfaceDefaults: SPHERE_SURFACES,
  rooms: [
    { id: "sphere_signal_lock",  x: 0, y: 0, w: 2, h: 1, title: "Signal Lock Chamber",         description: "A wide vaulted chamber with walls covered in active displays — navigation data, signal traces, atmospheric readings. The screens show internal geometry on a scale that should not be possible. At the far end, a communications node is broadcasting on an encrypted Aligned frequency.",  wallTexture: WALL_MAINT_B, floorTexture: FLOOR, ceilingColor: "#0a1e30", discoveryText: "The displays show a world inside a world. You are inside the Hollow Star.", victory: true },
    { id: "sphere_observation",  x: 0, y: 1, w: 1, h: 1, title: "Observation Alcove",           description: "A small alcove with a viewport that has been sealed. Through a cracked panel, a faint light is visible — warm, distant, impossibly large. The Bound Core. A terminal is active beside the viewport.",                                                                                    wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#0c1a28", discoveryText: "The light through the cracked panel is not starlight. It is something else entirely.", terminalId: "sphere_arrival_terminal" },
    { id: "sphere_corridor_a",   x: 1, y: 1, w: 1, h: 1, title: "Interior Corridor",            description: "The first corridor of the Hollow Star interior. The construction is ancient — different from any Aligned standard — but maintained. The materials are unfamiliar. The air is breathable but carries a faint metallic taste.",                                                            wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#0d1c2a", discoveryText: "You are walking inside the Hollow Star. No Aligned contact has ever done this." },
    { id: "sphere_junction",     x: 2, y: 1, w: 1, h: 2, title: "First Junction",               description: "A tall junction spanning two sections where multiple passages diverge. The signage is in Sphereal script — unreadable without a translation system. Two routes appear to lead deeper into the Sphere. One leads back.",                                                                                          wallTexture: WALL_MAINT_B, floorTexture: FLOOR, ceilingColor: "#0c1e2c", discoveryText: "The Sphere has infrastructure. This is not a dead shell." },
    { id: "sphere_transit_point",x: 1, y: 2, w: 1, h: 1, title: "Echo Transit Arrival Point",   description: "The arrival point of the Echo Transit event. The transit signature still lingers — a faint shimmer in the air where you materialised. There is no obvious way to return the same way. There is, however, a way forward.",                                                            wallTexture: WALL, floorTexture: FLOOR, ceilingColor: "#0e1a28", discoveryText: "You are here. Inside. The black shell of the Hollow Star is all around you, and you are alive." }
  ],
  edges: [
    { x: 1, y: 0, dir: "h", type: "open" },  // signal_lock(1,0) ↔ corridor_a(1,1)
    { x: 0, y: 0, dir: "h", type: "open" },  // signal_lock(0,0) ↔ observation(0,1)
    { x: 1, y: 1, dir: "h", type: "open" },  // corridor_a(1,1) ↔ transit_point(1,2)
    { x: 0, y: 1, dir: "v", type: "open" },  // observation(0,1) ↔ corridor_a(1,1)
    { x: 1, y: 1, dir: "v", type: "open" }   // corridor_a(1,1) ↔ junction(2,1)
  ]
});

// ── Quests ────────────────────────────────────────────────────────────────────

export const quests: QuestDef[] = [
  {
    id: "q_ring_survey",
    title: "Ring Survey",
    description: "Station protocol: log a check-in at all primary maintenance junctions before accessing secured sections. The hub and the flooded corridor are your first waypoints.",
    objectives: [
      { id: "q_ring_survey_1", description: "Reach the Processing Hub", type: "reach_room", targetId: "antechamber" },
      { id: "q_ring_survey_2", description: "Reach the Flooded Service Corridor", type: "reach_room", targetId: "flooded_passage" }
    ],
    xpReward: 20,
    creditReward: 0,
    trigger: { type: "on_start" }
  },
  {
    id: "q_infestation",
    title: "Infestation Control",
    description: "Biosensors flagging elevated vermin activity in the storage sections. Whoever is still on shift is expected to handle it.",
    objectives: [
      { id: "q_infestation_1", description: "Eliminate the vermin in the Records Bay", type: "defeat_enemy", targetId: "scriptorium_rats" }
    ],
    xpReward: 25,
    creditReward: 2,
    trigger: { type: "on_room_entry", targetId: "scriptorium" }
  },
  {
    id: "q_coolant_loop",
    title: "Coolant Loop Restoration",
    description: "The coolant loop failure is spreading into the lower service levels. Source it. Neutralize whatever is down there and recover authorization to open the upper bulkheads.",
    objectives: [
      { id: "q_coolant_1", description: "Neutralize the contamination source in the flooded corridor", type: "defeat_enemy", targetId: "flooded_acolyte" },
      { id: "q_coolant_2", description: "Recover the transit key", type: "collect_item", targetId: "transit_key" }
    ],
    xpReward: 30,
    creditReward: 3,
    trigger: { type: "on_room_entry", targetId: "flooded_passage" }
  },
  {
    id: "q_sector_lockdown",
    title: "Sector Lockdown",
    description: "Unauthorized presences confirmed in the upper maintenance sections. All personnel are authorized to use necessary force. Secure the sector.",
    objectives: [
      { id: "q_lockdown_1", description: "Apprehend the intruder on the Observation Mezzanine", type: "defeat_enemy", targetId: "astral_pilgrim" },
      { id: "q_lockdown_2", description: "Neutralize the security automaton in the Secure Cargo Hold", type: "defeat_enemy", targetId: "reliquary_guardian" }
    ],
    xpReward: 50,
    creditReward: 5,
    trigger: { type: "on_room_entry", targetId: "astral_gallery" }
  },
  {
    id: "q_transmit_beacon",
    title: "Transmit the Beacon",
    description: "The signal core is active and locked onto an Aligned frequency. The antenna array in the Signal Core Chamber can broadcast it. Get there before the transmission window closes.",
    objectives: [
      { id: "q_beacon_1", description: "Reach the Signal Core Chamber and transmit", type: "reach_room", targetId: "star_sanctum" }
    ],
    xpReward: 75,
    creditReward: 0,
    trigger: { type: "on_item_collect", targetId: "signal_core" }
  },
  {
    id: "q_locate_sandor",
    title: "Track Down Sandor",
    description: "The relay log names Technician Prya Sandor as the first to notice the theft pattern — she signed out a coil for inspection and never came back. If she is still in the industrial section, she may know more than the logs do.",
    objectives: [
      { id: "q_sandor_1", description: "Find Technician Sandor in the industrial section", type: "reach_room", targetId: "ind_break_room" }
    ],
    xpReward: 30,
    creditReward: 2,
    trigger: { type: "on_room_entry", targetId: "ind_relay_station" }
  },
  {
    id: "q_service_floor_infestation",
    title: "Service Floor Infestation",
    description: "Industrial biosensors are flagging an active drone malfunction on the machine deck. Station protocol: contain and neutralise.",
    objectives: [
      { id: "q_sfi_1", description: "Neutralise the feral drone on the Machine Deck", type: "defeat_enemy", targetId: "ind_bot_encounter" }
    ],
    xpReward: 25,
    creditReward: 2,
    trigger: { type: "on_room_entry", targetId: "ind_machine_deck" }
  },
  {
    id: "q_theft_investigation",
    title: "The Theft Pattern",
    description: "Supervisor Merrak has been logging component losses across the industrial section for three cycles — specifically neodymium-bearing parts. Check the relay station log and the cargo manifest. See if the pattern is real.",
    objectives: [
      { id: "q_theft_1", description: "Read the Relay Station maintenance log", type: "interact_terminal", targetId: "ind_relay_log" },
      { id: "q_theft_2", description: "Review the Cargo Hold manifest", type: "interact_terminal", targetId: "ind_cargo_manifest" }
    ],
    xpReward: 40,
    creditReward: 3,
    trigger: { type: "on_room_entry", targetId: "ind_stripped_bay" }
  },
  {
    id: "q_station_under_attack",
    title: "Station Under Attack",
    description: "The eastern sections are under assault from an unidentified vessel. Station East protocols are active. Reach the breach point and assess the situation.",
    objectives: [
      { id: "q_attack_1", description: "Reach the Hull Breach Point in Station East", type: "reach_room", targetId: "hull_breach" }
    ],
    xpReward: 50,
    creditReward: 0,
    trigger: { type: "on_zone_entry", targetId: "zone_station_east" }
  },
  {
    id: "q_secure_east_hub",
    title: "Secure the East Hub",
    description: "Station East's security operations hub is still active. If the boarders have access to the monitoring console, they can see everything. Clear it and pull the camera log before the feeds are wiped.",
    objectives: [
      { id: "q_hub_1", description: "Clear the Security Operations Hub", type: "defeat_enemy", targetId: "boarder_east_security" },
      { id: "q_hub_2", description: "Access the security camera log", type: "interact_terminal", targetId: "east_security_log" }
    ],
    xpReward: 45,
    creditReward: 3,
    trigger: { type: "on_zone_entry", targetId: "zone_station_east" }
  },
  {
    id: "q_board_the_raider",
    title: "Board the Raider",
    description: "The vessel conducting the assault is still docked at the hull breach point. Whatever is happening, the answers are aboard that ship. Board it and reach the bridge before it can depart.",
    objectives: [
      { id: "q_board_1", description: "Reach the Bridge of the Sphereal raider vessel", type: "reach_room", targetId: "ship_bridge" }
    ],
    xpReward: 60,
    creditReward: 0,
    trigger: { type: "on_zone_entry", targetId: "zone_enemy_ship" }
  },
  {
    id: "q_core_feed_evidence",
    title: "Core-Feed Evidence",
    description: "The neodymium fragment you recovered is a processed component — stripped from the station's machinery. The ship's cargo manifest may explain what it was for.",
    objectives: [
      { id: "q_cfe_1", description: "Access the cargo manifest terminal aboard the raider", type: "interact_terminal", targetId: "ship_cargo_log" }
    ],
    xpReward: 50,
    creditReward: 0,
    trigger: { type: "on_item_collect", targetId: "neodymium_fragment" }
  },
  {
    id: "q_make_contact",
    title: "Make Contact",
    description: "You are inside the Hollow Star. No one from the Aligned has ever been here. Find a signal point and establish contact before your position is identified.",
    objectives: [
      { id: "q_contact_1", description: "Reach the Signal Lock Chamber", type: "reach_room", targetId: "sphere_signal_lock" }
    ],
    xpReward: 75,
    creditReward: 0,
    trigger: { type: "on_zone_entry", targetId: "zone_sphere_arrival" }
  }
];

// ── NPCs ──────────────────────────────────────────────────────────────────────

export const npcs: NPC[] = [
  {
    id: "cdr_vasek",
    name: "Commander Vasek",
    role: "Station Commander, West Ring",
    portraitAssetId: "/portraits/npc-placeholder.svg",
    dialogue: [
      {
        id: "vasek_01",
        text: "You made it through the airlock. Good. The ring has been degrading faster than anyone's willing to admit on the official logs.",
        nextId: "vasek_02"
      },
      {
        id: "vasek_02",
        text: "Biosensors are flagging the storage bays. Coolant loop is compromised somewhere in the lower sections. And I've had one confirmed sighting of an unauthorised presence on the upper catwalks.",
        nextId: "vasek_03"
      },
      {
        id: "vasek_03",
        text: "The transit key authorises the upper bulkheads — if you can recover it from the flooded corridor, the whole ring opens up. The signal core chamber is your objective. Get the beacon out."
      }
    ]
  },
  {
    id: "ind_supervisor_merrak",
    name: "Supervisor Merrak",
    role: "Industrial Shift Supervisor",
    dialogue: [
      {
        id: "merrak_01",
        text: "Finally, someone who isn't running the other way. Three cycles I've been filing anomaly reports and no one's done anything. Something is stripping my bays — not randomly, selectively.",
        nextId: "merrak_02"
      },
      {
        id: "merrak_02",
        text: "Coil assemblies. Motor windings. Guidance units from the service drones. All high neodymium content. Whoever is taking them knows exactly what they need and exactly where to find it.",
        nextId: "merrak_03"
      },
      {
        id: "merrak_03",
        text: "The relay station log and the cargo manifest will show you the pattern. I need someone with clearance to see it before I go above Vasek's head with this."
      }
    ]
  },
  {
    id: "tech_sandor",
    name: "Technician Sandor",
    role: "Station Maintenance Technician",
    portraitAssetId: "/portraits/npc-placeholder.svg",
    dialogue: [
      { id: "sandor_01", text: "Don't — I'm not a threat. I've been here since the alarm. Merrak sent me to check the power junction readings and then everything went wrong.", nextId: "sandor_02" },
      { id: "sandor_02", text: "I know about the components. I was the one who noticed first — I signed out a coil assembly for inspection in Cycle 31 and when I logged the neodymium content, the numbers didn't match. Someone had swapped the cores before I got there.", nextId: "sandor_03" },
      { id: "sandor_03", text: "Whatever they needed it for, they needed a lot of it. And they knew exactly which parts had the highest yield. That's not station knowledge. Someone was feeding them a shopping list." }
    ]
  },
  {
    id: "security_chen",
    name: "Officer Chen",
    role: "Station Security, East Section",
    portraitAssetId: "/portraits/npc-placeholder.svg",
    dialogue: [
      { id: "chen_01", text: "Stay low. They came through the dock — maybe forty seconds of warning before the first ones were inside. I have never seen armour like that.", nextId: "chen_02" },
      { id: "chen_02", text: "They were not shooting everything. Moving fast, heading deeper — like they had a destination. Two of them broke off toward the industrial junction. The rest held the dock.", nextId: "chen_03" },
      { id: "chen_03", text: "The breach point is ahead. Whatever ship they came from is still docked. If you are going through there — watch the corridors. They left people behind." }
    ]
  }
];

// ── Terminals ─────────────────────────────────────────────────────────────────

export const terminals: Terminal[] = [
  {
    id: "proc_hub_terminal",
    title: "Processing Hub — Station Log",
    logText: `STATION WEST — MAINTENANCE LOG — CYCLE 47

> COOLANT LOOP STATUS: CRITICAL FAILURE, SECTORS 2-4
  Last diagnostic: 14 cycles ago. Automated repair sequencers offline.
  Manual intervention required. Authorisation: active personnel only.

> TRANSIT KEY — LOCKER 7-B: NOT RETURNED
  Last signed out: Cycle 31. Technician PRYA SANDOR, maintenance detail.
  Status: MISSING. Replacement authorisation pending.

> BIOSENSOR ALERTS: ELEVATED (STORAGE BAY SECTORS)
  Species: indeterminate. Behaviour pattern: territorial.
  Recommended response: standard containment protocol.

> PERSONNEL COMPLEMENT: 3 OF 12 OPERATIONAL
  Command authorises remaining personnel to act under standing orders.
  Contact Station Command if situation changes.

-- END LOG --`,
    xpReward: 5
  },
  {
    id: "ind_relay_log",
    title: "Relay Station — Maintenance Record",
    logText: `STATION WEST — RELAY STATION — MAINTENANCE RECORD — CYCLE 47

> SENSOR COIL ASSEMBLY — BAY 7: MISSING
  Last service cycle: 42. Technician PRYA SANDOR signed out for inspection.
  Current status: UNRETURNED. Replacement request denied — supply shortage.
  Note: Third coil assembly missing this cycle. All high-neodymium type.

> DRIVE GUIDANCE UNIT — SERVICE DRONE 4: STRIPPED
  Found in situ, partially disassembled. Frame intact. Guidance module REMOVED.
  No authorisation on record for disassembly.

> PATTERN NOTE (MERRAK, SHIFT SUPERVISOR):
  Components taken across three separate incidents all share one trait:
  high neodymium content. Coils, windings, sensor heads. Nothing else touched.
  This is not random. I am requesting a formal review.
  If no response by Cycle 48 I am escalating.

-- RECORD ENDS --`,
    xpReward: 5
  },
  {
    id: "ind_cargo_manifest",
    title: "Cargo Hold — Manifest Log",
    logText: `STATION WEST — CARGO HOLD — MANIFEST LOG — CYCLES 44–47

INBOUND SHIPMENT 44-C:
  12x guidance assemblies (standard drone)...........ARRIVED
  4x  motor spindle sets (class B).......................ARRIVED
  8x  neodymium-core coil units..........................ARRIVED: 3 REMAINING
      [Note: 5 units signed out as 'maintenance requisition'. Authorising signature illegible.]

INBOUND SHIPMENT 46-A:
  20x standard cargo containers..........................ARRIVED: 20 REMAINING
  6x  high-density motor cores...........................ARRIVED: 1 REMAINING
      [Note: 5 cores 'transferred to storage'. No storage record found.]

DISCREPANCY TOTAL — CYCLES 44–47:
  Neodymium-bearing components missing: 12 units minimum.
  Estimated replacement value: 1,400 credits.
  No theft report filed. No investigation active.

  Status: UNDER REVIEW (Supervisor Merrak, Cycle 47)

-- MANIFEST ENDS --`,
    xpReward: 5
  },
  {
    id: "east_comms_terminal",
    title: "Communications Room — Live Feed",
    logText: `STATION EAST — COMMS RELAY — LIVE LOG — CYCLE 47

[INCOMING — PRIORITY ALPHA — 11:52]
Unidentified vessel has breached docking bay protocols at coordinates
EAST-3 through EAST-7. Approach vector: UNKNOWN. No transponder registered.
Sector alarm: ACTIVE. All personnel: evacuate non-essential east sections.

[INTERNAL — COMMANDER VASEK — 11:54]
Security teams not responding on channels 4 and 5. Attempting direct
contact with eastern dock personnel. East bulkhead E-7 confirmed breached.
Do not approach. Fall back to industrial section junction.

[AUTOMATED — STATION EMERGENCY — 11:55]
Hull breach confirmed, east sector. Emergency bulkheads sealing.
Evacuation corridors: industrial junction, west ring access.
This is not a drill.

[INCOMING — UNKNOWN SOURCE — ENCRYPTED — 11:58]
> [DECRYPTION FAILED — UNKNOWN PROTOCOL]
> ...signal strength: HIGH...
> [CONTENT UNAVAILABLE]

-- FEED CONTINUES --`,
    xpReward: 5
  },
  {
    id: "ship_cargo_log",
    title: "Raider Vessel — Cargo Manifest",
    logText: `SPHEREAL RAIDER VESSEL — ACQUISITION RECORD — TRANSIT CYCLE 47
[TRANSLATED FROM SPHEREAL NOTATION — PARTIAL]

COLLECTION SITE: Station West sector, Aligned frontier, Sector 3

ACQUIRED:
  5x neodymium motor coil units (high grade)
  5x high-density motor cores (neodymium alloy)
  Service components (miscellaneous, low neodymium, secondary acquisition)

TOTAL NEODYMIUM YIELD: 340 units by weight (estimated)
DESTINATION: Core-feed processing, Bound Core stabilisation priority.

COLLECTION STATUS: COMPLETE.
ECHO TRANSIT: INITIATED.

MISSION NOTE:
  Yield is below projection. Containment drift is accelerating.
  Stabilisation reserves will not hold beyond 8 cycles at current rate.
  Next scheduled collection: Cycle 52. Secondary target: Station East
  freight dock complex. Authorised by Core Council directive.

  Crew note: Aligned personnel encountered on-site. Standard protocol
  observed. They did not understand what they were looking at.

-- END RECORD --`,
    xpReward: 10
  },
  {
    id: "ind_power_log",
    title: "Power Junction — Draw Record",
    logText: `STATION WEST — POWER JUNCTION — DRAW RECORD — CYCLES 44–47

ANOMALOUS DRAW EVENT — CYCLE 44, NODE 7-C:
  Duration: 4.2 minutes. Draw pattern: non-standard.
  Source: unregistered device, dock-adjacent conduit.
  Peak draw: 340 units. Within tolerance. Logged but not flagged.

ANOMALOUS DRAW EVENT — CYCLE 46, NODE 7-C:
  Duration: 6.1 minutes. Same conduit. Same draw profile.
  Note appended by Technician Sandor, Cycle 46:
  "This matches the neodymium-core discharge signature in maintenance
  manual 3.7. Whatever is drawing from this node is running a
  neodymium-fed drive system. This is not station equipment."

CYCLE 47 — NODE 7-C: NO READING.
  Device not present. Conduit clear.

-- END RECORD --`,
    xpReward: 5
  },
  {
    id: "east_security_log",
    title: "Security Hub — Camera Record",
    logText: `STATION EAST — SECURITY HUB — CAMERA LOG — CYCLE 47

[CAM 4 — DOCK APPROACH — 11:52]
Unidentified vessel contact. Hull configuration: NON-STANDARD.
No Aligned registry match. Vessel not decelerating on approach vector.

[CAM 4 — DOCK APPROACH — 11:54]
Vessel has made contact with hull section E-7. Forced coupling confirmed.
Emergency bulkheads sealing. Breach team deploying from dock-facing hatch.

[CAM 7 — DOCKING BAY INTERIOR — 11:55]
Boarding party: 6 confirmed personnel, possibly more.
Armour classification: UNKNOWN. Weapons: UNKNOWN CONFIGURATION.
Movement pattern: purposeful. Not random — heading toward the interior.

[CAM 3 — INDUSTRIAL JUNCTION — 11:56]
Two personnel split from main group, moving west toward industrial section.
Main group holding docking bay and corridor approach.

[CAM — ALL EAST SECTION — 11:58 ONWARD]
FEEDS INTERRUPTED. Signal lost at all east section camera nodes.

-- LOG ENDS --`,
    xpReward: 5
  },
  {
    id: "ship_crew_log",
    title: "Crew Quarters — Personal Log",
    logText: `SPHEREAL CREW LOG — TRANSIT OPERATIVE, SECOND CLASS
[TRANSLATED FROM SPHEREAL NOTATION — PARTIAL]

ENTRY — PRE-DEPARTURE:
This is my fourth collection run. The work is not complicated.
Identify target. Acquire yield. Return for processing.
The Aligned do not understand what they are sitting on.
Their stations are full of it — neodymium in every motor, every coil.
They use it for convenience. We use it to keep the Core stable.

ENTRY — TRANSIT INBOUND:
The containment drift is worse than last cycle. I have heard
the senior crew talking. At the current rate: 10 cycles, maybe less.
The Council says the next run will need to be larger.
I do not ask what larger means.

ENTRY — ON-SITE:
Yield secured. One complication — Aligned personnel on site.
Standard protocol observed. They survived. They always do.
We are not here to cause harm we do not need to cause.
We are here because we have no other choice.

-- LOG ENDS (INCOMPLETE) --`,
    xpReward: 10
  },
  {
    id: "sphere_arrival_terminal",
    title: "Transit Point — Echo Signature Record",
    logText: `TRANSIT WAYPOINT — ECHO SIGNATURE RECORD — INTERNAL LOG

Echo transit event registered: INBOUND (EXTERNAL ORIGIN)

WARNING: This event is anomalous.
All registered transit keys are accounted for at departure registry.
Transit origin: External space, Sector 3, Aligned frontier zone.
Payload mass: UNEXPECTED — single personnel equivalent.

This node is a passive waypoint record only.

INTERIOR NETWORK STATUS:
  Zone designation: ARRIVAL SECTOR — LOWER RING
  Internal comms: ACTIVE on this node
  Atmosphere: NOMINAL
  Temperature: WITHIN RANGE
  Bound Core reading: STABLE at this distance
  Core-feed delivery status: DELAYED — 3 cycles overdue

SECURITY ADVISORY:
  Unregistered transit arrival logged and flagged.
  Internal monitoring will have noted your presence.

  We know you are here.
  Do not move from this position.

-- RECORD ENDS --`,
    xpReward: 10
  }
];

// ── Tablet messages ───────────────────────────────────────────────────────────

export const messages: MessageDef[] = [
  {
    id: "msg_station_boss_intro",
    sender: "Station Commander Vasek",
    subject: "Maintenance Ring — Standard Briefing",
    body: `Personnel,

You are cleared for unsupervised work in the maintenance ring as of this cycle.

Standard protocol applies: log all junction check-ins, document any abnormalities in the coolant loop, and do not engage biological contamination without proper gear. Biosensors have been flagging elevated readings in the storage bays — treat this as active until cleared.

The transit key locker in the flooded corridor has not been signed out. If you recover it, it authorises access to the upper bulkheads. Consider that part of the brief.

Sector comms have been intermittent. If you lose contact, proceed on last standing orders.

— Cdr. Vasek, Station West`,
    timestamp: "Cycle 47 — Station Time 06:30",
    trigger: { type: "on_start" }
  },
  {
    id: "msg_attack_alert",
    sender: "Station Emergency Broadcast",
    subject: "PRIORITY — Unidentified Vessel — All Personnel",
    body: `ATTENTION ALL STATION WEST PERSONNEL

An unidentified vessel has been detected on approach vector, bearing 7-7-4. It does not respond to standard hailing frequencies.

All non-essential personnel are to withdraw to designated shelter areas immediately. Security teams are authorised to arm.

Repeat: this is not a drill.

If you are in the upper maintenance sections, evacuate via the processing hub. Do not use the observation mezzanine catwalks.

Station command will broadcast updates as the situation develops.

STATION EMERGENCY SYSTEMS — AUTO-BROADCAST`,
    timestamp: "Cycle 47 — Station Time 11:52",
    trigger: { type: "on_zone_entry", targetId: "zone_station_east" }
  },
  {
    id: "msg_aligned_forces",
    sender: "Unknown — Aligned Frequency",
    subject: "[Encrypted] First Contact",
    body: `Signal acknowledged.

We have been monitoring this station's broadcast for three cycles. The carrier tone you transmitted matches Aligned authentication protocols exactly.

You are not where you expected to be. Neither are we.

Do not attempt to reply on this channel — your hardware cannot encode for the return path. Find a way to the threshold. We will guide you from there.

More when you reach us.

— AF`,
    timestamp: "Cycle 47 — Station Time [CORRUPTED]",
    trigger: { type: "on_zone_entry", targetId: "zone_sphere_arrival" }
  }
];

export interface WorldSeed {
  title: string;
  intro: string;
  startX: number;
  startY: number;
  zones: Zone[];
  items: Item[];
  enemies: Enemy[];
  encounters: Encounter[];
  quests: QuestDef[];
  messages: MessageDef[];
  npcs: NPC[];
  terminals: Terminal[];
  assets: AssetManifest;
}

export const worldSeed: WorldSeed = {
  title: "Echoes of the Hollow Star",
  intro: "Routine maintenance shift. Station West, sublevel 3. The biosensors have been flagging elevated readings for six days and no one from Operations has come to check. You are going in alone.",
  startX: 1,
  startY: 4,
  zones: [hollowStarZone, stationIndustrialZone, stationEastZone, enemyShipZone, sphereArrivalZone],
  items,
  enemies,
  encounters,
  quests,
  messages,
  npcs,
  terminals,
  assets: assetManifest
};
