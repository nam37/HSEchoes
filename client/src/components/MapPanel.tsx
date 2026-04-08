import React from "react";
import type { Direction, RunState, Zone } from "../../../shared/src/index";
import { findRoomContaining, resolveEdgeType } from "../../../shared/src/index";
import { DirectionalMarker } from "./DirectionalMarker";

const CELL = 20;
const GAP = 4;

interface Props {
  zone: Zone;
  run: RunState;
}

export function MapPanel({ zone, run }: Props): JSX.Element {
  const currentRoom = findRoomContaining(zone, run.posX, run.posY);
  const discoveredCount = new Set(run.discoveredRoomIds).size;
  const discoveredRoomIds = new Set(run.discoveredRoomIds);
  const mapWidth = zone.gridW * CELL + Math.max(0, zone.gridW - 1) * GAP;
  const mapHeight = zone.gridH * CELL + Math.max(0, zone.gridH - 1) * GAP;
  const lineSegments: JSX.Element[] = [];

  for (let y = 0; y < zone.gridH; y += 1) {
    for (let x = 0; x < zone.gridW; x += 1) {
      const room = findRoomContaining(zone, x, y);
      if (!room || !discoveredRoomIds.has(room.id)) {
        continue;
      }

      for (const direction of ["north", "east", "south", "west"] as Direction[]) {
        const face = resolveEdgeType(zone, x, y, direction);
        if (face === "open") {
          continue;
        }
        const [x1, y1, x2, y2] = segmentForCellEdge(x, y, direction);
        lineSegments.push(
          <line
            key={`${x}-${y}-${direction}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            className={`mini-map-edge mini-map-edge--${face}`}
          />
        );
      }
    }
  }

  return (
    <div className="mini-map-panel">
      <div className="mini-map-header">
        <span className="mini-map-zone">{zone.title}</span>
        <span className="mini-map-progress">{discoveredCount}/{zone.rooms.length} rooms surveyed</span>
      </div>
      <div className="mini-map-frame">
        <svg className="mini-map-canvas" viewBox={`0 0 ${mapWidth} ${mapHeight}`} style={{ width: mapWidth, height: mapHeight }}>
          {zone.rooms.filter((room) => discoveredRoomIds.has(room.id)).map((room) => {
            const current = room.id === currentRoom?.id;
            return (
              <rect
                key={room.id}
                x={room.x * (CELL + GAP)}
                y={room.y * (CELL + GAP)}
                width={room.w * CELL + Math.max(0, room.w - 1) * GAP}
                height={room.h * CELL + Math.max(0, room.h - 1) * GAP}
                rx={2}
                ry={2}
                className={`mini-map-room ${current ? "current" : "discovered"}`}
              />
            );
          })}
          {lineSegments}
          <g transform={`translate(${run.posX * (CELL + GAP) + CELL / 2}, ${run.posY * (CELL + GAP) + CELL / 2})`}>
            <circle r={8} className="mini-map-marker-ring" />
            <foreignObject x={-7} y={-7} width={14} height={14}>
              <DirectionalMarker direction={run.facing} className="mini-map-marker-svg" />
            </foreignObject>
          </g>
        </svg>
      </div>
      {currentRoom && <p className="room-copy">Current: {currentRoom.title}</p>}
    </div>
  );
}

function segmentForCellEdge(x: number, y: number, direction: Direction): [number, number, number, number] {
  const left = x * (CELL + GAP);
  const top = y * (CELL + GAP);
  const right = left + CELL;
  const bottom = top + CELL;

  switch (direction) {
    case "north":
      return [left, top, right, top];
    case "east":
      return [right, top, right, bottom];
    case "south":
      return [left, bottom, right, bottom];
    case "west":
      return [left, top, left, bottom];
  }
}
