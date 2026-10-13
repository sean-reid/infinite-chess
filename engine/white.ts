import { Race, mateInOne, type Path } from "./bishops.ts";
import {
  ATTACK_SQUARES,
  DOOR,
  DOOR_PAWN,
  GUARD_STEPS,
  BOX_BISHOPS,
  KEY_BISHOP,
  MATING_BISHOP,
  cannonOf,
  cannonSquare,
  channelSquare,
  channelStep,
  climbPlan,
  gateAt,
  towerSquare,
  type Gate,
} from "./geometry.ts";
import { attackersOf, isLegal, legalReach, pseudoReach } from "./moves.ts";
import { colorOf, type Code } from "./pieces.ts";
import type { Move, Played, Position } from "./position.ts";
import { sameSquare, squareKey, type Square } from "./square.ts";

// White's play: the paper's winning strategy. Every decision is derived from
// the position and the move list, so a resumed game continues the same way.

export interface Choice {
  move: Move;
  reason: string;
}

export interface Towers {
  // The tower unlocked by the pawn that took the key bishop, if that has happened.
  first: number | null;
  // Towers whose rook has been captured, with the height it was taken at.
  taken: Map<number, number>;
}

export function towers(pos: Position): Towers {
  let first: number | null = null;
  const taken = new Map<number, number>();
  for (const p of pos.history) {
    if (p.captured === "b" && p.piece === "P") {
      const t = channelStep(p.to);
      if (t !== null) first = climbPlan(t).tower;
    }
    if (p.captured === "r" && (p.to.x - 44) % 3 === 0) {
      const m = (p.to.x - 44) / 3;
      taken.set(m, p.to.y - (54 + 3 * m));
    }
  }
  return { first, taken };
}

// The pawn that took the key bishop, wherever it is now.
function climber(pos: Position): { square: Square; t: number } | null {
  let square: Square | null = null;
  let t = 0;
  for (const p of pos.history) {
    if (p.captured === "b" && p.piece === "P") {
      const step = channelStep(p.to);
      if (step === null) continue;
      square = p.to;
      t = step;
    } else if (square && sameSquare(p.from, square)) {
      square = p.to;
    }
  }
  return square && pos.atSquare(square) === "P" ? { square, t } : null;
}

const legal = (pos: Position, from: Square, to: Square): Move | null =>
  isLegal(pos, { from, to }) ? { from, to } : null;

const step = (s: Square, dx: number, dy: number): Square => ({ x: s.x + dx, y: s.y + dy });

function* whiteOverlay(pos: Position): IterableIterator<[Square, Code]> {
  for (const [s, c] of pos.movedPieces()) if (colorOf(c) === "w") yield [s, c];
}
function* blackOverlay(pos: Position): IterableIterator<[Square, Code]> {
  for (const [s, c] of pos.movedPieces()) if (colorOf(c) === "b") yield [s, c];
}

interface GateState {
  gate: Gate;
  guardAt: number;
  door: Code | null;
  pawn: Code | null;
  attacked: boolean;
}

function gateState(pos: Position, gate: Gate): GateState {
  const g = gate.guard;
  let guardAt = -1;
  GUARD_STEPS.forEach(([dx, dy], i) => {
    if (pos.at(g.x + dx, g.y + dy) === "B") guardAt = i;
  });
  const attacked = ATTACK_SQUARES.some(([dx, dy]) => pos.at(g.x + dx, g.y + dy) === "b");
  return {
    gate,
    guardAt,
    door: pos.at(g.x + DOOR[0], g.y + DOOR[1]),
    pawn: pos.at(g.x + DOOR_PAWN[0], g.y + DOOR_PAWN[1]),
    attacked,
  };
}

function disturbedGates(pos: Position): GateState[] {
  const seen = new Map<string, Gate>();
  const probes: [number, number][] = [...ATTACK_SQUARES, DOOR, DOOR_PAWN, ...GUARD_STEPS];
  for (const k of pos.overlay.keys()) {
    const [x, y] = k.split(",").map(Number) as [number, number];
    const sq = { x, y };
    for (const [dx, dy] of probes) {
      const gate = gateAt(sq, dx, dy);
      if (gate) seen.set(squareKey(gate.guard), gate);
    }
  }
  return [...seen.values()].map((g) => gateState(pos, g));
}

