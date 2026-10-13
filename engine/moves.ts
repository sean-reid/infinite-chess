import { colorOf, kindOf, type Code, type Color } from "./pieces.ts";
import type { Move, Position } from "./position.ts";
import { ALL_DIRS, DIAGONAL, ORTHOGONAL, rayEnd, type Dir } from "./rays.ts";
import { sameSquare, type Square } from "./square.ts";

const KNIGHT_JUMPS: Dir[] = [
  { dx: 1, dy: 2 },
  { dx: 2, dy: 1 },
  { dx: 2, dy: -1 },
  { dx: 1, dy: -2 },
  { dx: -1, dy: -2 },
  { dx: -2, dy: -1 },
  { dx: -2, dy: 1 },
  { dx: -1, dy: 2 },
];

const step = (s: Square, d: Dir, n = 1): Square => ({ x: s.x + d.dx * n, y: s.y + d.dy * n });
const forward = (color: Color): number => (color === "w" ? 1 : -1);

// A slider's reach in one direction: `length` empty squares, then an optional
// capture. `length` is Infinity on an open ray.
export interface Ray {
  dir: Dir;
  length: number;
  capture: Square | null;
}

export interface Reach {
  from: Square;
  piece: Code;
  // Single-step destinations for kings, knights and pawns.
  steps: Square[];
  rays: Ray[];
}

const sliderDirs = (code: Code): Dir[] => {
  switch (kindOf(code)) {
    case "B":
      return DIAGONAL;
    case "R":
      return ORTHOGONAL;
    case "Q":
      return ALL_DIRS;
    default:
      return [];
  }
};

// Every square the piece could move to if the king were not a concern.
export function pseudoReach(pos: Position, from: Square): Reach | null {
  const piece = pos.atSquare(from);
  if (!piece) return null;
  const color = colorOf(piece);
  const enemy = (s: Square) => {
    const c = pos.atSquare(s);
    return c !== null && colorOf(c) !== color;
  };
  const steps: Square[] = [];
  const rays: Ray[] = [];
  switch (kindOf(piece)) {
    case "P": {
      const ahead = step(from, { dx: 0, dy: forward(color) });
      if (!pos.atSquare(ahead)) steps.push(ahead);
      for (const dx of [-1, 1]) {
        const t = step(from, { dx, dy: forward(color) });
        if (enemy(t)) steps.push(t);
      }
      break;
    }
    case "N":
      for (const d of KNIGHT_JUMPS) {
        const t = step(from, d);
        if (!pos.atSquare(t) || enemy(t)) steps.push(t);
      }
      break;
    case "K":
      for (const d of ALL_DIRS) {
        const t = step(from, d);
        if (!pos.atSquare(t) || enemy(t)) steps.push(t);
      }
      break;
    default:
      for (const dir of sliderDirs(piece)) {
        const end = rayEnd(pos, from, dir);
        const capture = end.blocker && enemy(end.blocker) ? end.blocker : null;
        if (end.length > 0 || capture) rays.push({ dir, length: end.length, capture });
      }
  }
  return { from, piece, steps, rays };
}

export function reachContains(reach: Reach, to: Square): boolean {
  if (reach.steps.some((s) => sameSquare(s, to))) return true;
  const ex = to.x - reach.from.x;
  const ey = to.y - reach.from.y;
  for (const r of reach.rays) {
    const n = r.dir.dx !== 0 ? ex / r.dir.dx : ey / r.dir.dy;
    if (!Number.isInteger(n) || n <= 0) continue;
    if (ex !== r.dir.dx * n || ey !== r.dir.dy * n) continue;
    if (n <= r.length) return true;
    if (r.capture && sameSquare(r.capture, to)) return true;
  }
  return false;
}

// Is `sq` attacked by any piece of `by`?
export function isAttacked(pos: Position, sq: Square, by: Color): boolean {
  return attackersOf(pos, sq, by, true).length > 0;
}

export function attackersOf(pos: Position, sq: Square, by: Color, firstOnly = false): Square[] {
  const found: Square[] = [];
  const own = (s: Square, kinds: string): boolean => {
    const c = pos.atSquare(s);
    return c !== null && colorOf(c) === by && kinds.includes(kindOf(c));
  };
  const add = (s: Square) => found.push(s);
  for (const d of KNIGHT_JUMPS) {
    const s = step(sq, d);
    if (own(s, "N")) {
      add(s);
      if (firstOnly) return found;
    }
  }
  for (const d of ALL_DIRS) {
    const s = step(sq, d);
    if (own(s, "K")) {
      add(s);
      if (firstOnly) return found;
    }
  }
  // A pawn of colour `by` attacks `sq` from one rank behind it, from `by`'s point of view.
  for (const dx of [-1, 1]) {
    const s = { x: sq.x + dx, y: sq.y - forward(by) };
    if (own(s, "P")) {
      add(s);
      if (firstOnly) return found;
    }
  }
  for (const d of ALL_DIRS) {
    const end = rayEnd(pos, sq, d);
    if (!end.blocker) continue;
    const kinds = d.dx === 0 || d.dy === 0 ? "RQ" : "BQ";
    if (own(end.blocker, kinds)) {
      add(end.blocker);
      if (firstOnly) return found;
    }
  }
  return found;
}

