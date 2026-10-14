import { isWhite, kindOf, type Code } from "../engine/pieces.ts";
import { glyph } from "./glyphs.ts";
import type { Position } from "../engine/position.ts";
import type { Ray } from "../engine/moves.ts";
import type { Square } from "../engine/square.ts";

export interface View {
  // Board coordinates at the centre of the canvas and pixels per square.
  cx: number;
  cy: number;
  scale: number;
}

export interface Marks {
  selected?: Square | null;
  rays?: Ray[];
  steps?: Square[];
  lastMove?: { from: Square; to: Square } | null;
  check?: Square | null;
  target?: Square | null;
}

interface Palette {
  paper: string;
  ink: string;
  inkSoft: string;
  shade: string;
  rule: string;
  accent: string;
  mono: string;
}

const readPalette = (el: HTMLElement): Palette => {
  const s = getComputedStyle(el);
  const v = (name: string) => s.getPropertyValue(name).trim();
  return {
    paper: v("--paper"),
    ink: v("--ink"),
    inkSoft: v("--ink-soft"),
    shade: v("--shade"),
    rule: v("--rule"),
    accent: v("--accent"),
    mono: v("--mono"),
  };
};

export const MIN_SCALE = 3;
export const MAX_SCALE = 96;

export class Board {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  view: View;
  private palette: Palette;
  private width = 0;
  private height = 0;

