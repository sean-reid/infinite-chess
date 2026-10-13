import {
  KEY_BISHOP,
  cannonFront,
  cannonOf,
  cannonSquare,
  gateAt,
  gateSquare,
  towerSquare,
  wingGuard,
} from "./geometry.ts";
import { isLegal, pseudoReach } from "./moves.ts";
import type { Move, Position } from "./position.ts";
import { sameSquare, type Square } from "./square.ts";
import { activeTower, towers } from "./white.ts";

// Black's main line, read off the position: what the paper says black should
// do next. Used for the hint and for the scripted black in tests.

export interface Hint {
  move: Move | null;
  // The move's far end is black's to choose: a direction from `move.from`.
  open: { dx: number; dy: number } | null;
  text: string;
}

const step = (s: Square, dx: number, dy: number): Square => ({ x: s.x + dx, y: s.y + dy });

export function attackedRook(pos: Position): number | null {
  const tw = towers(pos);
  if (tw.first === null) return null;
  const active = activeTower(pos, tw) ?? tw.first;
  for (const m of [active, active + 1]) {
    if (m > tw.first) continue;
    if (pos.atSquare(towerSquare(m, 0, 0)) === "r" && pos.atSquare(towerSquare(m, 1, -1)) === "P")
      return m;
  }
  return null;
}

// The cannon and shooter black fired last, from the move list.
export function lastShot(pos: Position): { n: number; k: number; square: Square } | null {
  for (let i = pos.history.length - 1; i >= 0; i--) {
    const p = pos.history[i];
    if (!p || p.piece !== "b") continue;
    const c = cannonOf(p.from);
    if (!c || c.dx !== c.dy || c.dx < 0) continue;
    let square = p.to;
    for (let j = i + 1; j < pos.history.length; j++) {
      const q = pos.history[j];
      if (q && sameSquare(q.from, square)) square = q.to;
    }
    return { n: c.n, k: c.dx, square };
  }
  return null;
}

export const hallwaySum = (w: number): number => 80 - 16 * w;

export function wingOfHallway(s: Square): number | null {
  const w = (80 - (s.x + s.y)) / 16;
  return Number.isInteger(w) && w >= 1 ? w : null;
}

// Gates of wing w whose guard has not been summoned yet, bottom first.
export function freshGates(pos: Position, w: number): number[] {
  const out: number[] = [];
  for (let k = 0; k < w; k++) {
    const g = wingGuard(w, k);
    if (pos.atSquare(g) === "B" && pos.atSquare(gateSquare(w, k, 2, -3)) === "P") out.push(k);
  }
  return out;
}

// Wings any moved piece has touched, read off the overlay once.
export function touchedWings(pos: Position): Set<number> {
  const out = new Set<number>();
  const probes: [number, number][] = [
    [0, -5],
    [1, -4],
    [2, -3],
    [2, -4],
    [0, 0],
    [1, -1],
    [0, -2],
  ];
  for (const k of pos.overlay.keys()) {
    const [x, y] = k.split(",").map(Number) as [number, number];
    for (const [dx, dy] of probes) {
      const g = gateAt({ x, y }, dx, dy);
      if (g) out.add(g.n);
    }
  }
  return out;
}

// The next pawn step after shooter k of cannon n fired, if its threat is still live.
function pawnThreat(pos: Position, n: number, k: number): Move | null {
  if (k < 1) return null;
  const path = [cannonSquare(n, k, k + 1), cannonSquare(n, k, k), cannonSquare(n, k, k - 1)];
  const wall = cannonSquare(n, k + 1, k - 2);
  for (let i = 0; i < path.length; i++) {
    const at = path[i] as Square;
    if (pos.atSquare(at) !== "p") continue;
    const to = i < 2 ? (path[i + 1] as Square) : wall;
    const m = { from: at, to };
    return isLegal(pos, m) ? m : null;
  }
  return null;
}

// Fires `from` down its exit diagonal at the smallest untouched wing it can
// reach. One ray walk decides how far the bishop can go at all.
function fireAtFreshWing(
  pos: Position,
  from: Square,
  touched: Set<number>,
  maxWing = 400,
): Move | null {
  const reach = pseudoReach(pos, from);
  const ray = reach?.rays.find((r) => r.dir.dx === -1 && r.dir.dy === -1);
  if (!ray || ray.length < 1) return null;
  for (let w = 1; w <= maxWing; w++) {
    if (touched.has(w)) continue;
    const i = (from.x + from.y - hallwaySum(w)) / 2;
    if (!Number.isInteger(i) || i < 1) continue;
    if (i > ray.length) return null;
    const m = { from, to: step(from, -i, -i) };
    if (isLegal(pos, m)) return m;
  }
  return null;
}

export function mainLine(pos: Position): Hint {
  if (pos.atSquare(KEY_BISHOP) === "b") {
    return {
      move: { from: KEY_BISHOP, to: step(KEY_BISHOP, 2, 2) },
      open: { dx: 1, dy: 1 },
      text: "Send the key bishop up its diagonal. Every three squares further is one more tower for white to work through.",
    };
  }
  const rook = attackedRook(pos);
  if (rook !== null) {
    const from = towerSquare(rook, 0, 0);
    return {
      move: { from, to: step(from, 0, 1) },
      open: { dx: 0, dy: 1 },
      text: "The rook is attacked. Move it up the tower: the higher it goes, the more pawn moves white needs to close the hole.",
    };
  }
  const shot = lastShot(pos);
  if (shot) {
    const pawn = pawnThreat(pos, shot.n, shot.k);
    if (pawn) {
      return {
        move: pawn,
        open: null,
        text: "Walk the pawn behind the shot down to the wall. White has to keep its guard pawn in step.",
      };
    }
    const w = wingOfHallway(shot.square);
    if (w !== null && pos.atSquare(shot.square) === "b") {
      for (const k of freshGates(pos, w)) {
        const attack = gateSquare(w, k, 0, -5);
        const m = { from: shot.square, to: attack };
        if (isLegal(pos, m)) {
          return {
            move: m,
            open: null,
            text: `Attack gate ${k + 1} of wing ${w}. White must summon its guard.`,
          };
        }
      }
      for (let k = 0; k < w; k++) {
        const door = gateSquare(w, k, 2, -3);
        const m = { from: shot.square, to: door };
        if (pos.atSquare(door) === "P" && isLegal(pos, m)) {
          return {
            move: m,
            open: null,
            text: "Take the door pawn and stay in the doorway. White's guard has to settle in behind it.",
          };
        }
      }
    }
    const touched = touchedWings(pos);
    for (let k = 1; k <= shot.n; k++) {
      const from = cannonSquare(shot.n, k, k);
      if (pos.atSquare(from) !== "b") continue;
      const m = fireAtFreshWing(pos, from, touched);
      if (m) {
        return {
          move: m,
          open: null,
          text: `Fire shooter ${k} of cannon ${shot.n} at a fresh wing. The pawn behind it makes this a threat white must answer.`,
        };
      }
    }
  }
  const touched = touchedWings(pos);
  for (let n = 1; n <= 400; n++) {
    const front = cannonFront(n);
    if (pos.atSquare(front) !== "b") continue;
    const m = fireAtFreshWing(pos, front, touched);
    if (m) {
      return {
        move: m,
        open: null,
        text: `Open cannon ${n} by sending its front bishop out to a fresh wing. White gets one free move for this, then ${n} forced replies.`,
      };
    }
  }
  return { move: null, open: null, text: "Off the main line. Play on." };
}
