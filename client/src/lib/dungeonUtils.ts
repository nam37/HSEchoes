import type { Zone, Direction } from "../../../shared/src/index";
import { findZoneEdge } from "../../../shared/src/index";

export function isPassageBlocked(zone: Zone, px: number, py: number, direction: Direction, inventory: Set<string>): boolean {
  const edge = findZoneEdge(zone, px, py, direction);
  return Boolean(edge?.requirement && !inventory.has(edge.requirement.itemId));
}
