import { describe, expect, it } from "vitest";
import { isDark, parseSquareKey, squareKey, squareName } from "../../engine/square.ts";

describe("squares", () => {
  it("colours a1 dark like a real board", () => {
    expect(isDark({ x: 1, y: 1 })).toBe(true);
    expect(isDark({ x: 2, y: 1 })).toBe(false);
    expect(isDark({ x: -3, y: 4 })).toBe(false);
  });

  it("round-trips keys, negatives included", () => {
    for (const s of [
      { x: 0, y: 0 },
      { x: -12, y: 345 },
      { x: 32, y: 57 },
    ]) {
      expect(parseSquareKey(squareKey(s))).toEqual(s);
    }
    expect(() => parseSquareKey("1,x")).toThrow();
  });

  it("names squares as integer pairs", () => {
    expect(squareName({ x: 32, y: 57 })).toBe("(32, 57)");
  });
});
