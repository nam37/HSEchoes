# Echoes of the Hollow Star — Vertical Slice Implementation Plan

This document covers the mechanics and systems required to elevate the current proof-of-concept into a
proper narrative vertical slice. The slice ends at the Echo Transit threshold: station → attack → enemy
ship → arrival inside the Hollow Star.

---

## Current State

The PoC has:
- Zone-based dungeon crawl (movement, combat, loot, basic items)
- Admin zone editor with room/edge/passage tooling
- Save / Load Latest / checkpoint system
- Basic inventory and equipment
- Victory and death screens

It does not have: quests, NPCs, dialogue, the tablet, advancement, thematic currency, a map worth
showing the player, or zone transitions with narrative weight.

---

## Phase 1 — Foundation Cleanup

*Goal: Remove PoC debt so new systems are built on clean ground.*

### 1.1 Currency rename
- Replace `gold` with `credits` throughout shared types, server, and client HUD.

### 1.2 Equipment UI
- Fix inventory panel scrollbar (constrain height, use overflow-y: auto properly).
- Show equipped item names clearly; distinguish equipped vs unequipped visually.

### 1.3 Room/zone descriptions
- Audit all placeholder room titles and descriptions in `world.ts`.
- Replace with setting-appropriate language (industrial sci-fi, not fantasy).

### 1.4 Starting item rename
- `rusted_blade` → something thematic (e.g. `maintenance_tool`, `cargo_hook`).

### 1.5 Zone transition feedback
- When the player crosses a zone boundary, show a brief full-width text beat in the status ribbon
  (e.g. "You pass through the bulkhead into Sector 7-Gamma.").
- Add a short visual pause or fade on zone entry.

---

## Phase 2 — Character Advancement

*Goal: Give the player a sense of growth tied to their actions.*

### 2.1 Shared types
- Add `level`, `xp`, `xpToNextLevel` to `PlayerState`.
- Add `XP_TABLE` constant (levels 1–5 for the slice).

### 2.2 XP award system (server)
- Award XP on: combat victory (enemy maxHp × 2), quest completion (per-quest value), first room
  discovery (5 XP), first zone discovery (25 XP).
- After any XP award, check for level-up.
- Defer level-up application until `run.mode === "explore"`.

### 2.3 Level-up application
- On level-up: increase `maxHp`, `baseAttack`, `baseDefense` per the advancement table.
- Scale current HP proportionally (e.g. if at 80% HP before, remain at 80% after).
- Push level-up message to action log and status ribbon.

### 2.4 Client HUD
- Add Level and XP (with next-level threshold) to the Explorer panel.
- Simple text display — no progress bar needed yet.

---

## Phase 3 — Quest System

*Goal: Give the player structured objectives with story context.*

### 3.1 Shared types
- Add `Quest` type: `{ id, title, description, status, objectives[], xpReward, creditReward }`.
- Add `QuestObjective` type: `{ id, description, type, targetId?, count?, completed }`.
- Objective types for the slice: `reach_room`, `defeat_enemy`, `collect_item`, `interact_terminal`.
- Add `activeQuests` and `completedQuestIds` to `RunState`.

### 3.2 Quest data (world seed)
- Define 3–5 quests for the vertical slice in `world.ts`:
  - 1–2 tutorial station quests (given by station boss tablet message)
  - 1 mid-station quest (investigate the theft pattern)
  - 1 crisis quest (survive the attack, reach the enemy ship)
  - 1 threshold quest (board the ship, trigger Echo Transit)

### 3.3 Quest engine (server)
- `startQuest(run, questId)` — adds quest to activeQuests.
- `checkObjectives(run, event)` — evaluates objectives on move/combat/interact events.
- `completeQuest(run, questId)` — awards XP and credits, moves to completedQuestIds.
- Quest triggers: room entry, item collection, enemy defeat, zone transition.

### 3.4 Client HUD
- Add a Quest panel (or tab within the existing bottom row) showing active quest title and
  current objective.
- Completed objectives shown with a strikethrough or check.