// The gate reply the paper calls forced, with how many moves black is from
// mating if white never answers.
function gateReply(pos: Position, s: GateState): { move: Move; urgency: number } | null {
  const g = s.gate.guard;
  const at = (d: [number, number]) => step(g, d[0], d[1]);
  if (s.attacked && s.guardAt === 0) {
    const m = legal(pos, g, at(GUARD_STEPS[1] as [number, number]));
    if (m) return { move: m, urgency: 7 };
  }
  if (s.door === "b" && s.guardAt === 1) {
    const m = legal(
      pos,
      at(GUARD_STEPS[1] as [number, number]),
      at(GUARD_STEPS[2] as [number, number]),
    );
    if (m) return { move: m, urgency: 6 };
  }
  if (s.door === null && s.pawn === "P" && s.guardAt !== 0) {
    const m = legal(pos, at(DOOR_PAWN), at(DOOR));
    if (m) return { move: m, urgency: 5 };
  }
  return null;
}

function activeCannons(pos: Position): Set<number> {
  const out = new Set<number>();
  for (const k of pos.overlay.keys()) {
    const [x, y] = k.split(",").map(Number) as [number, number];
    const c = cannonOf({ x, y });
    if (c) out.add(c.n);
  }
  return out;
}

// After shooter k of cannon n fires, its threat pawn walks down to take the
// wall pawn at (k + 1, k - 2) and the guard pawn at (k + 2, k - 6) must keep
// pace to retake there.
function cannonReply(pos: Position, n: number): { move: Move; urgency: number } | null {
  const sq = (dx: number, dy: number) => cannonSquare(n, dx, dy);
  let best: { move: Move; urgency: number } | null = null;
  for (let k = 1; k <= n; k++) {
    if (pos.atSquare(sq(k, k)) === "b") continue;
    const threatPath = [sq(k, k + 1), sq(k, k), sq(k, k - 1)];
    const wall = sq(k + 1, k - 2);
    let steps = threatPath.findIndex((s) => pos.atSquare(s) === "p");
    if (steps < 0 && pos.atSquare(wall) === "p") steps = 3;
    if (steps < 0) continue;
    const guardPath = [0, 1, 2, 3].map((a) => sq(k + 2, k - 6 + a));
    const advanced = guardPath.findIndex((s) => pos.atSquare(s) === "P");
    if (advanced < 0) continue;
    let candidate: { move: Move; urgency: number } | null = null;
    if (steps === 3) {
      if (advanced === 3) {
        const m = legal(pos, guardPath[3] as Square, wall);
        if (m) candidate = { move: m, urgency: 4 };
      }
    } else if (advanced < steps + 1) {
      const m = legal(pos, guardPath[advanced] as Square, guardPath[advanced + 1] as Square);
      if (m) candidate = { move: m, urgency: 8 - steps };
    }
    if (candidate && (!best || candidate.urgency < best.urgency)) best = candidate;
  }
  return best;
}

const CAPTURE_ORDER = "BPRQNK";

function captureLastMover(pos: Position, tw: Towers): Move | null {
  const last = pos.history[pos.history.length - 1];
  if (!last || colorOf(last.piece) !== "b") return null;
  if (last.piece === "r" && !rookWorthTaking(pos, last, tw)) return null;
  const attackers = attackersOf(pos, last.to, "w").filter((a) => pos.atSquare(a) !== "K");
  attackers.sort(
    (a, b) =>
      CAPTURE_ORDER.indexOf(pos.atSquare(a) as string) -
      CAPTURE_ORDER.indexOf(pos.atSquare(b) as string),
  );
  for (const from of attackers) {
    const m = legal(pos, from, last.to);
    if (m) return m;
  }
  return null;
}

// A rook stirring in a tower well beyond the active one is ignored the first
// time, so black cannot draw by harassing with rook after rook.
function rookWorthTaking(pos: Position, last: Played, tw: Towers): boolean {
  const m = Math.round((last.from.x - 44) / 3);
  const active = activeTower(pos, tw);
  if (active === null || m <= active + 1) return true;
  return pos.history.filter((p) => p.piece === "r" && sameSquare(p.to, last.from)).length > 0;
}

export function activeTower(pos: Position, tw: Towers): number | null {
  if (tw.first === null) return null;
  let m = tw.first;
  while (m > 0 && tw.taken.has(m) && columnClosed(pos, m, tw.taken.get(m) as number)) m--;
  return m;
}

// The left column of tower m is whole again and its bishop has stepped in.
function columnClosed(pos: Position, m: number, j: number): boolean {
  for (let h = 0; h < j; h++) if (!pos.atSquare(towerSquare(m, -1, h))) return false;
  return true;
}

