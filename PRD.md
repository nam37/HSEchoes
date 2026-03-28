# PRD: Echoes of the Hollow Star

## 1. Project Overview

**Project name:** Echoes of the Hollow Star  
**Repository path:** `C:\ClineProjects\BardsTale9`  
**Project type:** Local-only retro dungeon crawler proof of concept  
**Status:** Implemented PoC, playable and verified  
**Primary stack:** React + Vite + TypeScript, three.js, Fastify, SQLite (`better-sqlite3`)

Echoes of the Hollow Star is an original homage to classic first-person dungeon crawlers in the Bard's Tale tradition. The current implementation is a compact, single-run vertical slice focused on the crawler core: first-person grid movement, authored dungeon exploration, turn-based combat, inventory/equipment, and local save/load.

This document is intended to be the handoff source of truth for moving the work into a new Codex App project.

## 2. Product Vision

Deliver a playable retro dungeon crawler that feels immediate, atmospheric, and legible:

- First-person dungeon exploration with deliberate, tile-based movement.
- Strong retro tone without copying an existing IP directly.
- Short, complete gameplay loop that proves the core experience.
- Data-backed content and saves so the prototype can grow cleanly.
- A browser-based experience that is easy to run locally and easy to extend.

## 3. Product Goals

### Primary goals

- Prove that a web stack can support a classic crawler loop with satisfying presentation.
- Establish a clean split between frontend rendering, backend game orchestration, and shared contracts.
- Keep the dungeon content authored and deterministic rather than procedural.
- Support a short full run from start to victory/defeat.

### Secondary goals

- Make it easy to swap placeholder assets for better art later.
- Keep the codebase straightforward enough for rapid iteration in Codex.
- Preserve a testable service layer so gameplay changes are safe.

### Non-goals for this PoC

- Party management
- Town/shop meta loop
- Procedural generation
- Multiplayer
- Account system or cloud saves
- Full audio pipeline
- Production content scale

## 4. Current Product Scope

The implemented PoC includes:

- A standalone monorepo-style project with `client/`, `server/`, `shared/`, and `tests/`.
- A 10-cell authored dungeon with a clear victory route.
- First-person grid navigation with `forward`, `turn-left`, and `turn-right`.
- Three encounter types:
  - Rat Scavenger
  - Drowned Acolyte
  - Bone Sentinel
- Turn-based combat with:
  - Attack
  - Defend
  - Use Item
  - Flee
- Inventory and equipment support for:
  - weapon
  - armor
  - accessory
  - consumable
- Local SQLite save slots and run-state persistence.
- Shared TypeScript contracts for client/server consistency.
- Placeholder raster textures, sprites, icons, and a title splash.
- Passing tests and successful production build.

## 5. Target Experience

The player descends beneath the Hollow Gate, explores a compact dungeon, survives encounters, gathers key items, defeats the reliquary guardian, recovers the Star Sigil, and reaches the final sanctum to win.

The intended feel is:

- Claustrophobic but readable
- Retro and low-fi rather than photoreal
- Quick to start
- Easy to understand at a glance
- Structured around exploration tension and short tactical combat

## 6. User Story

As a player, I want to launch a browser-based retro crawler, start a run immediately, move through a small dungeon in first person, fight enemies, manage a small set of items, save progress locally, and reach a meaningful ending in one session.

## 7. Platform and Runtime Assumptions

- Desktop-first local development target
- Browser frontend served by Vite during development
- Local Node server serving API routes and managing SQLite
- No authentication
- No internet dependency required after install
- Windows-friendly development environment, but the stack itself is portable

## 8. Technical Architecture

### Frontend

**Path:** `client/`

- React 19 + TypeScript
- Vite for dev/build
- three.js for the first-person viewport
- CSS-driven retro UI shell

Key responsibilities:

- Render the viewport and HUD
- Call backend API endpoints
- Display movement/combat/inventory controls
- Display action log and discovered map
- Render item icons and enemy sprites

### Backend

**Path:** `server/`

