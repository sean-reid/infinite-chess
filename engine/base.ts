import type { Code } from "./pieces.ts";

// The starting position of Evans, Hamkins and Perlmutter (arXiv 1510.08155),
// generated for any square. Coordinates follow Figure 1 of the paper with its
// a1 at (1, 1), so (x + y) even is a dark square.

type Cell = [number, number, Code | "."];

const toMap = (cells: Cell[]): Map<string, Code | "."> =>
  new Map(cells.map(([x, y, c]) => [`${x},${y}`, c]));

const THRONE: Cell[] = [
  [29, 58, "P"],
  [29, 59, "p"],
  [30, 55, "P"],
  [30, 56, "p"],
  [30, 57, "P"],
  [30, 58, "p"],
  [30, 61, "P"],
  [30, 62, "p"],
  [30, 63, "P"],
  [30, 64, "p"],
  [30, 65, "P"],
  [30, 66, "p"],
  [30, 67, "P"],
  [30, 68, "p"],
  [31, 57, "b"],
  [31, 66, "B"],
  [32, 55, "P"],
  [32, 56, "p"],
  [32, 57, "k"],
  [32, 58, "p"],
  [32, 65, "P"],
  [32, 66, "K"],
  [32, 67, "P"],
  [32, 68, "p"],
  [33, 57, "b"],
  [33, 66, "B"],
  [34, 55, "P"],
  [34, 56, "p"],
  [34, 57, "P"],
  [34, 58, "p"],
  [34, 59, "P"],
  [34, 60, "p"],
  [34, 61, "P"],
  [34, 62, "p"],
  [34, 63, "P"],
  [34, 64, "p"],
  [34, 65, "P"],
  [34, 66, "p"],
  [34, 67, "P"],
  [34, 68, "p"],
];
const THRONE_MAP = toMap(THRONE);

// One rook tower occupies three files. Tower k is this strip shifted by (3k, 3k);
// above the strip both pawn columns continue forever and the rook file stays open.
const TOWER_STRIP: Cell[] = [
  [43, 38, "P"],
  [43, 39, "p"],
  [43, 40, "P"],
  [43, 41, "p"],
  [43, 44, "P"],
  [43, 45, "p"],
  [43, 46, "B"],
  [43, 47, "P"],
  [43, 48, "B"],
  [43, 50, "B"],
  [43, 52, "B"],
  [43, 54, "P"],
  [43, 55, "P"],
  [43, 56, "P"],
  [43, 57, "P"],
  [43, 58, "P"],
  [43, 59, "P"],
  [43, 60, "P"],
  [43, 61, "P"],
  [43, 62, "P"],
  [43, 63, "P"],
  [43, 64, "P"],
  [43, 65, "P"],
  [43, 66, "P"],
  [43, 67, "P"],
  [43, 68, "P"],
  [44, 39, "P"],
  [44, 40, "p"],
  [44, 41, "P"],
  [44, 42, "p"],
  [44, 45, "P"],
  [44, 46, "p"],
  [44, 47, "B"],
  [44, 49, "B"],
  [44, 51, "B"],
  [44, 53, "B"],
  [44, 54, "r"],
  [45, 40, "P"],
  [45, 41, "p"],
  [45, 42, "P"],
  [45, 43, "p"],
  [45, 46, "P"],
  [45, 47, "p"],
  [45, 48, "P"],
  [45, 49, "P"],
  [45, 50, "P"],
  [45, 51, "P"],
  [45, 52, "P"],
  [45, 53, "p"],
  [45, 54, "P"],
  [45, 55, "P"],
  [45, 56, "P"],
  [45, 57, "P"],
  [45, 58, "P"],
  [45, 59, "P"],
  [45, 60, "P"],
  [45, 61, "P"],
  [45, 62, "P"],
  [45, 63, "P"],
  [45, 64, "P"],
  [45, 65, "P"],
  [45, 66, "P"],
  [45, 67, "P"],
  [45, 68, "P"],
];
const TOWER_STRIP_MAP = toMap(TOWER_STRIP);
const TOWER_STRIP_TOP = 68;