### 3.5 Admin quest editor
- Quest data is stored in `world_data` with `kind = 'quest'` and can be edited live without
  a re-seed.
- Add a **Quests** tab to the admin panel with a list view (id, title, trigger, objective count,
  XP/credit rewards) and a modal edit form.
- Edit form covers: id, title, description, xpReward, creditReward, trigger type + targetId,
  and inline add/remove/edit of objectives (type, targetId, description).
- Save calls `PUT /api/admin/world/quests/:id`; delete calls `DELETE /api/admin/world/quests/:id`.
- Click **Publish Changes** after editing to reload the in-memory quest cache on the server.
- Saving/loading quest *progress* (which objectives are ticked) happens automatically through
  the existing auto-save and checkpoint system — no special handling required.

### 3.6 Zone editor workflow
- Add editable `gridW` and `gridH` controls to the zone editor so a zone's overall grid size can
  be expanded or reduced without hand-editing data.
- Allow drag-to-move for existing rooms in `/admin` → **Map**.
- Allow drag-to-resize existing rooms by grabbing room edges or corners.
- Add precise numeric `x`, `y`, `w`, and `h` inputs in the room sidebar as a fallback for exact
  layout adjustments.
- Preserve room `id` and all room metadata when moving or resizing; this is a reshape operation,
  not delete-and-recreate.
- Prevent invalid edits: no room overlap, no out-of-bounds placement, and no grid shrink that
  would clip existing rooms.
- After any move, resize, or grid-size change, prune or repair explicit passage edges that are no
  longer valid for the updated room layout.

---

## Phase 4 — The Tablet System

*Goal: Replace the abstract HUD with the setting's central narrative hub.*

### 4.1 Tablet UI component
- Full-screen overlay (or large side panel) accessible via a button in the HUD.
- Tabs for the slice: **Messages**, **Assignments**, **Map**.

### 4.2 Messages tab
- Threaded message list, sender name, timestamp.
- Messages delivered by: Station Boss (Act I), Emergency Alerts (Act II), Aligned Forces (Act III).
- Messages are stored in `RunState` and authored in world content.
- New unread messages show a badge indicator on the tablet button.

### 4.3 Assignments tab
- Mirrors the quest system — active quests with objectives, completed quests in an archive.
- Quest descriptions written in-world as work orders or mission briefings.

### 4.4 Map tab
- Upgraded version of the current mini-map.
- Shows discovered rooms with labels, zone name header, player position marker.
- Replaces the current always-visible map card in the bottom row.

### 4.5 Message delivery triggers
- Opening message from station boss delivered at run start.
- Attack alert delivered on entering the mid-station zone.
- First Aligned Forces message delivered on zone transition into the Sphere.

---

## Phase 5 — NPCs and Dialogue

*Goal: Make the world feel inhabited and give quests a human voice.*

### 5.1 NPC type
- Add `NPC` to shared types: `{ id, name, role, dialogue[] }`.
- `DialogueLine`: `{ id, text, triggerId?, nextId? }` — simple linear dialogue for the slice,
  branching deferred.

### 5.2 Station Boss NPC
- First NPC implemented.
- Delivers opening quests via tablet (Phase 4) and has an interactable presence in the first zone.
- Simple interact action on room entry or terminal interaction.

### 5.3 Interact action
- Add `interact` command to `MovePayload` or as a separate endpoint.
- Triggers on rooms flagged with `npcId` or `terminalId`.
- Returns dialogue text or terminal log content to the client.

### 5.4 Terminal interactables
- Rooms can have a `terminal` flag with associated log text (loot drop for story content).
- Terminals deliver environmental storytelling: stripped cargo manifests, missing neodymium
  component logs, internal station memos.
- Interacting with a new terminal awards 5 XP and may advance quest objectives.

---

## Phase 6 — Zone Content and Story Build

*Goal: Replace placeholder content with the actual vertical slice narrative.*

