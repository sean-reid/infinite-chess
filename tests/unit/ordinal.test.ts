import { describe, expect, it } from "vitest";
import { ScriptedBlack } from "../../engine/black.ts";
import { mainLine } from "../../engine/mainline.ts";
import { outcome } from "../../engine/moves.ts";
import { formatValue, gameValue, type GameValue } from "../../engine/ordinal.ts";
import { Position } from "../../engine/position.ts";
import { chooseWhite } from "../../engine/white.ts";

const plain = (v: GameValue) => formatValue(v).replace(/<sup>(.*?)<\/sup>/g, "^$1");

// Plays the main line from the third tower and keeps the value at every black turn.
function trace(): { values: Map<number, GameValue>; pos: Position } {
  const pos = new Position();
  const black = new ScriptedBlack({ t: 11, height: 2, cannons: 1 });
  const values = new Map<number, GameValue>();
  for (let ply = 0; ply < 400 && outcome(pos) !== "checkmate"; ply++) {
    if (pos.turn === "b") {
      values.set(ply, gameValue(pos));
      const m = black.choose(pos);
      if (!m) break;
      pos.play(m);
    } else {
      const c = chooseWhite(pos);
      if (!c) break;
      pos.play(c.move);
    }
  }
  return { values, pos };
}

describe("the game value along the main line", () => {
  const { values, pos } = trace();
  const at = (ply: number) => values.get(ply) as GameValue;

  it("starts at omega to the fourth and fixes r and h once the bishop lands", () => {
    expect(plain(at(0))).toBe("ω^4");
    expect(at(2).r).toBe(4);
    expect(at(2).h).toBe(10);
    expect(plain(at(2))).toBe("ω^3·4 + ω^2·10");
  });

  it("counts gateway threats down one per black move and reopens on the next shot", () => {
    expect(at(4)).toMatchObject({ r: 4, h: 9, b: 1, g: 2 });
    expect(at(8).g).toBe("open");
    expect(plain(at(8))).toBe("ω^3·4 + ω^2·9 + ω·2");
    expect(at(10)).toMatchObject({ b: 0, g: 7 });
    expect(at(12).g).toBe(6);
  });

  it("drops a tower each time a rook is taken and ends in a mate count", () => {
    const rs = [...values.values()].map((v) => v.r);
    expect(rs).toContain(3);
    expect(rs).toContain(1);
    expect(rs).toContain(0);
    const last = [...values.values()].at(-1) as GameValue;
    expect(last.mateIn).toBe(1);
    expect(plain(last)).toBe("1");
    expect(outcome(pos)).toBe("checkmate");
  });

  it("never reports the main line as lost on the main line", () => {
    expect([...values.values()].some((v) => v.offLine)).toBe(false);
  });
}, 120_000);

describe("the value far out", () => {
  it("answers in constant time when the key bishop went a million squares out", () => {
    const pos = new Position();
    pos.play({ from: { x: 46, y: 45 }, to: { x: 46 + 999_999, y: 45 + 999_999 } });
    const c = chooseWhite(pos);
    expect(c?.reason).toBe("taking the piece that just moved");
    pos.play(
      (c as { move: { from: { x: number; y: number }; to: { x: number; y: number } } }).move,
    );
    const started = performance.now();
    const v = gameValue(pos);
    expect(performance.now() - started).toBeLessThan(2000);
    expect(v.r).toBe(333_334);
    expect(v.offLine).toBe(false);
  });
});

describe("black's main line hint", () => {
  it("starts with the key bishop and names the direction", () => {
    const h = mainLine(new Position());
    expect(h.move?.from).toEqual({ x: 46, y: 45 });
    expect(h.open).toEqual({ dx: 1, dy: 1 });
    expect(h.text).toMatch(/key bishop/);
  });

  it("asks for the rook once it is attacked", () => {
    const pos = new Position();
    const black = new ScriptedBlack({ t: 2, height: 3, cannons: 1 });
    for (let ply = 0; ply < 60; ply++) {
      if (pos.turn === "b") {
        const h = mainLine(pos);
        if (h.open?.dy === 1 && h.open.dx === 0) {
          expect(h.move?.from).toEqual({ x: 44, y: 54 });
          expect(h.text).toMatch(/rook/);
          return;
        }
        const m = black.choose(pos);
        if (!m) break;
        pos.play(m);
      } else {
        const c = chooseWhite(pos);
        if (!c) break;
        pos.play(c.move);
      }
    }
    throw new Error("the rook was never attacked");
  }, 60_000);
});