  constructor(canvas: HTMLCanvasElement, view: View) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d context unavailable");
    this.ctx = ctx;
    this.view = view;
    this.palette = readPalette(canvas);
  }

  refreshPalette(): void {
    this.palette = readPalette(this.canvas);
  }

  // Matches the canvas buffer to its CSS size and the device pixel ratio.
  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Pixel position of a square's top-left corner.
  origin(s: Square): [number, number] {
    const { cx, cy, scale } = this.view;
    return [this.width / 2 + (s.x - cx - 0.5) * scale, this.height / 2 - (s.y - cy + 0.5) * scale];
  }

  squareAt(px: number, py: number): Square {
    const { cx, cy, scale } = this.view;
    return {
      x: Math.round(cx + (px - this.width / 2) / scale),
      y: Math.round(cy - (py - this.height / 2) / scale),
    };
  }

  inView(s: Square): boolean {
    const v = this.visible();
    return s.x > v.x0 + 1 && s.x < v.x1 - 1 && s.y > v.y0 + 1 && s.y < v.y1 - 1;
  }

  centreOn(s: Square): void {
    this.view.cx = s.x;
    this.view.cy = s.y;
    if (this.view.scale < 12) this.view.scale = 16;
  }

  visible(): { x0: number; x1: number; y0: number; y1: number } {
    const a = this.squareAt(0, this.height);
    const b = this.squareAt(this.width, 0);
    return { x0: a.x - 1, x1: b.x + 1, y0: a.y - 1, y1: b.y + 1 };
  }

  draw(pos: Position, marks: Marks = {}): void {
    const { ctx, palette } = this;
    const { scale } = this.view;
    ctx.fillStyle = palette.paper;
    ctx.fillRect(0, 0, this.width, this.height);
    const v = this.visible();
    ctx.fillStyle = palette.shade;
    for (let y = v.y0; y <= v.y1; y++) {
      for (let x = v.x0; x <= v.x1; x++) {
        if ((x + y) % 2 !== 0) continue;
        const [px, py] = this.origin({ x, y });
        ctx.fillRect(px, py, scale, scale);
      }
    }
    if (marks.lastMove) {
      for (const s of [marks.lastMove.from, marks.lastMove.to])
        this.outline(s, palette.inkSoft, Math.max(1, scale / 16));
    }
    if (marks.check) {
      const [px, py] = this.origin(marks.check);
      ctx.fillStyle = palette.accent;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(px, py, scale, scale);
      ctx.globalAlpha = 1;
    }
    for (let y = v.y0; y <= v.y1; y++) {
      for (let x = v.x0; x <= v.x1; x++) {
        const code = pos.at(x, y);
        if (code) this.piece({ x, y }, code);
      }
    }
    if (marks.selected) {
      const [px, py] = this.origin(marks.selected);
      ctx.fillStyle = palette.accent;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(px, py, scale, scale);
      ctx.globalAlpha = 1;
      this.outline(marks.selected, palette.accent, Math.max(1.5, scale / 10));
    }
    const dots: Square[] = [...(marks.steps ?? [])];
    const captures: Square[] = [];
    for (const r of marks.rays ?? []) {
      const from = marks.selected;
      if (!from) break;
      const n = Math.min(r.length, 4000);
      for (let i = 1; i <= n; i++) {
        const s = { x: from.x + r.dir.dx * i, y: from.y + r.dir.dy * i };
        if (s.x < v.x0 || s.x > v.x1 || s.y < v.y0 || s.y > v.y1) continue;
        dots.push(s);
      }
      if (r.capture) captures.push(r.capture);
    }
    ctx.fillStyle = palette.accent;
    for (const s of dots) {
      const [px, py] = this.origin(s);
      ctx.beginPath();
      ctx.arc(px + scale / 2, py + scale / 2, Math.max(1.5, scale / 7), 0, Math.PI * 2);
      ctx.fill();
    }
    for (const s of captures) this.outline(s, palette.accent, Math.max(1.5, scale / 10));
    if (marks.target) this.ring(marks.target, palette.accent, Math.max(1.5, scale / 10));
    this.rulers(v);
  }

  private ring(s: Square, colour: string, width: number): void {
    const { ctx } = this;
    const { scale } = this.view;
    const [px, py] = this.origin(s);
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(px + scale / 2, py + scale / 2, scale * 0.42 - width / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  private outline(s: Square, colour: string, width: number): void {
    const { ctx } = this;
    const { scale } = this.view;
    const [px, py] = this.origin(s);
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.strokeRect(px + width / 2, py + width / 2, scale - width, scale - width);
  }

  // Pieces are flat silhouettes: white filled paper with an ink outline,
  // black filled ink. Below readable size they become marks of the same weight.
  private piece(s: Square, code: Code): void {
    const { ctx, palette } = this;
    const { scale } = this.view;
    const [px, py] = this.origin(s);
    const white = isWhite(code);
    if (scale < 8) {
      const r = Math.max(1, scale * 0.3);
      ctx.beginPath();
      ctx.arc(px + scale / 2, py + scale / 2, r, 0, Math.PI * 2);
      if (white) {
        ctx.fillStyle = palette.paper;
        ctx.fill();
        ctx.lineWidth = Math.max(0.75, scale / 10);
        ctx.strokeStyle = palette.ink;
        ctx.stroke();
      } else {
        ctx.fillStyle = palette.ink;
        ctx.fill();
      }
      return;
    }
    const path = glyph(kindOf(code));
    ctx.save();
    ctx.translate(px + scale * 0.04, py + scale * 0.04);
    ctx.scale(scale * 0.0092, scale * 0.0092);
    ctx.lineJoin = "round";
    if (white) {
      ctx.fillStyle = palette.paper;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = scale >= 24 ? 5 : 7;
      ctx.fill(path);
      ctx.stroke(path);
    } else {
      ctx.fillStyle = palette.ink;
      ctx.strokeStyle = palette.paper;
      ctx.lineWidth = 2.5;
      ctx.fill(path);
      ctx.stroke(path);
    }
    ctx.restore();
  }

  // File numbers along the bottom, rank numbers up the left, thinned out as
  // the view zooms out.
  private rulers(v: { x0: number; x1: number; y0: number; y1: number }): void {
    const { ctx, palette } = this;
    const { scale } = this.view;
    const step = scale >= 28 ? 1 : scale >= 14 ? 2 : scale >= 7 ? 5 : scale >= 4 ? 10 : 25;
    const size = 11;
    ctx.font = `${size}px ${palette.mono}`;
    ctx.fillStyle = palette.paper;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(0, this.height - size - 6, this.width, size + 6);
    ctx.fillRect(0, 0, size * 2.6, this.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = palette.inkSoft;
    ctx.textBaseline = "bottom";
    ctx.textAlign = "center";
    for (let x = Math.ceil(v.x0 / step) * step; x <= v.x1; x += step) {
      const [px] = this.origin({ x, y: 0 });
      ctx.fillText(String(x), px + scale / 2, this.height - 3);
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (let y = Math.ceil(v.y0 / step) * step; y <= v.y1; y += step) {
      const [, py] = this.origin({ x: 0, y });
      ctx.fillText(String(y), 3, py + scale / 2);
    }
    ctx.strokeStyle = palette.rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, this.height - size - 6.5);
    ctx.lineTo(this.width, this.height - size - 6.5);
    ctx.moveTo(size * 2.6 + 0.5, 0);
    ctx.lineTo(size * 2.6 + 0.5, this.height);
    ctx.stroke();
  }
}
