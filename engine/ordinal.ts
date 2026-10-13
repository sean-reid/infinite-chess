import { Race } from "./bishops.ts";
import { MATING_BISHOP, cannonSquare, gateSquare, towerSquare } from "./geometry.ts";
import { freshGates, lastShot, wingOfHallway } from "./mainline.ts";
import { legalReach } from "./moves.ts";
import { colorOf } from "./pieces.ts";
import type { Position } from "./position.ts";
import type { Square } from "./square.ts";
import { activeTower, looseWhite, towerMove, towers } from "./white.ts";

// The paper's bookkeeping for the main line: omega^3 r + omega^2 h + omega b + g.
// r rook heights still to be chosen, h white moves until the next rook is
// attacked, b shooters left in the cannon in use, g forced replies left for
// the bishop in play. A term is null until black's play has fixed it.
export interface GameValue {
  r: number | null;
  h: number | null;
  b: number | null;
  // "open" right after a shot, before the bishop has chosen a wing.
  g: number | "open" | null;
  mateIn: number | null;
  offLine: boolean;
}

const H_CAP = 20_000;

// White moves on the main line until a rook is attacked, or, once no rook is
// left, until the mating bishop can move: white's tower plan played against a
// passing black.
function movesToNextRook(pos: Position): { h: number; tower: number } | null {
  const sim = pos.clone();
  sim.turn = "w";
  const tw = towers(sim);
  if (tw.first === null) return null;
  const first = tw.first;
  const rooksLeft = () => {
    for (let m = first; m >= 0; m--) if (sim.atSquare(towerSquare(m, 0, 0)) === "r") return true;
    return false;
  };
  const bishopFree = () => {
    const reach = legalReach(sim, MATING_BISHOP);
    return !!reach && (reach.steps.length > 0 || reach.rays.length > 0);
  };
  for (let h = 0; h <= H_CAP; h++) {
    for (let m = first; m >= 0; m--) {
      if (sim.atSquare(towerSquare(m, 0, 0)) === "r" && sim.atSquare(towerSquare(m, 1, -1)) === "P")
        return { h, tower: m };
    }
    if (!rooksLeft() && bishopFree()) return { h, tower: -1 };
    const choice = towerMove(sim, towers(sim));
    if (!choice) return null;
    sim.play(choice.move);
    sim.turn = "w";
  }
  return null;
}

function shotsLeft(pos: Position, n: number): number {
  let b = 0;
  for (let k = 1; k <= n; k++) if (pos.atSquare(cannonSquare(n, k, k)) === "b") b++;
  return b;
}

// Steps the threat pawn behind shooter k still has, capture included.
function pawnStepsLeft(pos: Position, n: number, k: number): number {
  if (k < 1) return 0;
  const path = [cannonSquare(n, k, k + 1), cannonSquare(n, k, k), cannonSquare(n, k, k - 1)];
  for (let i = 0; i < path.length; i++) if (pos.atSquare(path[i] as Square) === "p") return 3 - i;
  return 0;
}

export function gameValue(pos: Position): GameValue {
  const value: GameValue = { r: null, h: null, b: null, g: null, mateIn: null, offLine: false };
  const mate = new Race(pos, "w");
  for (const s of looseWhite(pos)) {
    const p = mate.within3(s) ?? mate.approach(s);
    if (p && (value.mateIn === null || p.moves < value.mateIn)) value.mateIn = p.moves;
  }
  const tw = towers(pos);
  if (tw.first === null) return value;
  const next = movesToNextRook(pos);
  if (!next) {
    value.offLine = value.mateIn === null;
    return value;
  }
  let r = 0;
  for (let m = 0; m <= tw.first; m++) if (pos.atSquare(towerSquare(m, 0, 0)) === "r") r++;
  value.r = r;
  value.h = next.h;
  const shot = lastShot(pos);
  if (!shot) return value;
  value.b = shotsLeft(pos, shot.n);
  const code = pos.atSquare(shot.square);
  if (!code || colorOf(code) !== "b") {
    value.g = 0;
    return value;
  }
  const w = wingOfHallway(shot.square);
  if (w === null) {
    value.g = "open";
    return value;
  }
  let g = pawnStepsLeft(pos, shot.n, shot.k) + freshGates(pos, w).length;
  for (let k = 0; k < w; k++) if (pos.atSquare(gateSquare(w, k, 2, -3)) === "P") g += 1;
  if (g > 0 && pos.atSquare(gateSquare(w, 0, 2, -3)) !== "P" && freshGates(pos, w).length === 0)
    g = pawnStepsLeft(pos, shot.n, shot.k);
  value.g = g;
  value.offLine = activeTower(pos, tw) === null;
  return value;
}

const sup = (n: number): string => (n === 1 ? "" : `<sup>${n}</sup>`);

// The ordinal as HTML, dropping absent terms the way the paper's limits do.
export function formatValue(v: GameValue): string {
  if (v.mateIn !== null) return `${v.mateIn}`;
  if (v.r === null) return "ω<sup>4</sup>";
  const terms: string[] = [];
  const coef = (power: number, n: number) =>
    n === 0 ? "" : `ω${sup(power)}${n === 1 ? "" : `·${n}`}`;
  if (v.b === null) {
    const r = coef(3, v.r);
    const h = v.h === null ? "" : coef(2, v.h);
    terms.push(r, h);
  } else {
    terms.push(coef(3, v.r), v.h === null ? "" : coef(2, v.h));
    if (v.g === "open") terms.push(coef(1, v.b + 1));
    else terms.push(coef(1, v.b), v.g === null || v.g === 0 ? "" : `${v.g}`);
  }
  const out = terms.filter(Boolean).join(" + ");
  return out || "0";
}
