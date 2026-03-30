import type { Zone, ZoneRoom } from "../../../../shared/src/index";
import { findRoomContaining, resolveEdgeType } from "../../../../shared/src/index";

function edgeBorderColor(type: string): string {
  switch (type) {
    case "open":  return "rgba(0,220,150,0.85)";
    case "door":  return "rgba(255,204,0,0.85)";
    case "gate":  return "rgba(223,94,51,0.85)";
    default:      return "rgba(26,37,54,1)";
  }
}

interface Props {
  zone: Zone;
  onClickRoom: (room: ZoneRoom) => void;
}

export function ZoneMapGrid({ zone, onClickRoom }: Props): JSX.Element {
  if (zone.rooms.length === 0) {
    return <p className="admin-empty">No rooms defined in this zone.</p>;
  }

  const tiles: JSX.Element[] = [];
  for (let y = 0; y < zone.gridH; y++) {
    for (let x = 0; x < zone.gridW; x++) {
      const room = findRoomContaining(zone, x, y);
      if (room) {
        const n = resolveEdgeType(zone, x, y, "north");
        const e = resolveEdgeType(zone, x, y, "east");
        const s = resolveEdgeType(zone, x, y, "south");
        const w = resolveEdgeType(zone, x, y, "west");
        tiles.push(
          <div
            key={`${x}:${y}`}
            className="map-admin-cell occupied"
            title={`${room.title} (${x},${y})`}
            style={{
              borderTop:    `2px solid ${edgeBorderColor(n)}`,
              borderRight:  `2px solid ${edgeBorderColor(e)}`,
              borderBottom: `2px solid ${edgeBorderColor(s)}`,
              borderLeft:   `2px solid ${edgeBorderColor(w)}`,
            }}
            onClick={() => onClickRoom(room)}
          >
            <span className="map-admin-cell-label">{room.id}</span>
            {room.encounterId && <span className="map-admin-badge enemy-badge">!</span>}
            {room.loot && room.loot.length > 0 && <span className="map-admin-badge loot-badge">$</span>}
            {room.victory && <span className="map-admin-badge victory-badge">★</span>}
          </div>
        );
      } else {
        tiles.push(<div key={`${x}:${y}`} className="map-admin-cell empty" />);
      }
    }
  }

  return (
    <div className="map-admin-wrap">
      <div className="map-admin-legend">
        <span style={{ borderBottom: `3px solid ${edgeBorderColor("open")}` }}>open</span>
        <span style={{ borderBottom: `3px solid ${edgeBorderColor("door")}` }}>door</span>
        <span style={{ borderBottom: `3px solid ${edgeBorderColor("gate")}` }}>gate</span>
        <span style={{ borderBottom: `3px solid ${edgeBorderColor("wall")}` }}>wall</span>
      </div>
      <div
        className="map-admin-grid"
        style={{ gridTemplateColumns: `repeat(${zone.gridW}, 56px)` }}
      >
        {tiles}
      </div>
    </div>
  );
}
