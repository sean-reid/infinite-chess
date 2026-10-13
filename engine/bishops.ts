import { isLegal, outcome } from "./moves.ts";
import { colorOf, type Code, type Color } from "./pieces.ts";
import type { Move, Position } from "./position.ts";
import { DIAGONAL, rayEnd, type Dir } from "./rays.ts";
import { squareKey, type Square } from "./square.ts";

// Squares from which a bishop of `color` gives check: the enemy king's
// diagonals out to the first piece, capped so an open diagonal stays finite.
export function checkingSquares(pos: Position, color: Color, cap = 120): Square[] {
  const king = pos.kings[color === "w" ? "b" : "w"];
  const out: Square[] = [];
  for (const d of DIAGONAL) {
    const end = rayEnd(pos, king, d);
    const n = Math.min(end.length, cap);
    for (let i = 1; i <= n; i++) out.push({ x: king.x + d.dx * i, y: king.y + d.dy * i });
  }
  return out;
}

export interface Path {
  moves: number;
  first: Square;
}

interface Segment {
  from: Square;
  dir: Dir;
  length: number;
}

const isDark = (s: Square): boolean => (((s.x + s.y) % 2) + 2) % 2 === 0;

const at = (seg: Segment, i: number): Square => ({
  x: seg.from.x + seg.dir.dx * i,
  y: seg.from.y + seg.dir.dy * i,
});

const lineKeys = (s: Square): [string, string] => [`d${s.x - s.y}`, `a${s.x + s.y}`];

function segments(pos: Position, from: Square, horizon: number): Segment[] {
  return DIAGONAL.map((dir) => ({
    from,
    dir,
    length: Math.min(rayEnd(pos, from, dir).length, horizon),
  }));
}

// Where two diagonal segments of opposite orientation cross, as step counts
// along each, or null.
function crossing(a: Segment, b: Segment): [number, number] | null {
  const det = a.dir.dx * -b.dir.dy - a.dir.dy * -b.dir.dx;
  if (det === 0) return null;
  const rx = b.from.x - a.from.x;
  const ry = b.from.y - a.from.y;
  const i = (rx * -b.dir.dy - ry * -b.dir.dx) / det;
  const j = (a.dir.dx * ry - a.dir.dy * rx) / det;
  if (!Number.isInteger(i) || !Number.isInteger(j)) return null;
  if (i < 1 || i > a.length || j < 1 || j > b.length) return null;
  return [i, j];
}

// Bishop distances to the squares that check the enemy king, for one side in
// one position. Exact for one, two and three moves; four is found by trying
// the near part of each ray as a first move.
export class Race {
  readonly color: Color;
  private readonly pos: Position;
  private readonly targets: Square[];
  private readonly targetKeys: Set<string>;
  private readonly back: Segment[];
  private readonly byLine = new Map<string, Segment[]>();
  private readonly enemyPawn: Code;
  private readonly pawnDir: number;

  constructor(pos: Position, color: Color, horizon = 400) {
    this.pos = pos;
    this.color = color;
    this.targets = checkingSquares(pos, color);
    this.targetKeys = new Set(this.targets.map(squareKey));
    this.back = this.targets.flatMap((t) => segments(pos, t, horizon));
    for (const seg of this.back) {
      const key =
        seg.dir.dx === seg.dir.dy ? `d${seg.from.x - seg.from.y}` : `a${seg.from.x + seg.from.y}`;
      const list = this.byLine.get(key) ?? [];
      list.push(seg);
      this.byLine.set(key, list);
    }
    this.enemyPawn = color === "w" ? "p" : "P";
    this.pawnDir = color === "w" ? 1 : -1;
  }

  get anyTargets(): boolean {
    return this.targets.length > 0;
  }

  private safe(s: Square): boolean {
    const { pos, enemyPawn, pawnDir } = this;
    return (
      pos.at(s.x - 1, s.y + pawnDir) !== enemyPawn && pos.at(s.x + 1, s.y + pawnDir) !== enemyPawn
    );
  }

  private seesTarget(s: Square): boolean {
    for (const key of lineKeys(s)) {
      for (const seg of this.byLine.get(key) ?? []) {
        const i = seg.dir.dx !== 0 ? (s.x - seg.from.x) / seg.dir.dx : 0;
        if (Number.isInteger(i) && i >= 1 && i <= seg.length && s.y === seg.from.y + seg.dir.dy * i)
          return true;
      }
    }
    return false;
  }

  // Up to three moves from `from`, which need not hold the bishop yet.
  within3(from: Square, horizon = 400, reach3 = 60): Path | null {
    if (!this.targets.some((t) => isDark(t) === isDark(from))) return null;
    const pos = this.pos;
    const own = segments(pos, from, horizon);
    for (const seg of own) {
      for (let i = 1; i <= seg.length; i++)
        if (this.targetKeys.has(squareKey(at(seg, i)))) return { moves: 1, first: at(seg, i) };
      const end = rayEnd(pos, from, seg.dir);
      if (end.blocker && this.targetKeys.has(squareKey(end.blocker))) {
        const c = pos.atSquare(end.blocker);
        if (c && colorOf(c) !== this.color) return { moves: 1, first: end.blocker };
      }
    }
    let third: Path | null = null;
    for (const seg of own) {
      for (let i = 1; i <= seg.length; i++) {
        const s = at(seg, i);
        if (!this.safe(s)) continue;
        if (this.seesTarget(s)) return { moves: 2, first: s };
        if (third || i > reach3) continue;
        for (const dir of DIAGONAL) {
          if (dir.dx === seg.dir.dx && dir.dy === seg.dir.dy) continue;
          const ray: Segment = {
            from: s,
            dir,
            length: Math.min(rayEnd(pos, s, dir).length, horizon),
          };
          for (const b of this.back) {
            const x = crossing(ray, b);
            if (x && this.safe(at(ray, x[0]))) {
              third = { moves: 3, first: s };
              break;
            }
          }
          if (third) break;
        }
      }
    }
    return third;
  }

  // Four moves: a first move after which a target is within three.
  approach(from: Square, reach = 40): Path | null {
    if (!this.targets.some((t) => isDark(t) === isDark(from))) return null;
    const own = segments(this.pos, from, reach).filter((seg) => seg.length > 0);
    if (!own.length) return null;
    const trial = this.pos.clone();
    trial.set(from, null);
    const inner = new Race(trial, this.color);
    for (const seg of own) {
      for (let i = 1; i <= seg.length; i++) {
        const s = at(seg, i);
        if (!this.safe(s)) continue;
        const p = inner.within3(s, 400, 40);
        if (p && p.moves === 3) return { moves: 4, first: s };
      }
    }
    return null;
  }
}

// A move by one of `from` that mates at once, if there is one.
export function mateInOne(pos: Position, from: Square[]): Move | null {
  const color = pos.turn;
  const targets = checkingSquares(pos, color);
  for (const f of from) {
    const piece = pos.atSquare(f);
    if (!piece || colorOf(piece) !== color) continue;
    for (const to of targets) {
      const m = { from: f, to };
      if (!isLegal(pos, m)) continue;
      const trial = pos.clone();
      trial.play(m);
      if (outcome(trial) === "checkmate") return m;
    }
  }
  return null;
}
