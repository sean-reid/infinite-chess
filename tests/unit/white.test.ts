import { describe, expect, it } from "vitest";
import { ScriptedBlack } from "../../engine/black.ts";
import { isLegal, outcome } from "../../engine/moves.ts";
import { Position, type Move } from "../../engine/position.ts";
import { chooseWhite } from "../../engine/white.ts";

const sq = (x: number, y: number) => ({ x, y });

type BlackMove = Move | ((pos: Position) => Move | null);

// Plays black's moves against white until mate, a missing move, or the cap.
function play(blackMoves: BlackMove[], cap = 400) {
  const pos = new Position();
  const reasons: string[] = [];
  let slowest = 0;
  let ply = 0;
  for (; ply < cap; ply++) {
    if (outcome(pos) === "checkmate") break;
    if (pos.turn === "b") {
      const next = blackMoves.shift();
      if (!next) break;
      const m = typeof next === "function" ? next(pos) : next;
      if (!m) break;
      expect(isLegal(pos, m), `black ${JSON.stringify(m)} at ply ${ply}`).toBe(true);
      pos.play(m);
    } else {
      const started = performance.now();
      const c = chooseWhite(pos);
      slowest = Math.max(slowest, performance.now() - started);
      expect(c, `white has a move at ply ${ply}`).not.toBeNull();
      expect(isLegal(pos, (c as { move: Move }).move)).toBe(true);
      reasons.push((c as { reason: string }).reason);
      pos.play((c as { move: Move }).move);
    }
  }
  return { pos, ply, reasons, slowest };
}

const scripted = (
  plan: { t: number; height: number; cannons: number },
  moves: number,
): BlackMove[] => {
  const black = new ScriptedBlack(plan);
  return Array.from({ length: moves }, () => (pos: Position) => black.choose(pos));
};

// Whole games take a few seconds each.
const LONG = 60_000;

describe("white against the paper's main line", () => {
  it(
    "mates when black opens the last tower and runs one small cannon",
    () => {
      const { pos, ply, reasons } = play(scripted({ t: 2, height: 3, cannons: 1 }, 400));
      expect(outcome(pos)).toBe("checkmate");
      expect(pos.turn).toBe("b");
      expect(ply).toBeLessThan(80);
      expect(reasons).toContain("answering wing 1 gate 1");
      expect(reasons).toContain("shoring up cannon 1");
      expect(reasons).toContain("marching the hole down tower 0");
      expect(reasons.at(-1)).toBe("mate");
    },
    LONG,
  );

  it(
    "works down from the third tower, closing each tower in turn",
    () => {
      const { pos, ply, reasons, slowest } = play(
        scripted({ t: 11, height: 2, cannons: 1 }, 900),
        900,
      );
      expect(outcome(pos)).toBe("checkmate");
      expect(ply).toBeLessThan(200);
      expect(slowest).toBeLessThan(1000);
      expect(reasons).toContain("closing tower 3");
      expect(reasons).toContain("closing tower 2");
      expect(reasons).toContain("unlocking tower 1");
      expect(reasons.at(-1)).toBe("mate");
    },
    LONG,
  );

  it(
    "unlocks the fourth tower from a landing square the paper does not use",
    () => {
      const { pos, ply, reasons } = play(scripted({ t: 13, height: 1, cannons: 1 }, 900), 900);
      expect(outcome(pos)).toBe("checkmate");
      expect(ply).toBeLessThan(300);
      expect(reasons).toContain("unlocking tower 4");
      expect(reasons).toContain("closing tower 4");
    },
    LONG,
  );
});

describe("white against deviations", () => {
  it("wins the race when a bishop leaves its gateway for the throne room", () => {
    const black = new ScriptedBlack({ t: 2, height: 3, cannons: 1 });
    const prefix: BlackMove[] = Array.from(
      { length: 4 },
      () => (pos: Position) => black.choose(pos),
    );
    const run: Move[] = [
      { from: sq(35, 33), to: sq(39, 37) },
      { from: sq(39, 37), to: sq(20, 56) },
      { from: sq(20, 56), to: sq(27, 63) },
      { from: sq(27, 63), to: sq(30, 60) },
      { from: sq(30, 60), to: sq(33, 63) },
      { from: sq(33, 63), to: sq(31, 65) },
    ];
    const { pos, reasons } = play([...prefix, ...run]);
    expect(outcome(pos)).toBe("checkmate");
    expect(pos.turn).toBe("b");
    expect(pos.at(31, 65)).not.toBe("b");
    expect(reasons.some((r) => r.startsWith("chasing") || r.startsWith("racing"))).toBe(true);
  });

  it("recaptures the key bishop's pawn grab and mates with the freed bishop", () => {
    let fired = false;
    const idle = (pos: Position): Move => {
      if (!fired) {
        fired = true;
        return { from: sq(59, 25), to: sq(53, 19) };
      }
      return pos.at(53, 19) === "b"
        ? { from: sq(53, 19), to: sq(52, 18) }
        : { from: sq(52, 18), to: sq(53, 19) };
    };
    const { pos, ply } = play([
      { from: sq(46, 45), to: sq(45, 44) },
      ...Array.from({ length: 12 }, () => idle),
    ]);
    expect(outcome(pos)).toBe("checkmate");
    expect(ply).toBeLessThan(12);
  });

  it(
    "takes a rook that never moves and still frees the mating bishop",
    () => {
      const { pos, reasons } = play(scripted({ t: 2, height: 0, cannons: 1 }, 400));
      expect(outcome(pos)).toBe("checkmate");
      expect(reasons).toContain("taking the rook of tower 0");
    },
    LONG,
  );

  it("takes the key bishop if black leaves it at home", () => {
    const { pos, reasons } = play(
      [
        { from: sq(52, 32), to: sq(42, 22) },
        { from: sq(42, 22), to: sq(43, 21) },
      ],
      6,
    );
    expect(reasons[0]).toBe("taking the key bishop");
    expect(pos.at(46, 45)).not.toBe("b");
    expect(reasons.at(-1)).toMatch(/racing|mate/);
  });
});
