import type { Zone, ZoneRoom } from "../../../../shared/src/index";
import { resolveEdgeType } from "../../../../shared/src/index";

const DIRECTIONS = ["north", "east", "south", "west"] as const;

function edgeBorderColor(type: string): string {
  switch (type) {
    case "open":  return "rgba(0,220,150,0.85)";
    case "door":  return "rgba(255,204,0,0.85)";
    case "gate":  return "rgba(223,94,51,0.85)";
    default:      return "rgba(26,37,54,1)";
  }
}

interface Props {
  room: ZoneRoom;
  zone: Zone;
  onClose: () => void;
}

export function RoomDetail({ room, zone, onClose }: Props): JSX.Element {
  return (
    <div className="admin-form">
      <div className="admin-form-grid">
        <label>ID<input value={room.id} readOnly /></label>
        <label>Title<input value={room.title} readOnly /></label>
        <label>Position<input value={`(${room.x}, ${room.y})`} readOnly /></label>
        <label>Size<input value={`${room.w}×${room.h}`} readOnly /></label>
        <label>Encounter<input value={room.encounterId ?? "—"} readOnly /></label>
        <label>Loot<input value={room.loot?.join(", ") ?? "—"} readOnly /></label>
        <label>Victory<input value={room.victory ? "Yes" : "No"} readOnly /></label>
        <label>Prop<input value={room.prop ?? "—"} readOnly /></label>
        <label className="span-2">Description<textarea value={room.description} readOnly /></label>
        <label className="span-2">Discovery Text<textarea value={room.discoveryText ?? ""} readOnly /></label>
      </div>
      <div className="admin-form-sides">
        {DIRECTIONS.map((dir) => {
          const face = resolveEdgeType(zone, room.x, room.y, dir);
          return (
            <label key={dir}>
              {dir.charAt(0).toUpperCase() + dir.slice(1)}
              <input value={face} readOnly style={{ borderLeft: `4px solid ${edgeBorderColor(face)}` }} />
            </label>
          );
        })}
      </div>
      <div className="admin-modal-footer">
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