// The leftmost tower ends the chain: the mating bishop at (44, 53), the key
// black bishop at (46, 45) in its box, and no wall to its lower left.
const TOWER_OVERRIDES: Cell[] = [
  [43, 38, "."],
  [43, 39, "."],
  [43, 40, "."],
  [43, 41, "."],
  [43, 46, "P"],
  [43, 47, "p"],
  [43, 48, "."],
  [43, 50, "."],
  [43, 52, "P"],
  [43, 53, "p"],
  [44, 39, "."],
  [44, 40, "."],
  [44, 41, "."],
  [44, 42, "."],
  [44, 45, "B"],
  [44, 46, "."],
  [44, 47, "."],
  [44, 49, "."],
  [44, 51, "."],
  [45, 40, "."],
  [45, 41, "."],
  [45, 44, "P"],
  [45, 45, "p"],
  [46, 41, "."],
  [46, 42, "."],
  [46, 43, "B"],
  [46, 44, "."],
  [46, 45, "b"],
  [48, 43, "."],
  [48, 44, "."],
];
const TOWER_OVERRIDES_MAP = toMap(TOWER_OVERRIDES);

function towerAt(x: number, y: number): Code | "." | undefined {
  if (x < 43 || y < 38) return undefined;
  const o = TOWER_OVERRIDES_MAP.get(`${x},${y}`);
  if (o !== undefined) return o;
  const k = Math.floor((x - 43) / 3);
  const xp = x - 3 * k;
  const yp = y - 3 * k;
  if (yp > TOWER_STRIP_TOP) return xp === 44 ? undefined : "P";
  return TOWER_STRIP_MAP.get(`${xp},${yp}`);
}

// Cannon n is an n-shooter with its front bishop at (45 + 7n, 39 - 7n). All
// fronts sit on x + y = 84 and all cannons share one wall on x + y = 77 and 78,
// pierced once per cannon where the exit diagonal crosses it.
export const cannonFront = (n: number): [number, number] => [45 + 7 * n, 39 - 7 * n];

function cannonCell(n: number, dx: number, dy: number): Code | undefined {
  if (dx === dy && dx >= 0 && dx <= n + 1) return "b";
  if (dy === dx + 2 && dx >= 0 && dx <= n) return "b";
  if (dy === dx + 1 && dx >= 1 && dx <= n) return "p";
  if (dy === dx - 8 && dx >= 3 && dx <= n + 2) return "P";
  if (dy === dx - 2 && dx >= -2 && dx <= n + 2) return "p";
  if (dy === dx - 3 && dx >= -1 && dx <= n + 2) return "P";
  if (dx === n + 2 && dy === n + 1) return "P";
  if (dx === n + 2 && dy === n + 2) return "p";
  if (dx === n + 1 && dy === n + 2) return "P";
  if (dx === n + 1 && dy === n + 3) return "p";
  if (dy === dx + 3 && dx >= -1 && dx <= n) return "P";
  if (dy === dx + 4 && dx >= -1 && dx <= n) return "p";
  if (dy === dx + 1 && dx >= -4 && dx <= -1) return "P";
  if (dy === dx + 2 && dx >= -4 && dx <= -1) return "p";
  return undefined;
}

function cannonAt(x: number, y: number): Code | undefined {
  if (y > 37 || x < 37) return undefined;
  const lo = Math.max(1, Math.ceil((x - 47) / 8), Math.ceil((30 - y) / 7));
  const hi = Math.min(Math.floor((x - 37) / 7), Math.floor((43 - y) / 6));
  for (let n = lo; n <= hi; n++) {
    const c = cannonCell(n, x - 45 - 7 * n, y - 39 + 7 * n);
    if (c) return c;
  }
  return undefined;
}

function cannonWallAt(x: number, y: number): Code | undefined {
  if (x < 43) return undefined;
  const s = x + y;
  if (s !== 77 && s !== 78) return undefined;
  if (x >= 49 && (x - 42) % 7 === 0) return undefined;
  return s === 78 ? "p" : "P";
}