export const inCheck = (pos: Position, color: Color): boolean =>
  isAttacked(pos, pos.kings[color], color === "w" ? "b" : "w");

// Past this the board arithmetic stops being exact and nothing is there.
export const COORD_LIMIT = 1_000_000_000;

const inRange = (s: Square): boolean =>
  Number.isSafeInteger(s.x) &&
  Number.isSafeInteger(s.y) &&
  Math.abs(s.x) <= COORD_LIMIT &&
  Math.abs(s.y) <= COORD_LIMIT;

// True when the move leaves the mover's own king safe.
export function isLegal(pos: Position, m: Move): boolean {
  if (!inRange(m.from) || !inRange(m.to)) return false;
  const piece = pos.atSquare(m.from);
  if (!piece || colorOf(piece) !== pos.turn) return false;
  const reach = pseudoReach(pos, m.from);
  if (!reach || !reachContains(reach, m.to)) return false;
  const trial = pos.clone();
  trial.play(m);
  return !inCheck(trial, colorOf(piece));
}

// The piece's legal destinations. Open rays stay open unless the king is in
// check or the piece is pinned, in which case the answer is a finite list.
export function legalReach(pos: Position, from: Square): Reach | null {
  const reach = pseudoReach(pos, from);
  if (!reach || colorOf(reach.piece) !== pos.turn) return null;
  const color = colorOf(reach.piece);
  const king = pos.kings[color];
  const isKing = kindOf(reach.piece) === "K";
  const checked = inCheck(pos, color);
  const pinned = !isKing && !checked && pinDirection(pos, from, king);
  if (!checked && !pinned && !isKing) return reach;
  const steps = reach.steps.filter((to) => isLegal(pos, { from, to }));
  const rays: Ray[] = [];
  for (const r of reach.rays) {
    if (pinned && !sameLine(r.dir, pinned)) continue;
    if (r.length === Infinity && !checked) {
      // Pinned along an open line: every square on the line is legal.
      rays.push(r);
      continue;
    }
    let length = 0;
    const legalSquares: Square[] = [];
    if (r.length <= NEAR) {
      for (let n = 1; n <= r.length; n++) {
        const to = step(from, r.dir, n);
        if (isLegal(pos, { from, to })) legalSquares.push(to);
      }
    } else if (checked) {
      // A long ray under check can only help where it meets the check line.
      const seg = checkSegment(pos, color);
      if (seg) {
        for (const n of segmentHits(from, r.dir, king, seg, 1)) {
          const to = step(king, seg.dir, n);
          if (isLegal(pos, { from, to })) legalSquares.push(to);
        }
      }
    }
    // Legal squares on a ray under check or pin form one contiguous stretch
    // only when they start at the piece; otherwise expose them as steps.
    for (const s of legalSquares) {
      const n = Math.max(Math.abs(s.x - from.x), Math.abs(s.y - from.y));
      if (n === length + 1) length++;
      else steps.push(s);
    }
    const capture = r.capture && isLegal(pos, { from, to: r.capture }) ? r.capture : null;
    if (length > 0 || capture) rays.push({ dir: r.dir, length, capture });
  }
  return { from, piece: reach.piece, steps, rays };
}

const sameLine = (a: Dir, b: Dir): boolean =>
  (a.dx === b.dx && a.dy === b.dy) || (a.dx === -b.dx && a.dy === -b.dy);

// If the piece on `from` shields its king from a slider, the direction from the
// king through the piece; otherwise null.
function pinDirection(pos: Position, from: Square, king: Square): Dir | null {
  const ex = from.x - king.x;
  const ey = from.y - king.y;
  if (ex !== 0 && ey !== 0 && Math.abs(ex) !== Math.abs(ey)) return null;
  const dir: Dir = { dx: Math.sign(ex), dy: Math.sign(ey) };
  const toPiece = rayEnd(pos, king, dir);
  if (!toPiece.blocker || !sameSquare(toPiece.blocker, from)) return null;
  const beyond = rayEnd(pos, from, dir);
  if (!beyond.blocker) return null;
  const c = pos.atSquare(beyond.blocker);
  const piece = pos.atSquare(from);
  if (!c || !piece || colorOf(c) === colorOf(piece)) return null;
  const kinds = dir.dx === 0 || dir.dy === 0 ? "RQ" : "BQ";
  return kinds.includes(kindOf(c)) ? dir : null;
}

// Squares the check-reply scan walks one by one; beyond them only a moved
// piece can reach the line, and those are enumerated instead.
const NEAR = 64;

