import React from "react";
import type { Direction, RunState, Zone } from "../../../shared/src/index";
import { findRoomContaining, resolveEdgeType } from "../../../shared/src/index";

type CellFace = "wall" | "open" | "door" | "gate";
const FACING_CHAR: Record<Direction, string> = { north: "▲", east: "▶", south: "▼", west: "◀" };

function faceBorder(face: CellFace): string {
  switch (face) {
    case "wall": return "1px solid rgba(0, 200, 240, 0.75)";
    case "door": return "1px solid rgba(255, 170, 0, 0.65)";
    case "gate": return "1px solid rgba(0, 100, 255, 0.65)";
    case "open": return "1px solid rgba(0, 120, 160, 0.18)";
  }
}

interface Props {
  zone: Zone;
  run: RunState;
}

export function MapPanel({ zone, run }: Props): JSX.Element {
  const radius = 2;
  const px = run.posX;
  const py = run.posY;
  const rows: JSX.Element[] = [];

  for (let y = py - radius; y <= py + radius; y += 1) {
    for (let x = px - radius; x <= px + radius; x += 1) {
      const room = findRoomContaining(zone, x, y);
      const discovered = room ? run.discoveredRoomIds.includes(room.id) : false;
      const current = x === px && y === py;

      const style: React.CSSProperties = discovered ? {
        borderTop:    faceBorder(resolveEdgeType(zone, x, y, "north")),
        borderRight:  faceBorder(resolveEdgeType(zone, x, y, "east")),
        borderBottom: faceBorder(resolveEdgeType(zone, x, y, "south")),
        borderLeft:   faceBorder(resolveEdgeType(zone, x, y, "west")),
      } : {};

      rows.push(
        <div
          key={`${x}-${y}`}
          className={current ? "map-cell current" : discovered ? "map-cell discovered" : "map-cell hidden"}
          style={style}
        >
          {current ? FACING_CHAR[run.facing] : ""}
        </div>
      );
    }
  }

  const currentRoom = findRoomContaining(zone, px, py);
  return (
    <>
      <div className="map-grid" style={{ gridTemplateColumns: "repeat(5, 16px)" }}>
        {rows}
      </div>
      {currentRoom && <p className="room-copy">{currentRoom.title}</p>}
    </>
  );
}
