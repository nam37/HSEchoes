import type { Direction } from "../../../shared/src/index";

interface DirectionalMarkerProps {
  direction: Direction;
  className?: string;
}

const ROTATION_BY_DIRECTION: Record<Direction, number> = {
  north: 0,
  east: 90,
  south: 180,
  west: 270,
};

export function DirectionalMarker({ direction, className = "" }: DirectionalMarkerProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={className}
    >
      <g transform={`rotate(${ROTATION_BY_DIRECTION[direction]} 10 10)`}>
        <polygon points="10,3 16,15 10,12.5 4,15" />
      </g>
    </svg>
  );
}
