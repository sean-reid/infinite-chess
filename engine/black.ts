import { KEY_BISHOP, cannonFront, cannonOf, channelSquare, towerSquare } from "./geometry.ts";
import { attackedRook, mainLine } from "./mainline.ts";
import { hasReplyToCheck, inCheck, isLegal, legalReach } from "./moves.ts";
import type { Move, Position } from "./position.ts";
import { ALL_DIRS } from "./rays.ts";
import { sameSquare, type Square } from "./square.ts";

// A black that follows the paper's main line with small announcements: the
// key bishop out `t` squares, every attacked rook up `height`, then cannons
// in order up to `cannons`, after which it shuffles a spare bishop. Used to
// test white; the real black is the player.
export interface BlackPlan {
  t: number;
  height: number;
  cannons: number;
}

const step = (s: Square, dx: number, dy: number): Square => ({ x: s.x + dx, y: s.y + dy });

export class ScriptedBlack {
  private idle: [Square, Square] | null = null;
  private readonly plan: BlackPlan;

  constructor(plan: BlackPlan) {
    this.plan = plan;
  }

  choose(pos: Position): Move | null {
    if (pos.turn !== "b") throw new Error("not black's turn");
    if (inCheck(pos, "b")) return this.escape(pos);
    if (pos.atSquare(KEY_BISHOP) === "b") {
      const m = { from: KEY_BISHOP, to: channelSquare(this.plan.t) };
      if (isLegal(pos, m)) return m;
    }
    const rook = attackedRook(pos);
    if (rook !== null) {
      const from = towerSquare(rook, 0, 0);
      const up = { from, to: step(from, 0, this.plan.height) };
      if (isLegal(pos, up)) return up;
    }
    const hint = mainLine(pos);
    if (hint.move && isLegal(pos, hint.move)) {
      const c = cannonOf(hint.move.from);
      const isRook = rook !== null && sameSquare(hint.move.from, towerSquare(rook, 0, 0));
      if (!isRook && (!c || c.n <= this.plan.cannons)) return hint.move;
    }
    return this.idleMove(pos);
  }

  private escape(pos: Position): Move | null {
    if (!hasReplyToCheck(pos, "b")) return null;
    const king = pos.kings.b;
    for (const d of ALL_DIRS) {
      const m = { from: king, to: step(king, d.dx, d.dy) };
      if (isLegal(pos, m)) return m;
    }
    for (const [s] of pos.movedPieces()) {
      const r = legalReach(pos, s);
      if (!r) continue;
      const to = r.steps[0] ?? (r.rays[0] ? step(s, r.rays[0].dir.dx, r.rays[0].dir.dy) : null);
      if (to) return { from: s, to };
    }
    return null;
  }

  private idleMove(pos: Position): Move | null {
    if (!this.idle) {
      const front = cannonFront(this.plan.cannons + 1);
      const out = step(front, -6, -6);
      this.idle = [out, step(out, -1, -1)];
      const m = { from: front, to: out };
      if (isLegal(pos, m)) return m;
    }
    const [a, b] = this.idle;
    const m = pos.atSquare(a) === "b" ? { from: a, to: b } : { from: b, to: a };
    return isLegal(pos, m) ? m : null;
  }
}
