import { baseAt } from "./base.ts";
import { colorOf, type Code, type Color } from "./pieces.ts";
import { squareKey, type Square } from "./square.ts";

export interface Move {
  from: Square;
  to: Square;
}

export interface Played extends Move {
  piece: Code;
  captured: Code | null;
}

// The base position plus the squares play has changed. Only the overlay is
// ever enumerated; the base is infinite.
export class Position {
  readonly overlay: Map<string, Code | null>;
  turn: Color;
  readonly kings: Record<Color, Square>;
  readonly history: Played[];

  constructor(
    overlay = new Map<string, Code | null>(),
    turn: Color = "b",
    kings: Record<Color, Square> = { w: { x: 32, y: 66 }, b: { x: 32, y: 57 } },
    history: Played[] = [],
  ) {
    this.overlay = overlay;
    this.turn = turn;
    this.kings = kings;
    this.history = history;
  }

  at(x: number, y: number): Code | null {
    const k = `${x},${y}`;
    const o = this.overlay.get(k);
    return o === undefined ? baseAt(x, y) : o;
  }

  atSquare(s: Square): Code | null {
    return this.at(s.x, s.y);
  }

  set(s: Square, code: Code | null): void {
    const k = squareKey(s);
    if (baseAt(s.x, s.y) === code) this.overlay.delete(k);
    else this.overlay.set(k, code);
  }

  clone(): Position {
    return new Position(
      new Map(this.overlay),
      this.turn,
      { w: { ...this.kings.w }, b: { ...this.kings.b } },
      [...this.history],
    );
  }

  // Applies a move without checking legality.
  play(m: Move): Played {
    const piece = this.atSquare(m.from);
    if (!piece) throw new Error(`no piece on ${squareKey(m.from)}`);
    const captured = this.atSquare(m.to);
    this.set(m.from, null);
    this.set(m.to, piece);
    if (piece === "K" || piece === "k") this.kings[colorOf(piece)] = { ...m.to };
    this.turn = this.turn === "w" ? "b" : "w";
    const played: Played = { from: { ...m.from }, to: { ...m.to }, piece, captured };
    this.history.push(played);
    return played;
  }

  undo(): Played | undefined {
    const last = this.history.pop();
    if (!last) return undefined;
    this.set(last.to, last.captured);
    this.set(last.from, last.piece);
    if (last.piece === "K" || last.piece === "k")
      this.kings[colorOf(last.piece)] = { ...last.from };
    this.turn = this.turn === "w" ? "b" : "w";
    return last;
  }

  // Squares play has changed that currently hold a piece.
  *movedPieces(): IterableIterator<[Square, Code]> {
    for (const [k, code] of this.overlay) {
      if (!code) continue;
      const [x, y] = k.split(",").map(Number) as [number, number];
      yield [{ x, y }, code];
    }
  }
}
