import {
  KEY_BISHOP,
  cannonFront,
  cannonSquare,
  channelSquare,
  gateSquare,
  towerSquare,
} from "./geometry.ts";
import { hasReplyToCheck, inCheck, isLegal, legalReach } from "./moves.ts";
import type { Move, Position } from "./position.ts";
import { ALL_DIRS } from "./rays.ts";
import type { Square } from "./square.ts";

// A black that follows the paper's main line with small announcements: the
// key bishop out `t` squares, every attacked rook up `height`, then cannons
// fired in order with their pawn threats and the gateway walks. Used to test
// white; the real black is the player.
export interface BlackPlan {
  t: number;
  height: number;
  cannons: number;
}

const step = (s: Square, dx: number, dy: number): Square => ({ x: s.x + dx, y: s.y + dy });

export class ScriptedBlack {
  private queue: Move[] = [];
  private cannon = 1;
  private shooter = 0;
  private wing = 1;
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
    const rook = this.attackedRook(pos);
    if (rook) return rook;
    for (let guard = 0; guard < 200; guard++) {
      const next = this.queue.shift();
      if (!next) {
        this.refill(pos);
        continue;
      }
      if (isLegal(pos, next)) return next;
    }
    throw new Error("scripted black found no legal move in its plan");
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

  private attackedRook(pos: Position): Move | null {
    for (let m = 0; m < 400; m++) {
      const home = towerSquare(m, 0, 0);
      if (pos.atSquare(home) !== "r") continue;
      const guard = towerSquare(m, 1, -1);
      if (pos.atSquare(guard) !== "P") continue;
      const up = { from: home, to: towerSquare(m, 0, this.plan.height) };
      if (isLegal(pos, up)) return up;
    }
    return null;
  }

  // The next stretch of the main line: fire a bishop at a fresh wing, walk
  // its pawn threats, then the gateway's attack squares and door.
  private refill(pos: Position): void {
    if (this.cannon > this.plan.cannons) {
      this.refillIdle(pos);
      return;
    }
    const n = this.cannon;
    const k = this.shooter;
    const w = this.wing;
    const from = cannonSquare(n, k, k);
    const hallway = 80 - 16 * w;
    const i = (from.x + from.y - hallway) / 2;
    const landing = step(from, -i, -i);
    this.queue.push({ from, to: landing });
    if (k >= 1) {
      const pawn = cannonSquare(n, k, k + 1);
      this.queue.push({ from: pawn, to: step(pawn, 0, -1) });
      this.queue.push({ from: step(pawn, 0, -1), to: step(pawn, 0, -2) });
      this.queue.push({ from: step(pawn, 0, -2), to: cannonSquare(n, k + 1, k - 2) });
    }
    let at = landing;
    for (let g = 0; g < w; g++) {
      const attack = gateSquare(w, g, 0, -5);
      this.queue.push({ from: at, to: attack });
      at = attack;
    }
    this.queue.push({ from: at, to: gateSquare(w, w - 1, 2, -3) });
    this.wing++;
    this.shooter++;
    if (this.shooter > n) {
      this.shooter = 0;
      this.cannon++;
    }
  }

  private refillIdle(pos: Position): void {
    if (!this.idle) {
      const n = this.plan.cannons + 1;
      const front = cannonFront(n);
      const out = step(front, -6, -6);
      this.queue.push({ from: front, to: out });
      this.idle = [out, step(out, -1, -1)];
      return;
    }
    const [a, b] = this.idle;
    this.queue.push(pos.atSquare(a) === "b" ? { from: a, to: b } : { from: b, to: a });
  }
}
