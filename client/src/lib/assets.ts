import type { AssetDef, TextureSet } from "../../../shared/src/index";

export const FALLBACK_ASSET_PATH = "/portraits/npc-placeholder.svg";

export function buildAssetMap(assets: AssetDef[]): Map<string, AssetDef> {
  return new Map(assets.map((asset) => [asset.id, asset]));
}

export function buildTextureSetMap(textureSets: TextureSet[]): Map<string, TextureSet> {
  return new Map(textureSets.map((textureSet) => [textureSet.id, textureSet]));
}

export function resolveAssetPath(id: string | undefined, assetMap: Map<string, AssetDef>): string {
  if (!id) {
    return FALLBACK_ASSET_PATH;
  }

  const asset = assetMap.get(id);
  if (asset) {
    return asset.path;
  }

  // Phase 9 still carries some legacy raw paths in entity data.
  if (id.startsWith("/")) {
    return id;
  }

  return FALLBACK_ASSET_PATH;
}

export function isVisualAsset(asset: AssetDef): boolean {
  return asset.type === "texture" || asset.type === "sprite" || asset.type === "portrait" || asset.type === "icon";
}
