import { describe, expect, it } from "vitest";
import { Position } from "../../engine/position.ts";
import { decodeMoves, encodeMoves, replayInto } from "../../src/store.ts";

describe("moves in the hash", () => {
  it("round-trips a move list, negatives included", () => {
    const moves = [
      { from: { x: 46, y: 45 }, to: { x: 57, y: 56 } },
      { from: { x: -3, y: 0 }, to: { x: -10, y: -7 } },
    ];
    const text = encodeMoves(moves);
    expect(text).toBe("46.45-57.56;-3.0--10.-7");
    expect(decodeMoves(text)).toEqual(moves);
    expect(decodeMoves("")).toEqual([]);
    expect(decodeMoves("46.45")).toBeNull();
    expect(decodeMoves("a.b-c.d")).toBeNull();
  });

  it("replays only as far as the moves stay legal", () => {
    const pos = new Position();
    const n = replayInto(pos, [
      { from: { x: 46, y: 45 }, to: { x: 57, y: 56 } },
      { from: { x: 58, y: 55 }, to: { x: 57, y: 56 } },
      { from: { x: 1, y: 1 }, to: { x: 1, y: 2 } },
    ]);
    expect(n).toBe(2);
    expect(pos.at(57, 56)).toBe("P");
  });
});
