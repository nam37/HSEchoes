import { useEffect, useMemo, useState } from "react";
import { resolveRoomSurfaces } from "../../../../shared/src/index";
import type { AssetDef, Encounter, Enemy, Item, NPC, PropDef, RoomSurfaces, Terminal, TextureSet, Zone, ZoneLink, ZoneRoom } from "../../../../shared/src/index";
import { resolveAssetPath } from "../../lib/assets";
import { SearchablePickerField, TagMultiPickerField, type PickerOption } from "./AdminPicker";

interface Props {
  zone: Zone;
  room: ZoneRoom;
  gridW: number;
  gridH: number;
  assetMap: Map<string, AssetDef>;
  textureSetMap: Map<string, TextureSet>;
  enemies: Enemy[];
  items: Item[];
  npcs: NPC[];
  terminals: Terminal[];
  props: PropDef[];
  encounters: Encounter[];
  onAssignEnemy: (room: ZoneRoom, enemyId: string) => void;
  onCreateEnemy: (room: ZoneRoom) => void;
  onCreateItem: (room: ZoneRoom) => void;
  onCreateNpc: (room: ZoneRoom) => void;
  onCreateTerminal: (room: ZoneRoom) => void;
  onCreateProp: (room: ZoneRoom) => void;
  onChange: (room: ZoneRoom) => void;
  onClose: () => void;
}

