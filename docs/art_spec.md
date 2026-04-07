# Echoes of the Hollow Star Art Spec

This document defines the asset contract for Echoes of the Hollow Star. The intent is that any future art swap happens by updating asset data rows, not by changing runtime code.

## Canonical Resolution

- Enemy sprites: `256x256px`
- NPC portraits: `256x256px`
- Prop icons: `256x256px`
- Room textures: `256x256px`

All authored source assets for these categories should target that resolution unless a later technical exception is documented.

## Scaling

- Use nearest-neighbor scaling everywhere in the client.
- CSS-rendered bitmap assets should use `image-rendering: pixelated`.
- Runtime texture and sprite sampling should preserve crisp pixel edges and avoid smoothing.

## File Formats

- Sprites: `.png`
- NPC portraits: `.png`
- Prop icons: `.png`
- Wall and floor textures: `.png` or `.jpg`
- Audio: `.mp3` or `.ogg`

Stub placeholders may temporarily use `.svg` during infrastructure phases, but production replacements should follow the formats above.

## Texture Tile Dimensions

- Wall textures tile on a `256x256px` square.
- Floor textures tile on a `256x256px` square.
- Textures must tile seamlessly with no visible seams at repeat boundaries.

## Color Palette Guidance

- Overall tone: dark industrial sci-fi
- Accent lights and interface glows: cyan
- Warning, hazard, and access accents: amber
- Keep the palette limited and restrained
- Favor worn metals, smoke-dark neutrals, oil blues, and muted rust notes over saturated fantasy colors

## Asset ID Naming

- Use kebab-case only.
- Prefix every ID by asset type.
- Examples:
  - `tex-wall-maint-a`
  - `spr-enemy-boarder`
  - `portrait-vasek`
  - `icon-medkit`
  - `audio-combat-1`

## File Paths

Assets live under `client/public/`, grouped by type:

- `/textures/`
- `/sprites/`
- `/portraits/`
- `/icons/`
- `/music/`

Existing legacy assets under `/assets/...` are valid during migration, but new production assets should follow the type-specific root folders above.
