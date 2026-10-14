import { KEY_BISHOP, cannonOf, climbPlan } from "./geometry.ts";
import { hallwaySum, touchedWings } from "./mainline.ts";
import { isLegal, type Ray } from "./moves.ts";
import type { Position } from "./position.ts";
import { sameSquare, type Square } from "./square.ts";

export interface Landing {
  n: number;
  label: string;
}

const MAX_LANDINGS = 6;

// The squares along an open ray where landing means something: the key
// bishop's first move picks how many towers white must work through, and a
// cannon shooter has to reach the hallway of a wing nobody has touched.
export function landings(pos: Position, from: Square, ray: Ray): Landing[] {
  const out: Landing[] = [];
  const { dx, dy } = ray.dir;
  if (sameSquare(from, KEY_BISHOP) && dx === 1 && dy === 1) {
    let t = 1;
    while (out.length < MAX_LANDINGS && t <= ray.length) {
      const r = climbPlan(t).tower + 1;
      if (r > out.length) out.push({ n: t, label: `${r} tower${r === 1 ? "" : "s"}` });
      t++;
    }
    return out;
  }
  const c = cannonOf(from);
  if (c && c.dx === c.dy && c.dx >= 0 && dx === -1 && dy === -1 && pos.atSquare(from) === "b") {
    const touched = touchedWings(pos);
    for (let w = 1; w <= 400 && out.length < MAX_LANDINGS; w++) {
      if (touched.has(w)) continue;
      const i = (from.x + from.y - hallwaySum(w)) / 2;
      if (!Number.isInteger(i) || i < 1) continue;
      if (i > ray.length) break;
      if (isLegal(pos, { from, to: { x: from.x - i, y: from.y - i } }))
        out.push({ n: i, label: `wing ${w}` });
    }
  }
  return out;
}

// How far along `ray` the hint's move goes, or null when it is not on this ray.
export function distanceAlong(from: Square, to: Square, ray: Ray): number | null {
  const ddx = to.x - from.x;
  const ddy = to.y - from.y;
  const n = Math.max(Math.abs(ddx), Math.abs(ddy));
  if (n < 1 || ddx !== ray.dir.dx * n || ddy !== ray.dir.dy * n) return null;
  return n;
}