### 6.1 Zone map redesign
- Design and build the following zones in the admin editor:
  - **Station West** — tutorial zone, safe, Station Boss NPC, opening quests
  - **Station Industrial** — mid-station, complexity tier quests, clue seeding
  - **Station East (Attack)** — remixed danger zone, crisis quests, boarding sequence
  - **Enemy Ship** — short combat-heavy zone, Echo Transit trigger room
  - **Sphere Arrival Sector** — first interior zone, arrival beat, first Aligned Forces message

### 6.2 Enemy roster
- At minimum: feral service bot (tutorial), Sphereal boarder (attack), Sphereal elite (ship).
- Each with appropriate stats, attack/defense values, and defeat text.

### 6.3 Item roster
- Starting tool (replaces rusted blade - possibly already fixed)
- Station medkit (consumable)
- Salvaged armour (armor slot - possibly already fixed)
- Sphereal sidearm (weapon slot, found on enemy ship)
- Neodymium fragment (key item / story object, not equippable)

### 6.4 Quest content
- Write all quest titles, descriptions, objectives, and tablet messages in-world voice.
- Ensure neodymium clues are seeded through terminal logs in Phases 3–4 of the station.

---

## Phase 7 — Polish and Slice Completion

*Goal: Make the slice feel like a real game, not a prototype.*

### 7.1 Victory condition update (NOTE: Possibly already addressed)
- Current: find Star Sigil, place on altar (fantasy placeholder).
- Replace with: survive the station attack, board the enemy ship, survive Echo Transit,
  receive first contact from Aligned Forces inside the Sphere.

### 7.2 Death screen copy
- Update death text to use setting-appropriate language.

### 7.3 Landing page
- Replace "Retro Dungeon PoC" branding with actual game title treatment.
- Intro text should reflect the actual setting opening.
- "Admin" added to the title screen when loading /admin .

### 7.4 Responsive layout
- Ensure the game is playable on a standard laptop screen without scrollbars.
- Equipment panel overflow fix (from Phase 1) fully resolved.

### 7.5 Audio stubs (optional)
- Placeholder ambient sound or silence-by-design decision made.
- Not required for the slice but worth deciding intentionally.
- Music:
- - Title screen theme song.
- - Exploration (general gameplay)
- - Combat
- - Character Death Music
- - End Game "Credits
- Music should crossfade and be low volume
- Controled by "Settings" options from the main menu (optional)

### 7.5 Re-Work Terminal > Map 
- Terminal > Map should containt 2 maps: 
- - Zones (Visualised as rough outline with found entry and exit points, only discovered zones)
- - Current Zone Detailed map
- Not required for the slice but worth deciding intentionally.

### 7.6 Small Tweaks
- Buttons like "Talk to Commander Vasek" and "Access Terminal" are too easy to not notice. They need to be more obvious.
- Tablet > Messages often, possibly always, have too much vertical spacing between paragraphs.
- Zone Map have too many 1x1 rooms. There should be more variateion in room size.

---

## Phase 8 — Save Slot System

*Goal: Replace the unlimited PoC "runs" model with a proper 3-slot save system appropriate for a
shipped game.*

### Context

The current system uses a `runs` table with no slot cap. Each new game creates a new UUID-keyed row,
which accumulates indefinitely. The "Load Latest" flow only surfaces one save. This is acceptable
for development but not for players. The dual `json` / `checkpoint_json` auto-save/checkpoint design
is good and should be preserved exactly as-is.

Internal code names (`RunState`, `RunEnvelope`, `newRun()`, etc.) can stay — only the player-facing
language and UX need to change.

### 8.1 Slot cap (server)

- Enforce a maximum of 3 save slots per user in `newRun()`.
- If the user already has 3 slots, return an error requiring them to overwrite an existing slot.
- Add a `deleteRun()` endpoint (or confirm the existing admin one is accessible to users) to allow
  slot overwrite from the UI.
- Clean up orphaned/stale runs (migration script to cap existing users at 3 most-recent slots).

### 8.2 SaveSummary extension (shared types)

- Add `level: number` and `roomTitle: string` to `SaveSummary` so the slot picker can display
  meaningful context without cross-referencing zone data.