function holeHeight(pos: Position, m: number, j: number): number | null {
  for (let h = 0; h < j; h++) if (!pos.atSquare(towerSquare(m, -1, h))) return h;
  return null;
}

const ZIGZAG: [number, number][] = [
  [2, 3],
  [3, 2],
  [2, 1],
  [3, 0],
  [2, -1],
  [3, -2],
  [2, -3],
];

function keyPawnMove(pos: Position, m: number): Move | null {
  const k = towerSquare(m, 2, -4);
  const a = towerSquare(m, 2, -3);
  const b = towerSquare(m, 2, -2);
  const guard = towerSquare(m, 1, -1);
  if (pos.atSquare(k) === "P" && !pos.atSquare(a)) return legal(pos, k, a);
  if (pos.atSquare(a) === "P" && !pos.atSquare(b)) return legal(pos, a, b);
  if (pos.atSquare(b) === "P" && pos.atSquare(guard) === "p") return legal(pos, b, guard);
  return null;
}

function shuffleUp(pos: Position, m: number): Move | null {
  for (let i = 0; i + 1 < ZIGZAG.length; i++) {
    const hole = towerSquare(m, ...(ZIGZAG[i] as [number, number]));
    const below = towerSquare(m, ...(ZIGZAG[i + 1] as [number, number]));
    if (!pos.atSquare(hole) && pos.atSquare(below) === "B") {
      const mv = legal(pos, below, hole);
      if (mv) return mv;
    }
  }
  return null;
}

// Opening a tower from the inner wall: the pawn below the captured wall pawn
// steps up, three bishops slide down into the gap, then the key pawn goes.
function firstUnlock(pos: Position, m: number): Move | null {
  const s = (dx: number, dy: number) => towerSquare(m, dx, dy);
  const plan: [Square, Square, Code][] = [
    [s(3, -6), s(3, -5), "P"],
    [s(2, -5), s(4, -7), "B"],
    [s(3, -4), s(2, -5), "B"],
    [s(2, -3), s(3, -4), "B"],
  ];
  for (const [from, to, piece] of plan) {
    if (pos.atSquare(from) === piece && !pos.atSquare(to)) {
      const mv = legal(pos, from, to);
      if (mv) return mv;
    }
  }
  return keyPawnMove(pos, m);
}

function rookAnswer(pos: Position, m: number): Move | null {
  const guard = towerSquare(m, 1, -1);
  if (pos.atSquare(guard) !== "P") return null;
  const home = towerSquare(m, 0, 0);
  if (pos.atSquare(home) === "r") return legal(pos, guard, home);
  for (let j = 1; j < 1_000_000; j++) {
    const sq = towerSquare(m, 0, j);
    const c = pos.atSquare(sq);
    if (c === "r") return legal(pos, towerSquare(m, -1, j - 1), sq);
    if (c) return null;
    if (j > 64 && !pos.overlay.has(squareKey(sq))) {
      // Beyond here only a moved rook can sit; look it up directly.
      for (const [s, code] of blackOverlay(pos)) {
        if (code === "r" && s.x === home.x && s.y > sq.y)
          return legal(pos, towerSquare(m, -1, s.y - home.y - 1), s);
      }
      return null;
    }
  }
  return null;
}

function climbMove(pos: Position): Move | null {
  const c = climber(pos);
  if (!c) return null;
  const { captures } = climbPlan(c.t);
  const land = channelSquare(c.t);
  const up = step(land, 0, 1);
  if (sameSquare(c.square, land)) return legal(pos, land, up);
  let at = up;
  for (let i = 1; i <= captures; i++) {
    const next = { x: 44 + c.t + i, y: 46 + c.t + i };
    if (sameSquare(c.square, at) && pos.atSquare(next) === "p") return legal(pos, at, next);
    at = next;
  }
  return null;
}

export function towerMove(pos: Position, tw: Towers): Choice | null {
  const climb = climbMove(pos);
  if (climb) return { move: climb, reason: "climbing the inner wall" };
  if (tw.first === null) return null;
  const m = activeTower(pos, tw) ?? tw.first;
  const answer = rookAnswer(pos, m);
  if (answer) return { move: answer, reason: `taking the rook of tower ${m}` };
  const j = tw.taken.get(m);
  if (j !== undefined) {
    const h = holeHeight(pos, m, j);
    if (h !== null && h >= 1) {
      const mv = legal(pos, towerSquare(m, -1, h - 1), towerSquare(m, -1, h));
      if (mv) return { move: mv, reason: `marching the hole down tower ${m}` };
    }
    if (h === 0 && m > 0) {
      const mv = legal(pos, towerSquare(m, 0, -1), towerSquare(m, -1, 0));
      if (mv) return { move: mv, reason: `closing tower ${m}` };
    }
    return null;
  }
  const unlock = m === tw.first ? firstUnlock(pos, m) : (shuffleUp(pos, m) ?? keyPawnMove(pos, m));
  if (unlock) return { move: unlock, reason: `unlocking tower ${m}` };
  return null;
}

