import { describe, expect, it } from "vitest";
import { decodeMoves, encodeMoves, packMoves, unpackMoves } from "../../src/codec.ts";
import { Position } from "../../engine/position.ts";
import { replayInto } from "../../src/store.ts";

const moves = [
  { from: { x: 46, y: 45 }, to: { x: 57, y: 56 } },
  { from: { x: -3, y: 0 }, to: { x: -10, y: -7 } },
  { from: { x: 44, y: 54 }, to: { x: 44, y: 1054 } },
];

describe("moves packed for a link", () => {
  it("round-trips through varints, negatives and long moves included", () => {
    expect(unpackMoves(packMoves(moves))).toEqual(moves);
    expect(unpackMoves(packMoves([]))).toEqual([]);
    expect(unpackMoves(Uint8Array.from([1, 2, 3]))).toBeNull();
  });

  it("round-trips through deflate and base64url", async () => {
    const text = await encodeMoves(moves);
    expect(text).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await decodeMoves(text)).toEqual(moves);
    expect(await decodeMoves("")).toEqual([]);
    expect(await decodeMoves("!!not base64")).toBeNull();
    expect(await decodeMoves("AAAA")).toBeNull();
  });

  it("still reads the earlier plain text form", async () => {
    expect(await decodeMoves("46.45-57.56;-3.0--10.-7")).toEqual(moves.slice(0, 2));
    expect(await decodeMoves("46.45")).toBeNull();
  });

  it("stays short for a long march", async () => {
    const march = [];
    for (let i = 0; i < 300; i++) {
      march.push({ from: { x: 52, y: 60 + i }, to: { x: 52, y: 61 + i } });
      march.push({ from: { x: 53, y: 19 + (i % 2) }, to: { x: 52 + (i % 2), y: 18 + (i % 2) } });
    }
    const text = await encodeMoves(march);
    expect(text.length).toBeLessThan(200);
    expect(await decodeMoves(text)).toEqual(march);
  });
});

describe("replay", () => {
  it("takes moves only as far as they stay legal", () => {
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