- Server populates `roomTitle` by looking up the room in zone data at summary time.

### 8.3 Slot picker UI (client)

- Replace the landing page "Begin / Load Latest" buttons with a proper **3-slot save picker**.
- Each slot card shows: slot number, last known room title, player level, save timestamp, and
  run status (active / victory / defeat).
- Empty slots show a "New Game" prompt.
- Occupied slots show "Continue" and an overwrite/delete affordance.
- The current "Begin!" flow becomes the empty-slot new game path.

### 8.4 Admin panel

- Keep the "All Runs" admin view as internal superuser tooling — it is useful for debugging and
  moderation and should not be removed.
- No player-facing equivalent is needed.

---

## Phase 9 — Asset Data Infrastructure

*Goal: Establish the data plumbing that all art production depends on. No raw path strings in entity
data; every visual asset is registered, typed, and referenced by ID.*

### Context

The current build's data model already has several pieces in place — `PropDef` (kind: `prop`) is
seeded and referenced by rooms, `surfaceDefaults` / `surfaceOverrides` handles zone texture
inheritance, and NPC `portraitAssetId` is wired into the interaction modal and viewport card.
What is still missing is a formal asset registry that ties all of these together, so that swapping
or adding art is a data operation rather than a code change. Phase 9 completes that infrastructure
before any art production begins.

### 9.1 Art specification document

Before any asset production begins, produce `docs/art_spec.md` defining:
- Canonical sprite resolution: **256×256px** for enemies, NPC portraits, room textures, and props
- Scaling method: nearest-neighbor (`image-rendering: pixelated`) throughout
- File format per asset category: `.png` for sprites/portraits/icons; `.jpg` or `.png` for tiling
  textures; `.mp3` / `.ogg` for audio
- Color palette constraints and tone guidelines tied to the setting bible
- Tile dimensions for wall/floor texture assets
- Naming convention for asset IDs and file paths

### 9.2 Asset registry

- Add `kind: 'asset'` rows to `world_data`. Each row has an `id`, `path`, `type`
  (`texture` | `sprite` | `portrait` | `icon` | `audio` | `mesh`), and optional metadata
  (dimensions, format notes).
- Entity JSON (`Item`, `Enemy`, `ZoneRoom`, `NPC`, `PropDef`, etc.) references asset IDs rather
  than raw path strings. Swapping art requires only a data row update, no code change.
- Server resolves asset IDs → paths at bootstrap time and returns a flat `assetMap` to the client.
- Deprecate the current hardcoded `AssetManifest` in favour of this dynamic registry.
- Add `kind: 'asset'` to the admin panel as a read-only asset browser (list view with type
  filter, id, path, and preview thumbnail). Editing asset paths should be possible but clearly
  marked as advanced / destructive.

### 9.3 Texture set formalization

- The zone surface system (`surfaceDefaults` / `surfaceOverrides`) is already implemented and
  working. This phase formalizes it as a first-class data type.
- Define a `TextureSet` type: `{ id, wallAssetId, floorAssetId, ceilingColor }`.
- Add `kind: 'textureset'` to `world_data` and seed one row per zone surface variant.
- `Zone.surfaceDefaults` and `ZoneRoom.surfaceOverrides` reference a `textureSetId` rather than
  raw path fields. Per-room individual overrides remain possible for exceptional cases.
- Migrate the existing `WALL_MAINT_A`, `WALL_MAINT_B`, etc. constants in `world.ts` to seeded
  `TextureSet` rows. The constants become IDs rather than path strings.

### 9.4 Prop asset linking

- `PropDef` is already seeded with `id`, `name`, `description`, and `iconLabel`. This phase adds
  the asset dimension.
- Add `assetId` (references asset registry) and `renderHint` (`billboard` | `mesh` | `none`) to
  `PropDef`.
- The 2D `assetId` is used in the viewport room-content card (already rendered as a card overlay).
- The `renderHint` determines how the prop is rendered in the 3D viewport when 3D prop rendering
  is implemented (Phase 11).