export function looseWhite(pos: Position): Square[] {
  const out: Square[] = [];
  for (const [s, c] of whiteOverlay(pos)) if (c === "B") out.push(s);
  for (const s of [MATING_BISHOP, ...BOX_BISHOPS]) {
    if (pos.atSquare(s) === "B" && !pos.overlay.has(squareKey(s))) out.push(s);
  }
  return out;
}

function blackLoose(pos: Position): Square[] {
  const out: Square[] = [];
  for (const [s, c] of blackOverlay(pos)) if (c === "b") out.push(s);
  return out;
}

interface Race0 extends Path {
  from: Square;
}

// Bishops in the tower band above the channel can never reach the open area.
const inTowerBand = (s: Square): boolean => s.x >= 47 && s.y >= 38 && s.y - s.x >= -8;

function bestRace(pos: Position, from: Square[], color: "w" | "b", approach = false): Race0 | null {
  const race = new Race(pos, color);
  if (!race.anyTargets) return null;
  let best: Race0 | null = null;
  for (const f of from) {
    const p = race.within3(f) ?? (approach && !inTowerBand(f) ? race.approach(f) : null);
    if (p && (!best || p.moves < best.moves)) best = { ...p, from: f };
  }
  return best;
}

// After a black bishop leaves a gate, the guard follows two moves behind on
// the parallel diagonal one square below, as the paper describes.
function chaseMove(pos: Position): Choice | null {
  for (const s of disturbedGates(pos)) {
    if (s.door !== "P" || s.pawn !== null) continue;
    const g = s.gate.guard;
    const door = step(g, DOOR[0], DOOR[1]);
    let exitIndex = -1;
    for (let i = pos.history.length - 1; i >= 0; i--) {
      const p = pos.history[i] as Played;
      if (p.piece === "b" && sameSquare(p.from, door)) {
        exitIndex = i;
        break;
      }
    }
    if (exitIndex < 0) continue;
    const runner: Square[] = [(pos.history[exitIndex] as Played).to];
    for (let i = exitIndex + 1; i < pos.history.length; i++) {
      const p = pos.history[i] as Played;
      if (sameSquare(p.from, runner[runner.length - 1] as Square)) runner.push(p.to);
    }
    const plan: Square[] = [
      step(g, DOOR_PAWN[0], DOOR_PAWN[1]),
      ...runner.map((r) => step(r, 0, -1)),
    ];
    let guard: Square | null = null;
    for (const [sq, c] of whiteOverlay(pos)) {
      if (c !== "B") continue;
      if (
        sameSquare(sq, step(g, GUARD_STEPS[2]![0], GUARD_STEPS[2]![1])) ||
        plan.some((q) => sameSquare(q, sq))
      )
        guard = sq;
    }
    if (!guard) continue;
    let next = 0;
    plan.forEach((q, i) => {
      if (sameSquare(q, guard as Square)) next = i + 1;
    });
    const target = plan[next];
    if (!target) continue;
    const mv = legal(pos, guard, target);
    if (mv) return { move: mv, reason: `chasing the bishop out of wing ${s.gate.n}` };
  }
  return null;
}

function whiteMovesIn(pos: Position, x0: number, x1: number, y0: number, y1: number): Move[] {
  const out: Move[] = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const c = pos.at(x, y);
      if (!c || colorOf(c) !== "w" || c === "K") continue;
      const r = pseudoReach(pos, { x, y });
      if (!r) continue;
      for (const s of r.steps) out.push({ from: { x, y }, to: s });
      for (const ray of r.rays) {
        const n = Math.min(ray.length, 8);
        for (let i = 1; i <= n; i++)
          out.push({ from: { x, y }, to: { x: x + ray.dir.dx * i, y: y + ray.dir.dy * i } });
        if (ray.capture) out.push({ from: { x, y }, to: ray.capture });
      }
    }
  }
  return out.filter((m) => m.to.x >= x0 && m.to.x <= x1 && m.to.y >= y0 && m.to.y <= y1);
}

const stateKey = (pos: Position): string =>
  [...pos.overlay.entries()]
    .sort()
    .map(([k, v]) => `${k}:${v ?? "-"}`)
    .join("|");

