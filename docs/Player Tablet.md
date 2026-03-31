# Player Tablet

## Purpose

The player tablet is the game's portable command, access, and narrative hub.

It is not just a menu. It is the in-world device that carries assignments, messages, maps, access permissions, and system-interaction abilities across the full game.

The tablet should evolve alongside the story:

- At first it is a practical station-issued work device.
- During the crisis it becomes a survival and intrusion tool.
- Inside the Hollow Star it becomes the player's field relay, intel console, and systems interface.
- Late in the game it becomes a high-trust device with access to critical Sphere infrastructure.

## Core Design Role

The tablet should own these design responsibilities:

- narrative delivery
- quest and assignment tracking
- mapping and navigation support
- system access and hacking
- intel gathering
- limited tactical utility

The tablet should not be the main source of raw character power.

## Progression Split

To keep the game's progression readable, each system should have a distinct job:

- `Character levels`: baseline survivability and combat growth
- `Loot and equipment`: weapons, armor, consumables, and tactical loadout identity
- `Tablet upgrades`: access, information, utility, and new interaction verbs

This separation matters. If the tablet becomes just another source of flat attack, defense, or max HP, it starts competing with levels and gear instead of adding a different kind of progression.

## Tablet Upgrade Philosophy

Tablet upgrades should be milestone-driven, not XP-driven.

The player can gain character XP continuously through play, but tablet upgrades should arrive at authored thresholds in the story. This keeps the tablet tied to changing context, factions, and access levels rather than making it feel like a generic RPG stat tree.

Good milestone triggers:

- completing the opening station assignment chain
- surviving the station attack
- boarding or clearing the alien ship segment
- establishing early Sphere-side contact
- gaining trusted access to deeper Sphere systems

## Full Game Progression

### Tier 1: Station Tablet

The initial device is a station-issued work tablet.

Primary functions:

- work orders and assignments
- local station messages
- basic area maps
- maintenance logs
- local notices
- simple directory and terminal access

Gameplay identity:

- teaches the player to read assignments in-world
- anchors the opening "ordinary life" tone
- replaces the classic village quest board with a frontier work device

### Tier 2: Retrofitted Ship Tablet

After the attack and alien ship contact, the player acquires or retrofits a more capable device using enemy hardware, firmware, or data access.

Primary functions:

- partial ship-system access
- surveillance or camera feed access
- basic hostile-tech scan functions
- emergency override hooks
- limited translation or decoding support
- new hacking permissions beyond station-grade access

Gameplay identity:

- the tablet shifts from work device to survival-tech tool
- the player begins interacting with systems that were never meant for them
- the device should feel improvised, unstable, and powerful in a narrow way

### Tier 3: Sphere Relay Upgrade

Early in the Sphere missions, the tablet gains stable internal-network capability and becomes the player's true field relay.

Primary functions:

- deeper regional mapping
- faction intel and message relay
- archive and journal access
- better enemy or NPC dossier information
- hazard overlays
- expanded hacking against Sphere infrastructure

Gameplay identity:

- the player is no longer just surviving; they are becoming a meaningful contact inside the Hollow Star
- the tablet becomes the portable substitute for a safe hub, command desk, and archive terminal

### Tier 4: Final Authority Device

Later in the full game, the tablet becomes a high-clearance endgame device tied to major Sphere systems and endgame decisions.

Primary functions:

- deep transit and containment intel
- critical override access
- high-level contacts and mission routing
- advanced map and network visibility
- decision support for final-state quests

Gameplay identity:

- this is not merely a stronger gadget; it represents trust, access, and political importance

## Gameplay Systems the Tablet Can Unlock

The tablet is strongest when it unlocks new verbs and new information.

Good tablet-driven mechanics:

- read and manage assignments
- receive and review messages
- view local and regional maps
- scan enemies or systems for contextual data
- access journals, logs, and dossiers
- hack doors, panels, terminals, and security layers
- unlock hidden caches or supply lockers
- reroute power to activate routes or reward rooms
- reveal optional resources through surveillance or sensors
- gain objective overlays or hazard warnings

## Hacking as the Tablet's Main Mechanical Identity

Hacking is the cleanest systemic role for the tablet.

Rather than granting direct permanent stat bonuses, the tablet should let the player interact with the environment in ways that produce opportunities:

- unlocking med lockers
- opening maintenance caches
- restoring supply dispensers
- bypassing sealed doors
- disabling or confusing local security
- accessing camera feeds to spot loot or threats
- extracting shipping or repair data that points to hidden rewards
- activating fabrication or emergency supply systems

This keeps tablet progression tied to access and ingenuity rather than generic power scaling.

## Combat Support Boundaries

The tablet can affect combat, but mostly through utility support rather than passive stat inflation.

Good combat-adjacent uses:

- enemy scan data
- temporary shield pulse
- limited emergency heal
- hazard warning overlays
- decoy, lure, or distraction functions

These should be constrained by cooldowns, charges, access level, or encounter context.

Avoid making the tablet a permanent stat-stick through effects like:

- flat attack bonuses
- always-on defense bonuses
- large passive HP increases
- broad replacement of consumables or gear progression

If healing exists through the tablet, it should usually come from system access, limited-use protocols, or hacked med infrastructure rather than from a free universal heal button.

## Narrative Value

The tablet is one of the main tools that can preserve continuity across huge changes in setting.

It connects:

- station life to wartime crisis
- wartime crisis to alien intrusion
- alien intrusion to faction contact
- faction contact to endgame authority

This makes it more than UI. It is a narrative spine that allows the game to change scale without losing player orientation.

## Vertical Slice Guidance

For the current vertical slice, the most important tablet goals are:

- establish the tablet as the quest and message hub
- present it as an in-world station device early
- transition it into an emergency/crisis tool during the attack
- prepare for later upgrades without overbuilding the full system now

Suggested slice scope:

- `Messages`
- `Assignments`
- `Map`
- simple unread indicator
- authored story delivery tied to station boss, emergency alerts, and first outside contact
- early hooks for future hacking and intel systems

The slice does not need the full upgrade ladder implemented. It only needs a strong foundation that makes later tiers feel inevitable rather than invented after the fact.

## Future Development Notes

- Keep tablet upgrades tied to story milestones.
- Let tablet upgrades unlock new interaction categories, not just larger numbers.
- Use the tablet to expose worldbuilding cleanly without relying on exposition dumps.
- Preserve a clear separation between character growth, gear upgrades, and tablet capability.
- Make every upgrade feel like a change in status, access, and perspective.