- Produce placeholder prop icon assets (simple silhouettes are sufficient at this stage) and wire
  them into the room-content card so the card has an image rather than a text badge.

---

## Phase 10 — Room and World Visual Pass

*Goal: Replace flat placeholder surfaces with final art in the 3D viewport and bring the map and
UI chrome to a shippable standard.*

### 10.1 Room texture art

- Produce final wall and floor texture tiles for each surface variant used across the five zones:
  `wall-maint-a`, `wall-maint-b`, `floor-station-a`, and any additional types added in Phase 6.
- Each texture tile: 256×256px, seamlessly tileable.

### 10.2 Room tinting system

- The `ceilingColor` field is per-room and already data-driven. Extend it to function as a
  **room color** that tints wall, floor, and ceiling surfaces rather than only coloring the
  ceiling plane.
- Implement tint as a Three.js material color multiplier so the same texture tiles read differently
  across zones and room types. This gives visual variation without requiring unique texture art per
  room.

### 10.3 Viewport geometry enhancements

- Add door frame geometry at passable edges (currently a flat opening with no frame).
- Vary ceiling height between room types where atmospherically appropriate (e.g. corridors vs.
  vaulted chambers).
- Verify that the tinting system renders correctly against final texture art at target quality.

### 10.4 Mini-map visual pass

- Replace solid colored grid cells with outlined room shapes that respect actual room dimensions
  (`w` and `h` values are already in room data).
- Add zone name header above the map.
- Add a distinct player position marker (directional arrow or facing indicator).
- Color-code room states: undiscovered (hidden) / discovered / current room.

### 10.5 UI chrome and HUD icons

- Produce small icon assets for stat labels: HP, credits, level, XP, attack, defense.
- Add mode indicator icons to the status ribbon or HUD (explore, combat, victory, defeat).
- Review and tighten all button affordances — "Talk to NPC" and "Access Terminal" interactive
  buttons are currently easy to miss and should be visually elevated.

---

## Phase 11 — Character and Entity Art

*Goal: Replace all placeholder sprites and portraits with final art, and wire them into the
UI components that already exist for them.*

### 11.1 Enemy sprites

- Produce sprite art for each enemy in the roster: Vermin Cluster, Corroded Unit, Station Drifter,
  Security Automaton, Boarder, and any enemies added in Phase 6.
- All sprites: 256×256px, transparent background, nearest-neighbor scaling.
- Add a sprite display region to the combat banner — `Enemy.spritePath` is defined but currently
  unused in the combat UI.

### 11.2 NPC portraits

- Produce portrait art for each NPC: Commander Vasek and any NPCs added in Phase 5.
- All portraits: 256×256px, consistent framing (head and shoulders, facing roughly forward).
- The dialogue modal portrait slot and viewport room-content card portrait slot are already
  implemented and waiting for real art.

### 11.3 Item icons

- Produce final icons for all items: Maintenance Hook, Impact Plating, Transit Key, Station
  Medkit, Service Blade, Signal Core, Sphereal Sidearm, and any items added in Phase 6.
- All icons: 32×32px or 64×64px depending on display context; pixel-art style.
- All `Item.iconPath` values currently point to placeholder stubs.

### 11.4 Prop sprites and 3D rendering

- Produce 2D icon art for each `PropDef` entry (24 props across five zones) to display in the
  viewport room-content card overlay (already implemented).
- Implement prop billboard rendering in the 3D viewport using the `renderHint` field set in
  Phase 9.4 — a sprite facing the camera at the room's prop position.
- Props with `renderHint: 'mesh'` can be deferred; billboard sprites are sufficient for the slice.

---

## Phase 12 — Audio Pass

*Goal: Complete the audio experience beyond the music tracks already implemented.*

### Context

Music playback is fully implemented — title, exploration, combat, death, and credits tracks load
from `/music/`, cross-fade on state change, and are controlled by the Settings overlay. This phase
covers sound effects and any remaining audio polish.

### 12.1 Sound effects

- Identify the key interaction points that benefit from audio feedback: footstep on room entry,
  door/airlock transition, combat hit, combat defeat, item pickup, terminal access, level-up.