// Breadth-first over white's own moves near tower m until the key pawn is on
// its way. Used when the scripted unlock does not apply.
function searchUnlock(pos: Position, m: number, maxDepth = 7, maxStates = 12_000): Move | null {
  const r = towerSquare(m, 0, 0);
  const win: [number, number, number, number] = [r.x - 6, r.x + 12, r.y - 14, r.y + 10];
  const key = towerSquare(m, 2, -4);
  const guard = towerSquare(m, 1, -1);
  const done =
    m === 0
      ? (p: Position) => {
          p.turn = "w";
          const reach = legalReach(p, MATING_BISHOP);
          return !!reach && (reach.steps.length > 0 || reach.rays.length > 0);
        }
      : (p: Position) => p.atSquare(key) !== "P" || p.atSquare(guard) === "P";
  if (done(pos.clone())) return null;
  const seen = new Set([stateKey(pos)]);
  let frontier: { pos: Position; first: Move }[] = [];
  for (const mv of whiteMovesIn(pos, ...win)) {
    const q = pos.clone();
    q.play(mv);
    q.turn = "w";
    const k = stateKey(q);
    if (seen.has(k)) continue;
    seen.add(k);
    if (done(q)) return mv;
    frontier.push({ pos: q, first: mv });
  }
  for (let d = 2; d <= maxDepth; d++) {
    const next: typeof frontier = [];
    for (const { pos: p, first } of frontier) {
      for (const mv of whiteMovesIn(p, ...win)) {
        const q = p.clone();
        q.play(mv);
        q.turn = "w";
        const k = stateKey(q);
        if (seen.has(k)) continue;
        seen.add(k);
        if (seen.size > maxStates) return null;
        if (done(q)) return first;
        next.push({ pos: q, first });
      }
    }
    frontier = next;
    if (!frontier.length) return null;
  }
  return null;
}

export function chooseWhite(pos: Position): Choice | null {
  if (pos.turn !== "w") throw new Error("not white's turn");
  const tw = towers(pos);

  const mate = mateInOne(pos, looseWhite(pos));
  if (mate) return { move: mate, reason: "mate" };

  const white = bestRace(pos, looseWhite(pos), "w", true);
  const black = bestRace(pos, blackLoose(pos), "b");
  if (white && (!black || white.moves <= black.moves)) {
    const mv = legal(pos, white.from, white.first);
    if (mv) return { move: mv, reason: `racing to mate in ${white.moves}` };
  }

  const chase = chaseMove(pos);
  if (chase) return chase;

  const replies: { move: Move; urgency: number; reason: string }[] = [];
  for (const s of disturbedGates(pos)) {
    const r = gateReply(pos, s);
    if (r) replies.push({ ...r, reason: `answering wing ${s.gate.n} gate ${s.gate.k + 1}` });
  }
  for (const n of activeCannons(pos)) {
    const r = cannonReply(pos, n);
    if (r) replies.push({ ...r, reason: `shoring up cannon ${n}` });
  }
  replies.sort((a, b) => a.urgency - b.urgency);
  const reply = replies[0];
  if (reply) return { move: reply.move, reason: reply.reason };

  const capture = captureLastMover(pos, tw);
  if (capture) return { move: capture, reason: "taking the piece that just moved" };

  if (white) {
    const mv = legal(pos, white.from, white.first);
    if (mv) return { move: mv, reason: `racing to mate in ${white.moves}` };
  }

  if (pos.atSquare(KEY_BISHOP) === "b") {
    for (const from of [step(KEY_BISHOP, -1, -1), step(KEY_BISHOP, 1, -1)]) {
      const mv = legal(pos, from, KEY_BISHOP);
      if (mv) return { move: mv, reason: "taking the key bishop" };
    }
  }

  const tower = towerMove(pos, tw);
  if (tower) return tower;

  if (tw.first !== null) {
    const m = activeTower(pos, tw) ?? tw.first;
    const found = searchUnlock(pos, m);
    if (found) return { move: found, reason: `searching for a way into tower ${m}` };
  }

  return waitingMove(pos);
}

// Nothing useful to do: nudge a guard pawn in a cannon black has not touched.
function waitingMove(pos: Position): Choice | null {
  const used = activeCannons(pos);
  for (let n = 1; n < 10_000; n++) {
    if (used.has(n)) continue;
    const from = cannonSquare(n, 3, -5);
    const mv = legal(pos, from, step(from, 0, 1));
    if (mv) return { move: mv, reason: "waiting" };
  }
  return null;
}
