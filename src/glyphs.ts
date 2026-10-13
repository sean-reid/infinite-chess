import type { Kind } from "../engine/pieces.ts";

// Piece silhouettes in a 100 by 100 box, y down. Flat shapes that still read
// at twelve pixels.
const SHAPES: Record<Kind, string> = {
  P: "M40 30a10 10 0 1 0 20 0a10 10 0 1 0 -20 0ZM42 42H58L65 70H35ZM28 72H72V84H28Z",
  R: "M30 16H40V26H46V16H54V26H60V16H70V36H30ZM36 38H64V68H36ZM28 70H72V84H28Z",
  B: "M44 16a6 6 0 1 0 12 0a6 6 0 1 0 -12 0ZM50 24C36 34 30 48 34 62H66C70 48 64 34 50 24ZM32 64H68V72H32ZM28 74H72V84H28Z",
  N: "M30 84V72C30 60 40 54 44 46L36 46C32 46 30 41 33 37L48 22L56 20L60 12L63 22L73 32C79 42 75 58 70 66L68 84Z",
  Q: "M24 42L34 22L42 42L50 16L58 42L66 22L76 42L70 70H30ZM28 72H72V84H28Z",
  K: "M46 8H54V17H63V25H54V34H46V25H37V17H46ZM35 36H65L70 70H30ZM28 72H72V84H28Z",
};

const cache = new Map<Kind, Path2D>();

export function glyph(kind: Kind): Path2D {
  let p = cache.get(kind);
  if (!p) {
    p = new Path2D(SHAPES[kind]);
    cache.set(kind, p);
  }
  return p;
}
