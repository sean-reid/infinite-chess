import type { Position } from "./position.ts";
import type { Square } from "./square.ts";

export interface Dir {
  dx: number;
  dy: number;
}

export const ORTHOGONAL: Dir[] = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
];
export const DIAGONAL: Dir[] = [
  { dx: 1, dy: 1 },
  { dx: 1, dy: -1 },
  { dx: -1, dy: 1 },
  { dx: -1, dy: -1 },
];
export const ALL_DIRS: Dir[] = [...ORTHOGONAL, ...DIAGONAL];

export interface RayEnd {
  // Empty squares along the ray before anything stops it.
  length: number;
  // The first occupied square, when the ray is finite.
  blocker: Square | null;
}

// Half-planes a*x + b*y >= c containing each family of the base position. A
// ray that violates one of a family's constraints and is not moving towards
// satisfying it can never meet that family again.
type Constraint = [number, number, number];
const SUPPORTS: Constraint[][] = [
  // throne room
  [
    [1, 0, 29],
    [-1, 0, -34],
    [0, 1, 55],
    [0, -1, -68],
  ],
  // rook towers: x >= 43, y >= 38, y - x >= -8
  [
    [1, 0, 43],
    [0, 1, 38],
    [-1, 1, -8],
  ],
  // cannons and their wall: x >= 37, y <= 37, x + y >= 77
  [
    [1, 0, 37],
    [0, -1, -37],
    [1, 1, 77],
  ],
  // gateway wings: x <= 43, x + y <= 88, 8x - 7(x + y) >= -320, 4(x - y) - 3(x + y) >= -360, x - y <= 9
  [
    [-1, 0, -43],
    [-1, -1, -88],
    [1, -7, -320],
    [1, -7, -360],
    [-1, 1, -9],
  ],
];

function unreachable(x: number, y: number, d: Dir): boolean {
  for (const family of SUPPORTS) {
    let escaped = false;
    for (const [a, b, c] of family) {
      if (a * x + b * y < c && a * d.dx + b * d.dy <= 0) {
        escaped = true;
        break;
      }
    }
    if (!escaped) return false;
  }
  return true;
}

// Inside the rook towers the base repeats every (3, 3). Up a rook file above the
// strip, and up-right along the band, three empty squares in a row mean the ray
// is empty for ever.
function periodicTower(x: number, y: number, d: Dir): boolean {
  if (x < 43 || y < 38 || y - x < -8) return false;
  if (d.dx === 1 && d.dy === 1) return x >= 49;
  if (d.dx === 0 && d.dy === 1) {
    const k = Math.floor((x - 43) / 3);
    return y - 3 * k > 68;
  }
  return false;
}

const MAX_SCAN = 100_000;

// Walks from `from` in direction `d` until a piece. `length` is Infinity when
// the ray never meets one.
export function rayEnd(pos: Position, from: Square, d: Dir): RayEnd {
  let x = from.x;
  let y = from.y;
  let length = 0;
  let periodicRun = 0;
  for (;;) {
    x += d.dx;
    y += d.dy;
    if (pos.at(x, y)) return { length, blocker: { x, y } };
    length++;
    if (length > MAX_SCAN) return { length: Infinity, blocker: null };
    periodicRun = periodicTower(x, y, d) ? periodicRun + 1 : 0;
    if (periodicRun >= 3 || unreachable(x, y, d)) {
      const ahead = nearestOverlayAhead(pos, x, y, d);
      if (!ahead) return { length: Infinity, blocker: null };
      // Jump to just before the moved piece and keep walking from there.
      const steps = Math.max(Math.abs(ahead.x - x), Math.abs(ahead.y - y)) - 1;
      x += d.dx * steps;
      y += d.dy * steps;
      length += steps;
      periodicRun = 0;
    }
  }
}

function nearestOverlayAhead(pos: Position, x: number, y: number, d: Dir): Square | null {
  let best: Square | null = null;
  let bestDist = Infinity;
  for (const [s] of pos.movedPieces()) {
    const ex = s.x - x;
    const ey = s.y - y;
    const steps = d.dx !== 0 ? ex / d.dx : ey / d.dy;
    if (!Number.isInteger(steps) || steps <= 0) continue;
    if (ex !== d.dx * steps || ey !== d.dy * steps) continue;
    if (steps < bestDist) {
      bestDist = steps;
      best = s;
    }
  }
  return best;
}