- Produce or source short SFX assets for each (`.mp3` format, registered in the asset registry
  added in Phase 9.2).
- Implement an SFX playback layer separate from the music channel so effects and music coexist
  without interrupting each other.

### 12.2 Audio settings expansion

- Extend the Settings overlay to include separate Music and SFX volume sliders (currently a single
  volume control exists for music only).
- Persist audio preferences to localStorage alongside the existing music toggle.

---

## Phase 13 — Death, Victory, and End Screens

*Goal: Give the major narrative endpoints visual weight appropriate for a shipped game.*

### 13.1 Death screen art

- Add a background image or illustrated element to the death modal (red-tinted wreckage, darkness,
  a cracked visor).
- Keep the existing text and button layout; art sits behind or alongside it.

### 13.2 Victory / Echo Transit screen art

- Add a background image or illustrated element to the victory modal (signal transmission burst,
  the Hollow Star viewed from inside, Aligned Forces emblem).
- This is the narrative climax of the vertical slice — it deserves more visual weight than the
  current plain modal.

### 13.3 Credits screen

- Implement a scrolling credits screen triggered after the victory modal is dismissed.
- Play the End Credits music track (already exists in the audio system) during the scroll.
- Credits list: project title, key contributors, tooling, and any asset attributions.



---


## Implementation Order Summary

| Phase | Description | Complexity | Status |
|-------|-------------|------------|--------|
| 1 | Foundation cleanup | Low | ✅ Done (1.2 equipment scroll: minor gap) |
| 2 | Character advancement | Medium | ✅ Done |
| 3 | Quest system | High | ✅ Done (3.6 zone editor drag/resize: partial) |
| 4 | Tablet system | High | ✅ Done |
| 5 | NPCs and dialogue | Medium | ✅ Done |
| 6 | Zone content and story | High | ✅ Done |
| 7 | Polish and slice completion | Medium | 🔶 Partial (7.4 responsive, 7.6 tweaks) |
| 8 | Save slot system | Medium | ✅ Done |
| 9 | Asset data infrastructure | Medium | ⬜ Not started |
| 10 | Room and world visual pass | High | ⬜ Not started |
| 11 | Character and entity art | High | ⬜ Not started |
| 12 | Audio pass | Medium | ⬜ Not started (music fully done; SFX not started) |
| 13 | Death, victory, and end screens | Low | ⬜ Not started |

**Phase 7 remaining gaps:**
- 7.4 Responsive layout — needs formal testing on laptop-sized viewports; equipment panel overflow not fully verified
- 7.6 Small tweaks — interact/terminal button visibility; tablet message paragraph spacing; room size variety in zone maps

**Phase 3 remaining gap:**
- 3.6 Zone editor — drag-to-move and drag-to-resize rooms not confirmed implemented; numeric x/y/w/h sidebar inputs status unknown

**Completed ahead of their phase (already in codebase):**
- Surface texture system (surfaceDefaults / surfaceOverrides): ✅ done — Phase 9/10 prereq
- PropDef system (kind: prop, seeded, wired to rooms): ✅ done — Phase 9 prereq
- NPC portraitAssetId field and dialogue modal portrait slot: ✅ done — Phase 9/11 prereq
- Viewport room-content card overlay system: ✅ done — Phase 10 prereq
- Music playback system with settings control: ✅ done — Phase 12 partial
- Asset registry, TextureSet formalization, prop asset IDs: ⬜ Phase 9

Next Steps:
- Future reference: tablet progression and post-slice tablet upgrade concepts are tracked in
`docs/Player Tablet.md`.
- Additional Zones
- Further the story using the added game mechanics above.


---

## Out of Scope for the Vertical Slice

The following are confirmed future systems, not slice targets:

- Tablet upgrade progression track
- Faction relationship tracking
- Branching dialogue
- Multiple endings
- Crafting or neodymium economy mechanics
- Full Sphere interior zone map
- Character creation or class selection
- Multiplayer or co-op
