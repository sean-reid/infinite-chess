import type { View } from "./board.ts";

// Opening views: the key bishop's corner of the towers with the throne room
// in sight, sized for a phone or a desktop.
export const NARROW_VIEW: View = { cx: 44, cy: 48, scale: 14 };
export const WIDE_VIEW: View = { cx: 42, cy: 46, scale: 20 };
export const NARROW_BELOW = 1024;