// Wing n has n gates. Its bottom gate's guard bishop sits at (41 - 8n, 44 - 8n)
// and the gates climb up and left in steps of (-6, 6) beside a hallway on
// x + y = 80 - 16n. Local coordinates below are relative to a gate's guard.
export const wingGuard = (n: number): [number, number] => [41 - 8 * n, 44 - 8 * n];

const GATE: Cell[] = [
  [0, 3, "p"],
  [-1, 2, "p"],
  [0, 2, "P"],
  [1, 2, "p"],
  [-1, 1, "P"],
  [1, 1, "P"],
  [2, 1, "p"],
  [-1, 0, "p"],
  [0, 0, "B"],
  [2, 0, "P"],
  [-1, -1, "P"],
  [2, -1, "p"],
  [-1, -2, "p"],
  [2, -2, "P"],
  [-1, -3, "P"],
  [0, -3, "p"],
  [2, -3, "P"],
  [0, -4, "P"],
  [2, -4, "P"],
  [2, -5, "p"],
  [2, -6, "P"],
  [3, -6, "p"],
  [-1, -6, "p"],
];
// Between a gate and the one above it.
const LADDER: Cell[] = [
  [-2, -5, "p"],
  [-3, -4, "p"],
  [-4, -3, "p"],
  [-5, -2, "p"],
  [-6, -1, "p"],
  [-2, -6, "P"],
  [-3, -5, "P"],
  [-4, -4, "P"],
  [-5, -3, "P"],
  [-6, -2, "P"],
  [-7, -1, "P"],
  [-2, -2, "P"],
  [-3, -1, "P"],
  [-2, -1, "p"],
];
// Above the top gate the hallway is closed.
const CAP: Cell[] = [
  [-1, -5, "P"],
  [-1, -4, "p"],
];
// Below the bottom gate, relative to the wing's guard.
const CORRIDOR: Cell[] = [
  [-1, -7, "P"],
  [0, -7, "p"],
  [3, -7, "P"],
  [0, -8, "P"],
  [1, -8, "p"],
  [1, -9, "P"],
  [2, -9, "p"],
];
const GATE_LOWER_MAP = toMap([...GATE, ...LADDER]);
const GATE_TOP_MAP = toMap([...GATE, ...CAP]);
const CORRIDOR_MAP = toMap(CORRIDOR);

// The corridor's left wall turns down and left and runs until it meets the next
// wing's corridor. The wall for n = 0 closes the arena against the free area
// and joins the cannon wall at (43, 34).
function wingTailCell(dx: number, dy: number): Code | undefined {
  const t = dx - dy;
  if (t === 12 && dx >= -4 && dx <= 2) return "P";
  if (t === 11 && dx >= -4 && dx <= 1) return "p";
  return undefined;
}

function wingCell(n: number, dx: number, dy: number): Code | "." | undefined {
  const tail = wingTailCell(dx, dy);
  if (tail) return tail;
  if (n === 0) return undefined;
  const c = CORRIDOR_MAP.get(`${dx},${dy}`);
  if (c) return c;
  const t = dx - dy;
  const kLo = Math.max(0, Math.ceil((-7 - t) / 12));
  const kHi = Math.min(n - 1, Math.floor((9 - t) / 12));
  for (let k = kLo; k <= kHi; k++) {
    const map = k === n - 1 ? GATE_TOP_MAP : GATE_LOWER_MAP;
    const g = map.get(`${dx + 6 * k},${dy - 6 * k}`);
    if (g) return g;
  }
  return undefined;
}

function wingAt(x: number, y: number): Code | "." | undefined {
  if (x > 43) return undefined;
  const s = x + y;
  const lo = Math.max(0, Math.ceil((65 - s) / 16));
  const hi = Math.floor((88 - s) / 16);
  for (let n = lo; n <= hi; n++) {
    const c = wingCell(n, x - 41 + 8 * n, y - 44 + 8 * n);
    if (c) return c;
  }
  return undefined;
}

export function baseAt(x: number, y: number): Code | null {
  const found =
    THRONE_MAP.get(`${x},${y}`) ??
    towerAt(x, y) ??
    cannonAt(x, y) ??
    cannonWallAt(x, y) ??
    wingAt(x, y);
  return found === undefined || found === "." ? null : found;
}
