import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { baseAt, cannonFront, wingGuard } from "../../engine/base.ts";
import type { Code } from "../../engine/pieces.ts";

// Figure 1 of the paper in the chess font's encoding: Z and 0 are empty squares,
// P O white pawns, o p black pawns, B white bishop, a b black bishop, s black
// rook, k black king, J white king. Row 0 is rank 83, column 0 is file 1.
const GLYPH: Record<string, Code | null> = {
  Z: null,
  "0": null,
  P: "P",
  O: "P",
  o: "p",
  p: "p",
  B: "B",
  a: "b",
  b: "b",
  s: "r",
  k: "k",
  J: "K",
};
const rows = readFileSync(new URL("../fixtures/figure1.txt", import.meta.url), "utf8")
  .trim()
  .split("\n");
const figure = (x: number, y: number): Code | null => {
  const row = rows[rows.length - y];
  const ch = row?.[x - 1];
  if (ch === undefined) throw new Error(`off the figure: ${x},${y}`);
  const code = GLYPH[ch];
  if (code === undefined) throw new Error(`unknown glyph ${ch}`);
  return code;
};
const width = rows[0]?.length ?? 0;
const height = rows.length;

// Figure 1 departs from its own patterns in three places and the generator
// follows the patterns: the fifth wing's gate block is drawn one square down
// and right, the fourth cannon has a pawn where every other cannon has its last
// backup bishop, and a lone white pawn sits at (70, 21). Figure 5 of the paper,
// the authors' detail of a three-shooter, has no pawn on that square.
const fifthWingBlock = (x: number, y: number) => x <= 4 && y <= 7;
const deviations = new Set(["77,17", "70,21"]);

describe("the generated position against Figure 1", () => {
  it("reads the whole figure", () => {
    expect(width).toBe(77);
    expect(height).toBe(83);
  });

  it("matches every square outside the known deviations", () => {
    const bad: string[] = [];
    for (let y = 1; y <= height; y++) {
      for (let x = 1; x <= width; x++) {
        if (fifthWingBlock(x, y) || deviations.has(`${x},${y}`)) continue;
        if (baseAt(x, y) !== figure(x, y))
          bad.push(`${x},${y} figure ${figure(x, y)} got ${baseAt(x, y)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("places the fifth wing's gate block where the figure has it, shifted by (1, -1)", () => {
    for (let y = 1; y <= 8; y++) {
      for (let x = 1; x <= 5; x++) {
        expect(figure(x, y), `${x},${y}`).toBe(baseAt(x - 1, y + 1));
      }
    }
    expect(figure(77, 17)).toBe("p");
    expect(baseAt(77, 17)).toBe("b");
    expect(figure(70, 21)).toBe("P");
    expect(baseAt(70, 21)).toBeNull();
  });

  it("holds the kings and the key pieces where the paper puts them", () => {
    expect(baseAt(32, 66)).toBe("K");
    expect(baseAt(32, 57)).toBe("k");
    expect(baseAt(46, 45)).toBe("b");
    expect(baseAt(44, 53)).toBe("B");
    expect(baseAt(44, 54)).toBe("r");
  });
});

describe("the patterns continue past the figure", () => {
  it("builds rook towers up and to the right forever", () => {
    for (const k of [10, 100, 10_000]) {
      expect(baseAt(44 + 3 * k, 54 + 3 * k)).toBe("r");
      expect(baseAt(43 + 3 * k, 54 + 3 * k)).toBe("P");
      expect(baseAt(44 + 3 * k, 54 + 3 * k + 777)).toBeNull();
      expect(baseAt(45 + 3 * k, 54 + 3 * k + 777)).toBe("P");
    }
  });

  it("builds one cannon of every size down and to the right", () => {
    for (const n of [5, 40, 3_000]) {
      const [fx, fy] = cannonFront(n);
      expect(baseAt(fx, fy)).toBe("b");
      expect(baseAt(fx + n + 1, fy + n + 1)).toBe("b");
      expect(baseAt(fx + n + 2, fy + n + 2)).toBe("p");
      expect(baseAt(fx + n + 2, fy - 6 + n)).toBe("P");
      expect(baseAt(fx + n + 3, fy - 5 + n)).toBeNull();
      expect(baseAt(fx - 3, fy - 3)).toBeNull();
      expect(baseAt(fx - 4, fy - 4)).toBeNull();
      expect(baseAt(fx - 2, fy - 4)).toBe("p");
      expect(baseAt(fx - 4, fy - 2)).toBe("p");
    }
  });

  it("builds one gateway wing of every length down and to the left", () => {
    for (const n of [5, 40, 3_000]) {
      const [gx, gy] = wingGuard(n);
      expect(baseAt(gx, gy)).toBe("B");
      expect(baseAt(gx + 2, gy - 3)).toBe("P");
      expect(baseAt(gx, gy - 5)).toBeNull();
      expect(baseAt(gx - 6 * (n - 1), gy + 6 * (n - 1))).toBe("B");
      expect(baseAt(gx - 6 * n, gy + 6 * n)).toBeNull();
      expect(baseAt(gx - 6 * (n - 1) - 1, gy + 6 * (n - 1) - 4)).toBe("p");
    }
  });

  it("leaves the free area and the far quadrants empty", () => {
    expect(baseAt(0, 0)).toBeNull();
    expect(baseAt(-500, 500)).toBeNull();
    expect(baseAt(10, 70)).toBeNull();
    expect(baseAt(41, 36)).toBeNull();
    expect(baseAt(42, 36)).toBeNull();
  });

  it("answers a 300 by 300 window quickly", () => {
    const start = performance.now();
    let n = 0;
    for (let y = -150; y < 150; y++) for (let x = -150; x < 150; x++) if (baseAt(x, y)) n++;
    expect(n).toBeGreaterThan(1000);
    expect(performance.now() - start).toBeLessThan(500);
  });
});
