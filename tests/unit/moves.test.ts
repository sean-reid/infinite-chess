import { describe, expect, it } from "vitest";
import { inCheck, isLegal, legalReach, outcome, pseudoReach } from "../../engine/moves.ts";
import { Position } from "../../engine/position.ts";
import { rayEnd } from "../../engine/rays.ts";

const sq = (x: number, y: number) => ({ x, y });

describe("rays", () => {
  it("runs the key bishop's diagonal up the channel for ever", () => {
    const pos = new Position();
    expect(rayEnd(pos, sq(46, 45), { dx: 1, dy: 1 })).toEqual({ length: Infinity, blocker: null });
    expect(rayEnd(pos, sq(46, 45), { dx: -1, dy: -1 })).toEqual({ length: 0, blocker: sq(45, 44) });
  });

  it("runs a rook up its tower for ever and stops it everywhere else", () => {
    const pos = new Position();
    expect(rayEnd(pos, sq(44, 54), { dx: 0, dy: 1 }).length).toBe(Infinity);
    expect(rayEnd(pos, sq(44, 54), { dx: 0, dy: -1 })).toEqual({ length: 0, blocker: sq(44, 53) });
    expect(rayEnd(pos, sq(44, 54), { dx: 1, dy: 0 })).toEqual({ length: 0, blocker: sq(45, 54) });
  });

  it("knows the arena is open below and finds the wing above", () => {
    const pos = new Position();
    pos.set(sq(30, 10), "b");
    expect(rayEnd(pos, sq(30, 10), { dx: -1, dy: -1 }).length).toBe(Infinity);
    expect(rayEnd(pos, sq(30, 10), { dx: 1, dy: -1 }).length).toBe(Infinity);
    expect(rayEnd(pos, sq(30, 10), { dx: -1, dy: 1 })).toEqual({ length: 5, blocker: sq(24, 16) });
  });

  it("sees a moved piece far out on an otherwise open ray", () => {
    const pos = new Position();
    pos.set(sq(46 + 5000, 45 + 5000), "b");
    expect(rayEnd(pos, sq(46, 45), { dx: 1, dy: 1 })).toEqual({
      length: 4999,
      blocker: sq(5046, 5045),
    });
  });
});

describe("moves", () => {
  it("gives the key bishop one open ray and three pawn captures", () => {
    const reach = pseudoReach(new Position(), sq(46, 45));
    expect(reach?.piece).toBe("b");
    expect(reach?.steps).toEqual([]);
    const byDir = Object.fromEntries(
      (reach?.rays ?? []).map((r) => [`${r.dir.dx},${r.dir.dy}`, [r.length, r.capture]]),
    );
    expect(byDir).toEqual({
      "1,1": [Infinity, null],
      "1,-1": [0, sq(47, 44)],
      "-1,1": [0, sq(45, 46)],
      "-1,-1": [0, sq(45, 44)],
    });
  });

  it("lets black send the key bishop out and white take it with a pawn", () => {
    const pos = new Position();
    const out = { from: sq(46, 45), to: sq(57, 56) };
    expect(isLegal(pos, out)).toBe(true);
    pos.play(out);
    expect(pos.turn).toBe("w");
    expect(pos.at(57, 56)).toBe("b");
    expect(isLegal(pos, { from: sq(58, 55), to: sq(57, 56) })).toBe(true);
    expect(isLegal(pos, { from: sq(58, 55), to: sq(58, 56) })).toBe(false);
    pos.play({ from: sq(58, 55), to: sq(57, 56) });
    expect(pos.at(57, 56)).toBe("P");
    pos.undo();
    pos.undo();
    expect(pos.at(46, 45)).toBe("b");
    expect(pos.overlay.size).toBe(0);
  });

  it("refuses moves out of turn and moves off the piece's lines", () => {
    const pos = new Position();
    expect(isLegal(pos, { from: sq(58, 55), to: sq(58, 56) })).toBe(false);
    expect(isLegal(pos, { from: sq(46, 45), to: sq(46, 46) })).toBe(false);
    expect(isLegal(pos, { from: sq(46, 45), to: sq(50, 48) })).toBe(false);
  });

  it("mates the black king from the diagonal the paper marks", () => {
    const pos = new Position();
    pos.set(sq(26, 63), "B");
    expect(inCheck(pos, "b")).toBe(true);
    expect(outcome(pos)).toBe("checkmate");
    expect(legalReach(pos, sq(31, 57))?.rays).toEqual([]);
  });

  it("mates the white king from the square the paper names", () => {
    const pos = new Position();
    pos.set(sq(31, 65), "b");
    pos.turn = "w";
    expect(inCheck(pos, "w")).toBe(true);
    expect(outcome(pos)).toBe("checkmate");
  });

  it("is only check when a piece can interpose, and offers just that square", () => {
    const pos = new Position();
    pos.set(sq(26, 63), "B");
    pos.set(sq(27, 64), "r");
    expect(outcome(pos)).toBe("check");
    const reach = legalReach(pos, sq(27, 64));
    expect(reach?.steps).toEqual([sq(27, 62)]);
    expect(reach?.rays).toEqual([]);
  });
});

describe("check from far away", () => {
  it("decides mate from a checker a hundred thousand squares out without walking the line", () => {
    const pos = new Position();
    const d = 100_000;
    pos.set(sq(32 - d, 57 + d), "B");
    const started = performance.now();
    expect(outcome(pos)).toBe("checkmate");
    expect(performance.now() - started).toBeLessThan(1000);
  });

  it("still finds a moved rook that can interpose far up the line", () => {
    const pos = new Position();
    const d = 100_000;
    pos.set(sq(32 - d, 57 + d), "B");
    pos.set(sq(-5, 57 + 50_000), "r");
    expect(outcome(pos)).toBe("check");
    const reach = legalReach(pos, sq(-5, 57 + 50_000));
    expect(reach?.steps).toContainEqual(sq(32 - 50_000, 57 + 50_000));
    expect(reach?.steps).toContainEqual(sq(-5, 57 + 37));
  });
});
