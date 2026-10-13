import type { Square } from "./square.ts";

// Coordinates of the paper's structures. Towers are numbered from the left,
// tower 0 being the one whose bishop mates; cannons and wings from 1.

export const towerRook = (m: number): Square => ({ x: 44 + 3 * m, y: 54 + 3 * m });

export const towerSquare = (m: number, dx: number, dy: number): Square => ({
  x: 44 + 3 * m + dx,
  y: 54 + 3 * m + dy,
});

// The key black bishop's diagonal: step t is (46 + t, 45 + t).
export const channelSquare = (t: number): Square => ({ x: 46 + t, y: 45 + t });

export const channelStep = (s: Square): number | null =>
  s.x - s.y === 1 && s.x > 46 ? s.x - 46 : null;

// Where the pawn that took the key bishop at step t stops climbing the inner
// wall, and which tower that unlocks.
export function climbPlan(t: number): { captures: number; tower: number } {
  const captures = 2 + ((((-1 - t) % 3) + 3) % 3);
  return { captures, tower: (t + captures - 4) / 3 };
}

export const cannonFront = (n: number): Square => ({ x: 45 + 7 * n, y: 39 - 7 * n });

export const cannonSquare = (n: number, dx: number, dy: number): Square => ({
  x: 45 + 7 * n + dx,
  y: 39 - 7 * n + dy,
});

// The cannon a square belongs to, by its position on the x + y = 84 band.
export function cannonOf(s: Square): { n: number; dx: number; dy: number } | null {
  if (s.y > 37 || s.x < 50) return null;
  for (let n = Math.max(1, Math.floor((s.x - 47) / 7)); n <= Math.floor((s.x - 37) / 7); n++) {
    const dx = s.x - 45 - 7 * n;
    const dy = s.y - 39 + 7 * n;
    if (dx >= -8 && dx <= n + 2 && dy >= -9 && dy <= n + 4) return { n, dx, dy };
  }
  return null;
}

export const wingGuard = (n: number, k = 0): Square => ({
  x: 41 - 8 * n - 6 * k,
  y: 44 - 8 * n + 6 * k,
});

export const gateSquare = (n: number, k: number, dx: number, dy: number): Square => {
  const g = wingGuard(n, k);
  return { x: g.x + dx, y: g.y + dy };
};

export interface Gate {
  n: number;
  k: number;
  guard: Square;
}

// The gate whose local square (dx, dy) is `s`, if any.
export function gateAt(s: Square, dx: number, dy: number): Gate | null {
  const gx = s.x - dx;
  const gy = s.y - dy;
  const sum = gx + gy;
  if ((85 - sum) % 16 !== 0) return null;
  const n = (85 - sum) / 16;
  if (n < 1) return null;
  const k = (41 - 8 * n - gx) / 6;
  if (!Number.isInteger(k) || k < 0 || k >= n) return null;
  return { n, k, guard: { x: gx, y: gy } };
}

// Squares a black bishop attacks a gate's door from.
export const ATTACK_SQUARES: [number, number][] = [
  [0, -5],
  [1, -4],
];
export const DOOR: [number, number] = [2, -3];
export const DOOR_PAWN: [number, number] = [2, -4];
export const GUARD_STEPS: [number, number][] = [
  [0, 0],
  [1, -1],
  [0, -2],
];

export const WHITE_KING: Square = { x: 32, y: 66 };
export const BLACK_KING: Square = { x: 32, y: 57 };
export const KEY_BISHOP: Square = { x: 46, y: 45 };
export const MATING_BISHOP: Square = { x: 44, y: 53 };
// The two bishops beside the key bishop's box, released if it is taken at home.
export const BOX_BISHOPS: Square[] = [
  { x: 46, y: 43 },
  { x: 44, y: 45 },
];
