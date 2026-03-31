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
- Starting tool (replaces rusted blade)
- Station medkit (consumable)
- Salvaged armour (armor slot)
- Sphereal sidearm (weapon slot, found on enemy ship)
- Neodymium fragment (key item / story object, not equippable)

### 6.4 Quest content
- Write all quest titles, descriptions, objectives, and tablet messages in-world voice.
- Ensure neodymium clues are seeded through terminal logs in Phases 3–4 of the station.

---

## Phase 7 — Polish and Slice Completion

*Goal: Make the slice feel like a real game, not a prototype.*

### 7.1 Victory condition update
- Current: find Star Sigil, place on altar (fantasy placeholder).
- Replace with: survive the station attack, board the enemy ship, survive Echo Transit,
  receive first contact from Aligned Forces inside the Sphere.

### 7.2 Death screen copy
- Update death text to use setting-appropriate language.

### 7.3 Landing page
- Replace "Retro Dungeon PoC" branding with actual game title treatment.
- Intro text should reflect the actual setting opening.

### 7.4 Responsive layout
- Ensure the game is playable on a standard laptop screen without scrollbars.
- Equipment panel overflow fix (from Phase 1) fully resolved.

### 7.5 Audio stubs (optional)
- Placeholder ambient sound or silence-by-design decision made.
- Not required for the slice but worth deciding intentionally.

---

## Implementation Order Summary

| Phase | Description | Complexity | Priority |
|-------|-------------|------------|----------|
| 1 | Foundation cleanup | Low | Immediate |
| 2 | Character advancement | Medium | High |
| 3 | Quest system | High | High |
| 4 | Tablet system | High | High |
| 5 | NPCs and dialogue | Medium | Medium |
| 6 | Zone content and story | High | High |
| 7 | Polish and slice completion | Medium | Final |

Phases 1–4 are purely systemic and can be built before any new content exists.
Phases 5–6 require both systems and authored content in parallel.
Phase 7 is final integration and cannot begin until Phases 1–6 are substantially complete.

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
