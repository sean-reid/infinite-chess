import type { Played } from "../engine/position.ts";
import { kindOf } from "../engine/pieces.ts";
import type { Square } from "../engine/square.ts";

const compact = (s: Square): string => `(${s.x},${s.y})`;

export const moveText = (p: Played): string =>
  `${p.piece === p.piece.toLowerCase() ? kindOf(p.piece).toLowerCase() : kindOf(p.piece)} ${compact(p.from)}${p.captured ? "×" : "→"}${compact(p.to)}`;
