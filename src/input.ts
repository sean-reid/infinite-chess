import { MAX_SCALE, MIN_SCALE, type Board } from "./board.ts";
import type { Square } from "../engine/square.ts";

export interface InputHandlers {
  tap(square: Square): void;
  changed(): void;
}

// Drag to pan, wheel or pinch to zoom, tap to select. A pointer that moves
// more than a few pixels is a drag, not a tap.
export function attachInput(board: Board, handlers: InputHandlers): void {
  const canvas = board.canvas;
  const pointers = new Map<number, { x: number; y: number }>();
  let dragging = false;
  let moved = false;
  let last: { x: number; y: number } | null = null;
  let pinch: { dist: number; scale: number } | null = null;

  const local = (e: PointerEvent | WheelEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const zoomAt = (px: number, py: number, factor: number) => {
    const before = board.view.scale;
    const after = Math.min(MAX_SCALE, Math.max(MIN_SCALE, before * factor));
    if (after === before) return;
    const anchor = board.squareAt(px, py);
    board.view.scale = after;
    const now = board.squareAt(px, py);
    board.view.cx += anchor.x - now.x;
    board.view.cy += anchor.y - now.y;
    handlers.changed();
  };

  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.set(e.pointerId, p);
    if (pointers.size === 1) {
      dragging = true;
      moved = false;
      last = p;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()] as [{ x: number; y: number }, { x: number; y: number }];
      pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale: board.view.scale };
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    const p = local(e);
    pointers.set(e.pointerId, p);
    if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()] as [{ x: number; y: number }, { x: number; y: number }];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      zoomAt(mid.x, mid.y, (pinch.scale * (dist / pinch.dist)) / board.view.scale);
      moved = true;
      return;
    }
    if (!dragging || !last) return;
    const dx = p.x - last.x;
    const dy = p.y - last.y;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    moved = true;
    board.view.cx -= dx / board.view.scale;
    board.view.cy += dy / board.view.scale;
    last = p;
    handlers.changed();
  });

  const release = (e: PointerEvent) => {
    const p = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) {
      if (dragging && !moved && p) handlers.tap(board.squareAt(p.x, p.y));
      dragging = false;
      last = null;
    }
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const p = local(e);
      if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
      }
    },
    { passive: false },
  );

  canvas.addEventListener("keydown", (e) => {
    const step = 4;
    const v = board.view;
    switch (e.key) {
      case "ArrowLeft":
        v.cx -= step;
        break;
      case "ArrowRight":
        v.cx += step;
        break;
      case "ArrowUp":
        v.cy += step;
        break;
      case "ArrowDown":
        v.cy -= step;
        break;
      case "+":
      case "=":
        zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1.25);
        return;
      case "-":
        zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 0.8);
        return;
      default:
        return;
    }
    e.preventDefault();
    handlers.changed();
  });
}