- Fastify API server
- SQLite via `better-sqlite3`
- Deterministic game-state service layer

Key responsibilities:

- Seed and read authored world data
- Create, load, save, and mutate runs
- Resolve movement and combat
- Apply item, encounter, loot, and victory logic
- Return API-safe envelopes to the client

### Shared contracts

**Path:** `shared/`

Defines shared runtime contracts and helper functions used by both sides, including:

- `DungeonCell`
- `Encounter`
- `Enemy`
- `Item`
- `PlayerState`
- `CombatState`
- `RunState`
- `BootstrapData`
- `ApiResult`

## 9. Repository Structure

```text
C:\ClineProjects\BardsTale9
├─ client/
│  ├─ public/assets/
│  └─ src/
├─ server/
│  └─ src/
├─ shared/
│  └─ src/
├─ tests/
├─ data/
├─ dist/
├─ package.json
├─ README.md
└─ PRD.md
```

## 10. Gameplay Design

### Core loop

1. Start a new run.
2. Enter the dungeon.
3. Move tile by tile through authored rooms.
4. Trigger encounters and loot events.
5. Equip useful gear and use consumables.
6. Defeat the final guardian.
7. Reach the sanctum with the Star Sigil.
8. End in victory or defeat.

### Movement rules

- Movement is grid-based and deterministic.
- The player has a facing direction.
- `forward` attempts to move into the next cell based on facing.
- `turn-left` and `turn-right` rotate in place.
- Walls block movement.
- Open, gate, and door faces permit directional progression when a valid neighboring cell exists.

### Combat rules

- Combat is entered automatically when stepping into an uncleared encounter cell.
- The player cannot move while combat is active.
- Combat options:
  - `attack`
  - `defend`
  - `use-item`
  - `flee`
- Damage is deterministic-ish with lightweight RNG.
- Equipment modifies attack/defense.
- Consumables currently support healing.
- Some encounters can block fleeing.

### Progression rules

- Loot is granted on first discovery or encounter victory.
- Encounters can reward key items.
- The final sanctum only grants victory if the player has the `star_sigil`.
- HP reaching zero ends the run in defeat.

## 11. Current World Content

### Dungeon cells

The world currently ships with these authored locations:

- Hollow Gate
- Lantern Antechamber
- Fallen Scriptorium
- Moon Shrine
- Watch Armory
- Flooded Passage
- Echo Bridge
- Banner Hall
- Broken Reliquary
- Star Sanctum

### Items

- Rusted Blade
- Gate Mail
- Moon Charm
- Amber Draught
- Star Sigil

### Enemies

- Rat Scavenger
- Drowned Acolyte
- Bone Sentinel

### Encounter roles

- Early encounter to establish risk and reward
- Mid encounter that reinforces dungeon atmosphere and grants key equipment
- Final guardian encounter gating victory progression

## 12. API Contract

The current API surface is local-only and JSON-based.

### Endpoints

- `GET /api/game/bootstrap`
  - Returns title, intro, authored content, asset manifest, and save summaries.

- `POST /api/game/new-run`
  - Creates a fresh run and returns the initial `RunState`.

- `GET /api/game/run/:slotId`
  - Loads a saved run by slot id.

- `POST /api/game/move`
  - Applies a movement command and returns an updated run envelope.

- `POST /api/game/combat`
  - Applies a combat action and returns an updated run envelope.

- `POST /api/game/inventory/use`
  - Uses an inventory item.

- `POST /api/game/inventory/equip`
  - Equips or stows an inventory item.

- `POST /api/game/save/:slotId`
  - Persists the latest run state.

### Response shape

Most endpoints return:

```ts
ApiResult<RunEnvelope>
```

Bootstrap returns:

```ts
ApiResult<BootstrapData>
```

## 13. Persistence Model

SQLite is used for two concerns:

### `world_data`

Stores seeded authored content:

- meta/bootstrap
- cells
- items
- enemies
- encounters

### `runs`

Stores save slots:

