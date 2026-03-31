# Echoes of the Hollow Star — Art Specification

This document defines canonical resolutions, file formats, and tone guidelines for all visual
assets in the game. It must be agreed before Phase 9 asset production begins. Any changes to
these decisions after production starts will require rework.

---

## Tone and Aesthetic

Assets should feel:
- **Worn and industrial** — nothing is clean or new. Everything has been repaired, patched,
  or held together longer than it should have been.
- **Retro sci-fi** — think frontier stations, corroded hardware, dim utility lighting.
  Not sleek modern sci-fi. Not fantasy. Not grimdark horror.
- **Human-scale** — even in a vast megastructure setting, the player's immediate environment
  is cramped corridors, small holds, and functional spaces.
- **Slightly haunted** — the station is damaged and largely empty. Atmosphere over gore.

Reference the setting bible (`docs/echoes_of_the_hollow_star_setting_bible.md`) for
narrative context before producing any asset.

---

## Color Palette

The UI palette is defined in `global.css` and should inform art tone:

| Role | Hex | Usage |
|------|-----|-------|
| Background | `#000814` | Deep space black |
| Accent / cyan | `#00d4ff` | Active UI elements, power indicators |
| Accent strong | `#40eaff` | Highlights, hover states |
| Danger / red | `#ff3040` | Combat, damage, death |
| Warn / amber | `#ffaa00` | Caution states |
| Text | `#a8d8f0` | Body copy, pale blue-grey |
| Orange accent | `#df5e33` | Equipped items, secondary UI |

Art does not need to be strictly limited to this palette, but should feel coherent with it.
Avoid saturated greens or purples — they read as fantasy, not industrial sci-fi.

---

## Sprite Assets (PNG)

All sprite art uses **PNG** format for lossless quality and hard transparency edges.
Rendered via `image-rendering: pixelated` (nearest-neighbor scaling) throughout.

| Asset category | Native resolution | Notes |
|----------------|-------------------|-------|
| Enemy sprites | **256 × 256 px** | Combat display, front-facing |
| NPC portraits | **256 × 256 px** | Dialogue panel, bust or head shot |
| Item icons | **256 × 256 px** | Inventory grid display |
| Room prop sprites | **256 × 256 px** | Billboard-rendered in 3D viewport |
| UI stat icons | **32 × 32 px** | HP, credits, level, XP indicators |
| Player position marker | **32 × 32 px** | Mini-map directional arrow |
| Death / victory art | **1024 × 576 px** | Background panel art, not pixel-art style |

**Sprite production notes:**
- Design at native resolution; the engine scales up via nearest-neighbor
- Use a transparent background for all sprites and icons
- Avoid anti-aliasing on pixel art edges — keep hard pixel boundaries
- Enemy sprites face right by default (flipped in code if needed)

---

## Texture Assets (WebP)

Wall, floor, and ceiling textures use **WebP** for compression and quality balance.

| Asset category | Tile resolution | Notes |
|----------------|-----------------|-------|
| Wall textures | **512 × 512 px** | Tileable, horizontal repeat |
| Floor textures | **512 × 512 px** | Tileable |
| Ceiling textures | **512 × 512 px** | Tileable; most rooms use `ceilingColor` instead |

**Texture production notes:**
- All textures must tile seamlessly
- Design for low ambient lighting — textures should not rely on bright surface color
  for readability; bake lighting hints into the texture itself
- Texture sets group wall + floor + ceiling into a named category (e.g. `maintenance_corridor`,
  `flooded_section`, `secure_hold`) — see Phase 9.0 for the `TextureSet` data structure

---

## 3D Mesh Assets (GLB)

Props and architectural geometry use **GLB** (binary glTF 2.0).

| Asset category | Notes |
|----------------|-------|
| Room props (terminals, crates, etc.) | Low-poly, baked lighting, single GLB per prop type |
| Door frames | Low-poly archway geometry, placed at passable edges |
| Other architectural details | Deferred — scope per zone in Phase 9 |

**Mesh production notes:**
- Keep geometry low-poly — the corridor renderer is stylised, not photorealistic
- Bake ambient occlusion into vertex colors or a lightmap texture where possible
- Enable Draco compression for any mesh over ~50KB
- GLB files embed their textures — use WebP for embedded texture maps
- Coordinate system: Y-up, Z-forward (Three.js default)
- Scale: 1 unit = 1 grid square in the zone model

---

## UI Icons (SVG)

Stat labels, mode indicators, and other scalable UI chrome use **SVG**.

- Design to work at 16–32px rendered size
- Use `currentColor` for strokes/fills where possible so CSS variables control theming
- Keep paths simple — these are utility icons, not illustrations

---

## Victory / Death Screen Art (WebP)

Full-panel background art for the death and victory modals.

- **1024 × 576 px** (16:9, scales to fit modal)
- Painterly or illustrated style — not pixel art
- Death: dark, wreckage, signal lost aesthetic
- Victory: signal transmission, Hollow Star silhouette in deep space

---

## Asset Naming Convention

```
/assets/
  textures/         wall-{set}.webp, floor-{set}.webp
  sprites/          enemy-{id}.png, prop-{id}.png
  portraits/        npc-{id}.png
  icons/            item-{id}.png, ui-{name}.svg
  meshes/           prop-{id}.glb, arch-{id}.glb
  screens/          screen-death.webp, screen-victory.webp
```

All asset ids match the corresponding `world_data` entity id where applicable.

---

## What Must Be Decided Before Production

- [ ] Final enemy roster confirmed (Phase 6 scope locked)
- [ ] Final NPC roster confirmed (Phase 5 scope locked)
- [ ] Final item roster confirmed (Phase 6 scope locked)
- [ ] Texture set names and room type list finalized
- [ ] Asset registry DB structure implemented (Phase 9.0)
- [ ] Color palette sign-off against a sample sprite at 256×256
