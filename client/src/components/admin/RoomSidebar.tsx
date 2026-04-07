import { useEffect, useState } from "react";
import { resolveRoomSurfaces } from "../../../../shared/src/index";
import type { AssetDef, RoomSurfaces, TextureSet, Zone, ZoneLink, ZoneRoom } from "../../../../shared/src/index";

interface Props {
  zone: Zone;
  room: ZoneRoom;
  gridW: number;
  gridH: number;
  assetMap: Map<string, AssetDef>;
  textureSetMap: Map<string, TextureSet>;
  onChange: (room: ZoneRoom) => void;
  onClose: () => void;
}

export function RoomSidebar({ zone, room, gridW, gridH, assetMap, textureSetMap, onChange, onClose }: Props): JSX.Element {
  const [local, setLocal] = useState<ZoneRoom>({ ...room });

  useEffect(() => {
    setLocal({ ...room });
  }, [room]);

  function set<K extends keyof ZoneRoom>(key: K, val: ZoneRoom[K]): void {
    const updated = { ...local, [key]: val };
    setLocal(updated);
    onChange(updated);
  }

  function setGeom(key: "x" | "y" | "w" | "h", raw: number): void {
    let val = Math.max(key === "w" || key === "h" ? 1 : 0, raw);
    if (key === "x") val = Math.min(val, gridW - local.w);
    if (key === "y") val = Math.min(val, gridH - local.h);
    if (key === "w") val = Math.min(val, gridW - local.x);
    if (key === "h") val = Math.min(val, gridH - local.y);
    set(key, val);
  }

   const effectiveSurfaces = resolveRoomSurfaces(zone, local, { assetMap, textureSetMap });

  return (
    <aside className="zone-sidebar">
      <div className="zone-sidebar-header">
        <h3>Room Properties</h3>
        <button className="admin-modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="zone-sidebar-body">
        <label>ID<input value={local.id} onChange={(e) => set("id", e.target.value)} /></label>
        <label>Title<input value={local.title} onChange={(e) => set("title", e.target.value)} /></label>

        <div className="zone-sidebar-geom-grid">
          <label>X<input type="number" min={0} max={gridW - local.w} value={local.x} onChange={(e) => setGeom("x", Number(e.target.value))} /></label>
          <label>Y<input type="number" min={0} max={gridH - local.h} value={local.y} onChange={(e) => setGeom("y", Number(e.target.value))} /></label>
          <label>W<input type="number" min={1} max={gridW - local.x} value={local.w} onChange={(e) => setGeom("w", Number(e.target.value))} /></label>
          <label>H<input type="number" min={1} max={gridH - local.y} value={local.h} onChange={(e) => setGeom("h", Number(e.target.value))} /></label>
        </div>

        <div className="zone-sidebar-section-label">Surface Overrides</div>
        {renderTextureSetOverride()}
        {renderTextureOverride("Wall Texture", "wallTexture", effectiveSurfaces.wallTexture)}
        {renderTextureOverride("Floor Texture", "floorTexture", effectiveSurfaces.floorTexture)}
        {renderTextureOverride("Ceiling Texture", "ceilingTexture", effectiveSurfaces.ceilingTexture ?? "")}
        {renderColorOverride(effectiveSurfaces)}
        <label>Encounter ID<input value={local.encounterId ?? ""} onChange={(e) => set("encounterId", e.target.value || undefined)} /></label>
        <label>Prop<input value={local.prop ?? ""} onChange={(e) => set("prop", e.target.value || undefined)} /></label>
        <label>Loot (comma-separated IDs)
          <input
            value={local.loot?.join(", ") ?? ""}
            onChange={(e) => set("loot", e.target.value ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : undefined)}
          />
        </label>
        <label>
          <span style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input type="checkbox" checked={!!local.victory} onChange={(e) => set("victory", e.target.checked || undefined)} />
            Victory Room
          </span>
        </label>
        <label>Description<textarea value={local.description} rows={3} onChange={(e) => set("description", e.target.value)} /></label>
        <label>Discovery Text<textarea value={local.discoveryText ?? ""} rows={2} onChange={(e) => set("discoveryText", e.target.value || undefined)} /></label>

        <div className="zone-sidebar-section-label">Zone Link (portal to another zone)</div>
        <label>Target Zone ID
          <input
            value={local.zoneLink?.toZoneId ?? ""}
            placeholder="leave blank for none"
            onChange={(e) => setLink("toZoneId", e.target.value)}
          />
        </label>
        <label>Target Room ID<input value={local.zoneLink?.toRoomId ?? ""} onChange={(e) => setLink("toRoomId", e.target.value)} /></label>
        <label>Entry X<input type="number" value={local.zoneLink?.entryX ?? ""} onChange={(e) => setLink("entryX", Number(e.target.value))} /></label>
        <label>Entry Y<input type="number" value={local.zoneLink?.entryY ?? ""} onChange={(e) => setLink("entryY", Number(e.target.value))} /></label>
        <label>Entry Facing
          <select value={local.zoneLink?.facing ?? ""} onChange={(e) => setLink("facing", e.target.value || undefined)}>
            <option value="">— inherit —</option>
            <option value="north">north</option>
            <option value="south">south</option>
            <option value="east">east</option>
            <option value="west">west</option>
          </select>
        </label>
        <label>Transition Text<input value={local.zoneLink?.transitionText ?? ""} onChange={(e) => setLink("transitionText", e.target.value || undefined)} /></label>
      </div>
    </aside>
  );

  function setLink(key: keyof ZoneLink, val: unknown): void {
    const current = local.zoneLink ?? { toZoneId: "", toRoomId: "", entryX: 0, entryY: 0 };
    const merged = { ...current, [key]: val };
    const updated: ZoneRoom = { ...local, zoneLink: merged.toZoneId ? merged : undefined };
    setLocal(updated);
    onChange(updated);
  }

  function setSurfaceOverride(key: keyof RoomSurfaces, value: string | undefined): void {
    const nextOverrides = { ...(local.surfaceOverrides ?? {}) };
    if (value === undefined) {
      delete nextOverrides[key];
    } else {
      nextOverrides[key] = value;
    }
    const updated: ZoneRoom = {
      ...local,
      surfaceOverrides: Object.keys(nextOverrides).length > 0 ? nextOverrides : undefined,
    };
    setLocal(updated);
    onChange(updated);
  }

  function renderTextureSetOverride(): JSX.Element {
    const overrideValue = local.surfaceOverrides?.textureSetId;
    const inherited = overrideValue === undefined;
    const effectiveValue = local.surfaceOverrides?.textureSetId ?? local.textureSetId ?? zone.surfaceDefaults.textureSetId ?? "";
    return (
      <label>
        Texture Set
        <div className="zone-surface-row">
          <input
            value={inherited ? effectiveValue : overrideValue}
            placeholder={effectiveValue || "No texture set"}
            onChange={(e) => setSurfaceOverride("textureSetId", e.target.value.trim() || undefined)}
            disabled={inherited}
          />
          <button type="button" className="zone-surface-toggle" onClick={() => setSurfaceOverride("textureSetId", inherited ? effectiveValue || "" : undefined)}>
            {inherited ? "Override" : "Use Zone"}
          </button>
        </div>
        <span className="zone-surface-meta">
          Effective: {effectiveValue || "None"} {inherited ? "· inherited" : "· overridden"}
        </span>
      </label>
    );
  }

  function renderTextureOverride(label: string, key: "wallTexture" | "floorTexture" | "ceilingTexture", effectiveValue: string): JSX.Element {
    const overrideValue = local.surfaceOverrides?.[key];
    const inherited = overrideValue === undefined;
    return (
      <label>
        {label}
        <div className="zone-surface-row">
          <input
            value={inherited ? effectiveValue : overrideValue}
            placeholder={effectiveValue || "No texture"}
            onChange={(e) => setSurfaceOverride(key, e.target.value.trim() || undefined)}
            disabled={inherited}
          />
          <button type="button" className="zone-surface-toggle" onClick={() => setSurfaceOverride(key, inherited ? effectiveValue || "" : undefined)}>
            {inherited ? "Override" : "Use Zone"}
          </button>
        </div>
        <span className="zone-surface-meta">
          Effective: {effectiveValue || "None"} {inherited ? "· inherited" : "· overridden"}
        </span>
      </label>
    );
  }

  function renderColorOverride(effective: RoomSurfaces): JSX.Element {
    const overrideValue = local.surfaceOverrides?.ceilingColor;
    const inherited = overrideValue === undefined;
    const value = inherited ? effective.ceilingColor : overrideValue;
    return (
      <label>
        Ceiling Tint
        <div className="zone-surface-row">
          <input type="color" value={value} onChange={(e) => setSurfaceOverride("ceilingColor", e.target.value)} disabled={inherited} style={{ width: "2.5rem", padding: "0.1rem" }} />
          <input value={value} onChange={(e) => setSurfaceOverride("ceilingColor", e.target.value || undefined)} disabled={inherited} />
          <button type="button" className="zone-surface-toggle" onClick={() => setSurfaceOverride("ceilingColor", inherited ? effective.ceilingColor : undefined)}>
            {inherited ? "Override" : "Use Zone"}
          </button>
        </div>
        <span className="zone-surface-meta">
          Effective: {effective.ceilingColor} {inherited ? "· inherited" : "· overridden"}
        </span>
      </label>
    );
  }
}