- `slot_id`
- serialized `RunState`
- created timestamp
- updated timestamp

This approach keeps the PoC simple while still giving it a content/data boundary that can scale later.

## 14. Visual and Asset Strategy

### Current state

The current project includes local placeholder raster assets under:

- `client/public/assets/textures`
- `client/public/assets/sprites`
- `client/public/assets/ui`

These include:

- stone wall texture
- granite floor texture
- iron gate texture
- parchment panel texture
- title splash
- 3 enemy sprites
- 5 item icons

### Important note

The original implementation plan assumed use of the built-in `image_gen` workflow for new raster assets. In this session, that tool was not available, so placeholder PNGs were generated locally to keep the PoC functional. The filenames are intentionally stable so future art replacement does not require code changes.

### Asset direction for future work

Replace placeholders with more intentional generated or hand-authored assets that preserve:

- readable silhouettes
- retro fantasy mood
- low-fi painted/sprite-inspired treatment
- original worldbuilding
- no direct franchise mimicry or copied iconography

## 15. UX and UI Notes

The current UI includes:

- title/header panel
- main three.js viewport
- movement controls
- explorer stats panel
- combat panel
- inventory panel
- discovered-map panel
- action log panel
- save/load actions

The styling direction is intentionally warm, dungeon-like, and a little theatrical rather than generic web-app neutral.

## 16. Key Files

### Product-critical files

- `client/src/App.tsx`
- `client/src/components/DungeonViewport.tsx`
- `client/src/lib/api.ts`
- `client/src/styles/global.css`
- `server/src/services/gameService.ts`
- `server/src/content/world.ts`
- `server/src/routes/gameRoutes.ts`
- `server/src/db/database.ts`
- `server/src/db/seed.ts`
- `server/src/app.ts`
- `shared/src/index.ts`

### Validation and safety files

- `tests/gameService.test.ts`
- `tests/api.test.ts`
- `tests/content.test.ts`
- `tests/client.test.tsx`

## 17. Commands

### Install

```bash
npm install
```

### Seed database

```bash
npm run db:seed
```

### Start dev environment

```bash
npm run dev
```

### Run tests

```bash
npm run test
```

### Build production artifacts

```bash
npm run build
```

## 18. Verification Status

Verified in the current workspace:

- `npm install`
- `npm run db:seed`
- `npm run test`
- `npm run build`

Current state at handoff:

- Test suite passes.
- Client and server both build successfully.
- SQLite seed flow works.
- PoC is ready for iterative expansion.

## 19. Known Limitations

- The art is placeholder quality.
- There is no audio.
- There is no town/meta loop.
- No party system or classes.
- The dungeon is intentionally short.
- Save slots are raw local state, not versioned migrations.
- The client build emits a large bundle warning because `three` is included in one chunk.
- No production deployment pipeline is configured yet.

## 20. Recommended Next Steps

### High-priority product improvements

- Replace placeholder raster art with cohesive generated or hand-authored assets.
- Expand dungeon content from one short run into a richer floor or multi-floor slice.
- Add doors, locks, or simple environmental gating to deepen exploration.
- Add combat feedback polish such as hit flashes, camera punch, and better enemy staging.
- Add title-screen splash usage and a more explicit start/load screen.

### High-priority technical improvements

- Split the large client bundle with route-level or component-level chunking.
- Introduce a content loader or JSON content pipeline if authored world data grows.
- Add lightweight migration/version handling for saved runs.
- Improve test coverage around edge-case combat and persistence behavior.
- Add a proper dev script for serving built assets from the backend in production mode.

### Optional system expansions

- Party members or companions
- Spellcasting and mana
- Shops and economy loop
- Dungeon events and interactable props
- Multiple endings or alternate routes
- Soundscape and music

## 21. Development Phases

The next Codex projects should treat this roadmap as phased continuation work, not a reset. Each phase is intended to be valuable on its own and should preserve the existing architecture unless a strong reason emerges to change it.

### Phase 1: Art and Atmosphere Polish

