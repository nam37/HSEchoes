import { useEffect, useState } from "react";
import type { ZoneLink, ZoneRoom } from "../../../../shared/src/index";

interface Props {
  room: ZoneRoom;
  onChange: (room: ZoneRoom) => void;
  onClose: () => void;
}

export function RoomSidebar({ room, onChange, onClose }: Props): JSX.Element {
  const [local, setLocal] = useState<ZoneRoom>({ ...room });

  // Sync when selected room changes
  useEffect(() => {
    setLocal({ ...room });
  }, [room.id]);

  function set<K extends keyof ZoneRoom>(key: K, val: ZoneRoom[K]): void {
    const updated = { ...local, [key]: val };
    setLocal(updated);
    onChange(updated);
  }

  return (
    <aside className="zone-sidebar">
      <div className="zone-sidebar-header">
        <h3>Room Properties</h3>
        <button className="admin-modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="zone-sidebar-body">
        <label>ID<input value={local.id} onChange={(e) => set("id", e.target.value)} /></label>
        <label>Title<input value={local.title} onChange={(e) => set("title", e.target.value)} /></label>
        <label>Position<input value={`(${local.x}, ${local.y})`} readOnly /></label>
        <label>Size<input value={`${local.w} × ${local.h}`} readOnly /></label>
        <label>Ceiling Color
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input type="color" value={local.ceilingColor} onChange={(e) => set("ceilingColor", e.target.value)} style={{ width: "2.5rem", padding: "0.1rem" }} />
            <input value={local.ceilingColor} onChange={(e) => set("ceilingColor", e.target.value)} style={{ flex: 1 }} />
          </div>
        </label>
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
    const updated = { ...local, zoneLink: { ...current, [key]: val } };
    // Clear zoneLink entirely if toZoneId is empty
    if (!updated.zoneLink!.toZoneId) updated.zoneLink = undefined;
    setLocal(updated);
    onChange(updated);
  }
}
