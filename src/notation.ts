import type { Played } from "../engine/position.ts";
import { kindOf } from "../engine/pieces.ts";
import { squareName } from "../engine/square.ts";

export const moveText = (p: Played): string =>
  `${p.piece === p.piece.toLowerCase() ? kindOf(p.piece).toLowerCase() : kindOf(p.piece)} ${squareName(p.from)} ${p.captured ? "×" : "→"} ${squareName(p.to)}`;