export function RoomSidebar({
  zone,
  room,
  gridW,
  gridH,
  assetMap,
  textureSetMap,
  enemies,
  items,
  npcs,
  terminals,
  props,
  encounters,
  onAssignEnemy,
  onCreateEnemy,
  onCreateItem,
  onCreateNpc,
  onCreateTerminal,
  onCreateProp,
  onChange,
  onClose,
}: Props): JSX.Element {
  const [local, setLocal] = useState<ZoneRoom>({ ...room });
  const effectiveSurfaces = resolveRoomSurfaces(zone, local, { assetMap, textureSetMap });

  useEffect(() => {
    setLocal({ ...room });
  }, [room]);

  const encounterOptions = useMemo<PickerOption[]>(
    () => encounters
      .slice()
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((encounter) => ({
        value: encounter.id,
        label: enemies.find((enemy) => enemy.id === encounter.enemyId)?.name ?? encounter.enemyId,
        subtitle: encounter.id,
        meta: encounter.enemyId,
      })),
    [encounters, enemies]
  );
  const enemyOptions = useMemo<PickerOption[]>(
    () => enemies
      .slice()
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((enemy) => ({
        value: enemy.id,
        label: enemy.name,
        subtitle: enemy.id,
        previewSrc: resolveAssetPath(enemy.spritePath, assetMap),
        meta: `${enemy.maxHp} HP`,
      })),
    [assetMap, enemies]
  );
  const itemOptions = useMemo<PickerOption[]>(
    () => items
      .slice()
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((item) => ({
        value: item.id,
        label: item.name,
        subtitle: item.id,
        previewSrc: resolveAssetPath(item.iconPath, assetMap),
        meta: item.slot,
      })),
    [assetMap, items]
  );
  const npcOptions = useMemo<PickerOption[]>(
    () => npcs
      .slice()
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((npc) => ({
        value: npc.id,
        label: npc.name,
        subtitle: npc.id,
        previewSrc: npc.portraitAssetId ? resolveAssetPath(npc.portraitAssetId, assetMap) : undefined,
        meta: npc.role,
      })),
    [assetMap, npcs]
  );
  const terminalOptions = useMemo<PickerOption[]>(
    () => terminals
      .slice()
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((terminal) => ({
        value: terminal.id,
        label: terminal.title,
        subtitle: terminal.id,
        meta: terminal.xpReward ? `${terminal.xpReward} XP` : "Terminal",
      })),
    [terminals]
  );
  const propOptions = useMemo<PickerOption[]>(
    () => props
      .slice()
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((prop) => ({
        value: prop.id,
        label: prop.name,
        subtitle: prop.id,
        previewSrc: prop.assetId ? resolveAssetPath(prop.assetId, assetMap) : undefined,
        meta: prop.renderHint ?? "billboard",
      })),
    [assetMap, props]
  );
  const currentEncounter = encounters.find((encounter) => encounter.id === local.encounterId);

  function set<K extends keyof ZoneRoom>(key: K, value: ZoneRoom[K]): void {
    const updated = { ...local, [key]: value };
    setLocal(updated);
    onChange(updated);
  }

  function setGeom(key: "x" | "y" | "w" | "h", raw: number): void {
    let value = Math.max(key === "w" || key === "h" ? 1 : 0, raw);
    if (key === "x") value = Math.min(value, gridW - local.w);
    if (key === "y") value = Math.min(value, gridH - local.h);
    if (key === "w") value = Math.min(value, gridW - local.x);
    if (key === "h") value = Math.min(value, gridH - local.y);
    set(key, value);
  }

  return (
    <aside className="zone-sidebar zone-sidebar--wide">
      <div className="zone-sidebar-header">
        <h3>Room Properties</h3>
        <button className="admin-modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="zone-sidebar-body">
        <label>ID<input value={local.id} onChange={(event) => set("id", event.target.value)} /></label>
        <label>Title<input value={local.title} onChange={(event) => set("title", event.target.value)} /></label>

        <div className="zone-sidebar-geom-grid">
          <label>X<input type="number" min={0} max={gridW - local.w} value={local.x} onChange={(event) => setGeom("x", Number(event.target.value))} /></label>
          <label>Y<input type="number" min={0} max={gridH - local.h} value={local.y} onChange={(event) => setGeom("y", Number(event.target.value))} /></label>
          <label>W<input type="number" min={1} max={gridW - local.x} value={local.w} onChange={(event) => setGeom("w", Number(event.target.value))} /></label>
          <label>H<input type="number" min={1} max={gridH - local.y} value={local.h} onChange={(event) => setGeom("h", Number(event.target.value))} /></label>
        </div>

        <div className="zone-sidebar-section-label">Room Content</div>
        <SearchablePickerField label="NPC" value={local.npcId} options={npcOptions} onChange={(value) => set("npcId", value)} onCreate={() => onCreateNpc(local)} createLabel="New NPC" />
        <SearchablePickerField label="Terminal" value={local.terminalId} options={terminalOptions} onChange={(value) => set("terminalId", value)} onCreate={() => onCreateTerminal(local)} createLabel="New Terminal" />
        <SearchablePickerField label="Prop" value={local.prop} options={propOptions} onChange={(value) => set("prop", value)} onCreate={() => onCreateProp(local)} createLabel="New Prop" />
        <TagMultiPickerField label="Loot" values={local.loot ?? []} options={itemOptions} onChange={(values) => set("loot", values.length > 0 ? values : undefined)} onCreate={() => onCreateItem(local)} createLabel="New Item" />
        <SearchablePickerField label="Encounter" value={local.encounterId} options={encounterOptions} onChange={(value) => set("encounterId", value)} />
        <SearchablePickerField
          label="Add Enemy To Room"
          value={currentEncounter?.enemyId}
          options={enemyOptions}
          onChange={(value) => value ? onAssignEnemy(local, value) : set("encounterId", undefined)}
          onCreate={() => onCreateEnemy(local)}
          createLabel="New Enemy"
        />

        <div className="zone-sidebar-section-label">Surface Overrides</div>
        {renderTextureSetOverride()}
        {renderTextureOverride("Wall Texture", "wallTexture", effectiveSurfaces.wallTexture)}
        {renderTextureOverride("Floor Texture", "floorTexture", effectiveSurfaces.floorTexture)}
        {renderTextureOverride("Ceiling Texture", "ceilingTexture", effectiveSurfaces.ceilingTexture ?? "")}
        {renderColorOverride(effectiveSurfaces)}

        <label>
          <span style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input type="checkbox" checked={!!local.victory} onChange={(event) => set("victory", event.target.checked || undefined)} />
            Victory Room
          </span>
        </label>
        <label>Description<textarea value={local.description} rows={3} onChange={(event) => set("description", event.target.value)} /></label>
        <label>Discovery Text<textarea value={local.discoveryText ?? ""} rows={2} onChange={(event) => set("discoveryText", event.target.value || undefined)} /></label>

        <div className="zone-sidebar-section-label">Zone Link</div>
        <label>Target Zone ID<input value={local.zoneLink?.toZoneId ?? ""} placeholder="leave blank for none" onChange={(event) => setLink("toZoneId", event.target.value)} /></label>
        <label>Target Room ID<input value={local.zoneLink?.toRoomId ?? ""} onChange={(event) => setLink("toRoomId", event.target.value)} /></label>
        <label>Entry X<input type="number" value={local.zoneLink?.entryX ?? ""} onChange={(event) => setLink("entryX", Number(event.target.value))} /></label>
        <label>Entry Y<input type="number" value={local.zoneLink?.entryY ?? ""} onChange={(event) => setLink("entryY", Number(event.target.value))} /></label>
        <label>Entry Facing
          <select value={local.zoneLink?.facing ?? ""} onChange={(event) => setLink("facing", event.target.value || undefined)}>
            <option value="">— inherit —</option>
            <option value="north">north</option>
            <option value="south">south</option>
            <option value="east">east</option>
            <option value="west">west</option>
          </select>
        </label>
        <label>Transition Text<input value={local.zoneLink?.transitionText ?? ""} onChange={(event) => setLink("transitionText", event.target.value || undefined)} /></label>

        <details className="admin-advanced-panel">
          <summary>Advanced IDs</summary>
          <label>Raw NPC ID<input value={local.npcId ?? ""} onChange={(event) => set("npcId", event.target.value || undefined)} /></label>
          <label>Raw Terminal ID<input value={local.terminalId ?? ""} onChange={(event) => set("terminalId", event.target.value || undefined)} /></label>
          <label>Raw Encounter ID<input value={local.encounterId ?? ""} onChange={(event) => set("encounterId", event.target.value || undefined)} /></label>
          <label>Raw Prop ID<input value={local.prop ?? ""} onChange={(event) => set("prop", event.target.value || undefined)} /></label>
          <label>Raw Loot IDs<input value={local.loot?.join(", ") ?? ""} onChange={(event) => set("loot", event.target.value ? event.target.value.split(",").map((value) => value.trim()).filter(Boolean) : undefined)} /></label>
        </details>
      </div>
    </aside>
  );

  function setLink(key: keyof ZoneLink, value: unknown): void {
    const current = local.zoneLink ?? { toZoneId: "", toRoomId: "", entryX: 0, entryY: 0 };
    const merged = { ...current, [key]: value };
    const updated: ZoneRoom = { ...local, zoneLink: merged.toZoneId ? merged : undefined };
    setLocal(updated);
    onChange(updated);
  }

  function setSurfaceOverride(key: keyof RoomSurfaces, value: string | undefined): void {
    const nextOverrides = { ...(local.surfaceOverrides ?? {}) };
    if (value === undefined) delete nextOverrides[key];
    else nextOverrides[key] = value;
    const updated: ZoneRoom = { ...local, surfaceOverrides: Object.keys(nextOverrides).length > 0 ? nextOverrides : undefined };
    setLocal(updated);
    onChange(updated);
  }

  function renderTextureSetOverride(): JSX.Element {
    const overrideValue = local.surfaceOverrides?.textureSetId;
    const inherited = overrideValue === undefined;
    const effectiveValue = local.surfaceOverrides?.textureSetId ?? local.textureSetId ?? zone.surfaceDefaults.textureSetId ?? "";
    return (
      <label>Texture Set
        <div className="zone-surface-row">
          <input value={inherited ? effectiveValue : overrideValue} placeholder={effectiveValue || "No texture set"} onChange={(event) => setSurfaceOverride("textureSetId", event.target.value.trim() || undefined)} disabled={inherited} />
          <button type="button" className="zone-surface-toggle" onClick={() => setSurfaceOverride("textureSetId", inherited ? effectiveValue || "" : undefined)}>{inherited ? "Override" : "Use Zone"}</button>
        </div>
        <span className="zone-surface-meta">Effective: {effectiveValue || "None"} {inherited ? "· inherited" : "· overridden"}</span>
      </label>
    );
  }

  function renderTextureOverride(label: string, key: "wallTexture" | "floorTexture" | "ceilingTexture", effectiveValue: string): JSX.Element {
    const overrideValue = local.surfaceOverrides?.[key];
    const inherited = overrideValue === undefined;
    return (
      <label>{label}
        <div className="zone-surface-row">
          <input value={inherited ? effectiveValue : overrideValue} placeholder={effectiveValue || "No texture"} onChange={(event) => setSurfaceOverride(key, event.target.value.trim() || undefined)} disabled={inherited} />
          <button type="button" className="zone-surface-toggle" onClick={() => setSurfaceOverride(key, inherited ? effectiveValue || "" : undefined)}>{inherited ? "Override" : "Use Zone"}</button>
        </div>
        <span className="zone-surface-meta">Effective: {effectiveValue || "None"} {inherited ? "· inherited" : "· overridden"}</span>
      </label>
    );
  }

  function renderColorOverride(effective: RoomSurfaces): JSX.Element {
    const overrideValue = local.surfaceOverrides?.ceilingColor;
    const inherited = overrideValue === undefined;
    const value = inherited ? effective.ceilingColor : overrideValue;
    return (
      <label>Ceiling Tint
        <div className="zone-surface-row">
          <input type="color" value={value} onChange={(event) => setSurfaceOverride("ceilingColor", event.target.value)} disabled={inherited} style={{ width: "2.5rem", padding: "0.1rem" }} />
          <input value={value} onChange={(event) => setSurfaceOverride("ceilingColor", event.target.value || undefined)} disabled={inherited} />
          <button type="button" className="zone-surface-toggle" onClick={() => setSurfaceOverride("ceilingColor", inherited ? effective.ceilingColor : undefined)}>{inherited ? "Override" : "Use Zone"}</button>
        </div>
        <span className="zone-surface-meta">Effective: {effective.ceilingColor} {inherited ? "· inherited" : "· overridden"}</span>
      </label>
    );
  }
}
