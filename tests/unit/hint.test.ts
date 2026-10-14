import { describe, expect, it } from "vitest";
import { mainLine } from "../../engine/mainline.ts";
import { isLegal, outcome } from "../../engine/moves.ts";
import type { Move } from "../../engine/position.ts";
import { Position } from "../../engine/position.ts";
import { chooseWhite } from "../../engine/white.ts";

// On the paper's main line white gets a free move only after black opens a
// new cannon or makes one of the two limit moves: the key bishop out and the
// attacked rook up. Every other black move forces the reply. A hint that
// let white progress at any other moment would be off the line.
const FREE_FOR_WHITE =
  /^(climbing|unlocking|opening|marching|closing|taking the piece|searching|waiting)/;
const BLACK_LIMIT_MOVES = /^(Send the key bishop|The rook is attacked|Open cannon)/;

describe("the hint stays on black's main line", () => {
  it("never hands white a free move except after a limit move or a new cannon", () => {
    const pos = new Position();
    let lastHint = "";
    const slips: string[] = [];
    for (let ply = 0; ply < 260 && outcome(pos) !== "checkmate"; ply++) {
      if (pos.turn === "b") {
        const hint = mainLine(pos);
        expect(hint.move, `a hint at ply ${ply}`).not.toBeNull();
        let m = hint.move as Move;
        if (hint.open) {
          // The open-line form lets black pick any distance; take a larger one than the hint's own.
          const n = hint.open.dx === 0 ? 4 : 5;
          m = {
            from: m.from,
            to: { x: m.from.x + n * hint.open.dx, y: m.from.y + n * hint.open.dy },
          };
        }
        expect(isLegal(pos, m), `legal hint at ply ${ply}: ${hint.text}`).toBe(true);
        lastHint = hint.text;
        pos.play(m);
      } else {
        const c = chooseWhite(pos);
        expect(c, `white moves at ply ${ply}`).not.toBeNull();
        const reason = (c as { reason: string }).reason;
        if (FREE_FOR_WHITE.test(reason) && !BLACK_LIMIT_MOVES.test(lastHint)) {
          slips.push(`ply ${ply}: white "${reason}" after hint "${lastHint}"`);
        }
        pos.play(
          (c as { move: { from: { x: number; y: number }; to: { x: number; y: number } } }).move,
        );
      }
    }
    expect(slips).toEqual([]);
    expect(lastHint).not.toMatch(/Off the main line/);
  }, 120_000);
});
