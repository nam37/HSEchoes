import type { DungeonCell, Direction } from "../../../shared/src/index";

export function getRenderableCells(cells: DungeonCell[], currentCell: DungeonCell): DungeonCell[] {
  return cells.filter((cell) => Math.abs(cell.x - currentCell.x) + Math.abs(cell.y - currentCell.y) <= 1);
}

export function isPassageBlocked(cell: DungeonCell, direction: Direction, inventory: Set<string>): boolean {
  const requirement = cell.passageRequirements?.[direction];
  return Boolean(requirement && !inventory.has(requirement.itemId));
}