interface Segment {
  dir: Dir;
  // Squares strictly between the king and the checker.
  length: number;
  checker: Square;
}

function checkSegment(pos: Position, color: Color): Segment | null {
  const king = pos.kings[color];
  const checkers = attackersOf(pos, king, color === "w" ? "b" : "w");
  if (checkers.length !== 1) return null;
  const checker = checkers[0] as Square;
  const dir: Dir = { dx: Math.sign(checker.x - king.x), dy: Math.sign(checker.y - king.y) };
  return {
    dir,
    length: Math.max(Math.abs(checker.x - king.x), Math.abs(checker.y - king.y)) - 1,
    checker,
  };
}

// Steps n along the check line, counted from the king, where a ray from `from`
// in direction `d` lands on it, with n at least `minN`.
function segmentHits(from: Square, d: Dir, king: Square, seg: Segment, minN: number): number[] {
  const D = seg.dir;
  const det = d.dx * -D.dy - d.dy * -D.dx;
  const rx = king.x - from.x;
  const ry = king.y - from.y;
  const out: number[] = [];
  if (det !== 0) {
    const i = (rx * -D.dy - ry * -D.dx) / det;
    const n = (d.dx * ry - d.dy * rx) / det;
    if (Number.isInteger(i) && Number.isInteger(n) && i >= 1 && n >= minN && n <= seg.length)
      out.push(n);
    return out;
  }
  // Parallel: only a ray along the line itself can reach it.
  const onLine = (from.x - king.x) * D.dy === (from.y - king.y) * D.dx;
  if (!onLine) return out;
  const at = D.dx !== 0 ? (from.x - king.x) / D.dx : (from.y - king.y) / D.dy;
  const towards = d.dx === D.dx && d.dy === D.dy ? 1 : -1;
  const n = at + towards;
  if (Number.isInteger(n) && n >= minN && n <= seg.length) out.push(n);
  return out;
}

// Whether `color`, in check, has any legal reply. Not meaningful when not in
// check: this position never stalemates, both sides always have free pieces.
export function hasReplyToCheck(pos: Position, color: Color): boolean {
  const king = pos.kings[color];
  for (const d of ALL_DIRS) {
    if (isLegal(pos, { from: king, to: step(king, d) })) return true;
  }
  const seg = checkSegment(pos, color);
  if (!seg) return false;
  for (const from of attackersOf(pos, seg.checker, color)) {
    if (isLegal(pos, { from, to: seg.checker })) return true;
  }
  for (let n = 1; n <= Math.min(seg.length, NEAR); n++) {
    if (coverable(pos, step(king, seg.dir, n), color)) return true;
  }
  if (seg.length <= NEAR) return false;
  for (const [from, c] of pos.movedPieces()) {
    if (colorOf(c) !== color || kindOf(c) === "K") continue;
    for (const n of farHits(from, c, king, seg)) {
      if (isLegal(pos, { from, to: step(king, seg.dir, n) })) return true;
    }
  }
  return false;
}

// Where a moved piece could land on the far part of the check line.
function farHits(from: Square, code: Code, king: Square, seg: Segment): number[] {
  const kind = kindOf(code);
  const dirs = kind === "B" ? DIAGONAL : kind === "R" ? ORTHOGONAL : kind === "Q" ? ALL_DIRS : [];
  const out: number[] = [];
  for (const d of dirs) out.push(...segmentHits(from, d, king, seg, NEAR + 1));
  const single =
    kind === "N"
      ? KNIGHT_JUMPS.map((d) => step(from, d))
      : kind === "P"
        ? [step(from, { dx: 0, dy: forward(colorOf(code)) })]
        : [];
  for (const s of single) {
    const n = seg.dir.dx !== 0 ? (s.x - king.x) / seg.dir.dx : (s.y - king.y) / seg.dir.dy;
    if (Number.isInteger(n) && n > NEAR && n <= seg.length && sameSquare(step(king, seg.dir, n), s))
      out.push(n);
  }
  return out;
}

// Can a non-king piece of `color` legally move onto the empty square `sq`?
function coverable(pos: Position, sq: Square, color: Color): boolean {
  const candidates: Square[] = [];
  for (const d of KNIGHT_JUMPS) candidates.push(step(sq, d));
  candidates.push({ x: sq.x, y: sq.y - forward(color) });
  for (const d of ALL_DIRS) {
    const end = rayEnd(pos, sq, d);
    if (end.blocker) candidates.push(end.blocker);
  }
  for (const from of candidates) {
    const c = pos.atSquare(from);
    if (!c || colorOf(c) !== color || kindOf(c) === "K") continue;
    if (isLegal(pos, { from, to: sq })) return true;
  }
  return false;
}

export type Outcome = "checkmate" | "check" | "quiet";

export function outcome(pos: Position): Outcome {
  const color = pos.turn;
  if (!inCheck(pos, color)) return "quiet";
  return hasReplyToCheck(pos, color) ? "check" : "checkmate";
}