Goal: replace placeholder visuals with a cohesive retro-fantasy presentation pass.

Focus areas:

- Replace placeholder textures, sprites, icons, and title splash with higher-quality raster assets.
- Improve viewport atmosphere with better lighting, fog tuning, material variation, and stronger room identity.
- Make the current title/header experience feel more like a game front-end and less like a raw prototype shell.
- Preserve existing asset filenames where possible so code changes stay minimal.

Success criteria:

- The current playable slice feels visually intentional and shippable as a polished prototype.
- Asset replacement does not break gameplay or require large architectural changes.

### Phase 2: Content Expansion

Goal: deepen the playable slice while keeping the crawler core intact.

Focus areas:

- Expand from the current compact dungeon into a richer floor or multi-floor slice.
- Add more rooms, environmental variation, gated routes, optional exploration, and alternate combat sequences.
- Introduce more authored loot, encounter variety, and stronger dungeon pacing.
- If content volume increases significantly, consider moving world definitions toward a cleaner content-loading pipeline.

Success criteria:

- The game supports a longer and more varied run without losing readability.
- Content growth remains data-driven and maintainable.

### Phase 3: Combat and Moment-to-Moment Feel

Goal: make interactions feel more satisfying without overcomplicating the ruleset.

Focus areas:

- Add stronger combat feedback such as hit flashes, enemy reactions, camera movement, and clearer status messaging.
- Improve action readability, pacing, and UI affordances during fights.
- Add light mechanical depth only if it supports clarity, such as better item differentiation, enemy behavior variation, or simple tactical tradeoffs.
- Keep the backend as the authority for state transitions and combat resolution.

Success criteria:

- Combat becomes more tactile and understandable.
- The game remains easy to reason about and test.

### Phase 4: Save/Load and Product Hardening

Goal: make the prototype more durable for ongoing development and repeated play.

Focus areas:

- Add save schema/version awareness or lightweight migration handling.
- Tighten persistence edge cases and improve test coverage around save/load behavior.
- Improve bootstrap, resume, and failure handling flows.
- Reduce hidden technical debt in the backend service layer and API responses without redesigning the whole app.

Success criteria:

- Save data is more robust against future iteration.
- Core gameplay and persistence behavior are safer to extend.

### Phase 5: Performance and Technical Optimization

Goal: improve runtime efficiency and delivery quality after the product shape is more stable.

Focus areas:

- Reduce the large client bundle, especially around three.js usage and chunking.
- Introduce code splitting or manual chunking where it produces clear benefit.
- Improve production-mode serving and deployment ergonomics.
- Optimize rendering and asset loading only after measuring the current bottlenecks.

Success criteria:

- Build output is leaner and easier to ship.
- Technical improvements do not come at the cost of maintainability or product momentum.

Phase ordering guidance:

- Phase 1 and Phase 2 are the best default next steps if the goal is visible product progress.
- Phase 3 is the best next step if the game already has enough content but lacks punch.
- Phase 4 is best if repeated iteration or save compatibility becomes painful.
- Phase 5 is best after the game shape is more settled or if performance becomes a blocker.

## 22. Handoff Guidance for a New Codex Project

When moving this into a new Codex App project, treat this repository as a working PoC rather than a blank concept. The next project should assume:

- the current architecture is valid and should be extended, not replaced casually
- the shared contract layer is important and should remain the schema boundary
- the backend owns gameplay state transitions
- the frontend should stay focused on rendering and input
- future art improvements should preserve current asset paths where possible
- future feature planning should respect the retro crawler core before adding meta systems

A good immediate objective for the next Codex project would be one of:

- art polish pass
- dungeon/content expansion
- combat polish pass
- save/load robustness and versioning
- bundle/performance optimization

## 23. Summary

Echoes of the Hollow Star is a complete, playable browser-based crawler core PoC with a clear architecture, verified runtime, authored content, and room to grow. It already proves the intended product direction: a retro first-person dungeon crawler with modern web tooling, local persistence, and a clean separation between presentation and game rules.

