import { isLegal, legalReach, outcome, type Reach } from "../engine/moves.ts";
import { Position, type Move, type Played } from "../engine/position.ts";
import { sameSquare, type Square } from "../engine/square.ts";
import type { Hint } from "../engine/mainline.ts";
import type { GameValue } from "../engine/ordinal.ts";
import type { Focus, WhiteReply, WhiteRequest } from "./worker.ts";

export type Phase = "black" | "white" | "over";

export interface GameState {
  pos: Position;
  phase: Phase;
  selected: Square | null;
  reach: Reach | null;
  lastReason: string;
  result: "checkmate" | "resigned" | null;
  value: GameValue | null;
  focus: Focus;
  hint: Hint | null;
}

export type Listener = (state: GameState) => void;

// The game loop: black is the player, white answers from a worker. Every
// change notifies the listener with the whole state.
export class Game {
  readonly state: GameState;
  private readonly worker: Worker;
  private requestId = 0;
  private readonly listeners: Listener[] = [];

  constructor() {
    this.state = {
      pos: new Position(),
      phase: "black",
      selected: null,
      reach: null,
      lastReason: "",
      result: null,
      value: null,
      focus: { tower: null, cannon: null, wing: null },
      hint: null,
    };
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (e: MessageEvent<WhiteReply>) => this.onReply(e.data);
    this.askValue();
  }

  private movesSoFar(): Move[] {
    return this.state.pos.history.map((p) => ({ from: p.from, to: p.to }));
  }

  private askValue(): void {
    const req: WhiteRequest = { id: ++this.requestId, kind: "value", moves: this.movesSoFar() };
    this.worker.postMessage(req);
  }

  askHint(): void {
    if (this.state.phase !== "black") return;
    const req: WhiteRequest = { id: ++this.requestId, kind: "hint", moves: this.movesSoFar() };
    this.worker.postMessage(req);
  }

  onChange(l: Listener): void {
    this.listeners.push(l);
  }

  private emit(): void {
    for (const l of this.listeners) l(this.state);
  }

  get moves(): Played[] {
    return this.state.pos.history;
  }

  select(s: Square | null): void {
    const st = this.state;
    if (st.phase !== "black") return;
    st.hint = null;
    if (!s || (st.selected && sameSquare(st.selected, s))) {
      st.selected = null;
      st.reach = null;
    } else {
      const reach = legalReach(st.pos, s);
      st.selected = reach ? s : null;
      st.reach = reach;
    }
    this.emit();
  }

  // Tapping a square either picks a piece or completes a move.
  tap(s: Square): void {
    const st = this.state;
    if (st.phase !== "black") return;
    if (st.selected && isLegal(st.pos, { from: st.selected, to: s })) {
      this.playBlack({ from: st.selected, to: s });
      return;
    }
    const code = st.pos.atSquare(s);
    if (code && code === code.toLowerCase()) this.select(s);
    else this.select(null);
  }

  playBlack(m: Move): boolean {
    const st = this.state;
    if (st.phase !== "black" || !isLegal(st.pos, m)) return false;
    st.pos.play(m);
    st.selected = null;
    st.reach = null;
    st.hint = null;
    this.afterMove();
    return true;
  }

  private afterMove(): void {
    const st = this.state;
    const o = outcome(st.pos);
    if (o === "checkmate") {
      st.phase = "over";
      st.result = "checkmate";
      this.emit();
      return;
    }
    if (st.pos.turn === "w") {
      st.phase = "white";
      this.emit();
      const req: WhiteRequest = { id: ++this.requestId, kind: "white", moves: this.movesSoFar() };
      this.worker.postMessage(req);
    } else {
      st.phase = "black";
      this.emit();
    }
  }

  private onReply(reply: WhiteReply): void {
    const st = this.state;
    if (reply.id !== this.requestId) return;
    if (reply.kind === "value") {
      st.value = reply.value;
      st.focus = reply.focus;
      this.emit();
      return;
    }
    if (reply.kind === "hint") {
      st.hint = reply.hint;
      if (reply.hint.move) {
        const reach = legalReach(st.pos, reply.hint.move.from);
        st.selected = reach ? reply.hint.move.from : null;
        st.reach = reach;
      }
      this.emit();
      return;
    }
    if (st.phase !== "white") return;
    if (!reply.move || !isLegal(st.pos, reply.move)) {
      st.phase = "over";
      st.result = "resigned";
      st.lastReason = "white has no move";
      this.emit();
      return;
    }
    st.pos.play(reply.move);
    st.lastReason = reply.reason;
    st.value = reply.value;
    st.focus = reply.focus;
    this.afterMove();
  }

  // Takes back the last pair of moves, or just white's if it is white's turn.
  undo(): void {
    const st = this.state;
    if (st.phase === "white") this.requestId++;
    const n = st.pos.history.length;
    if (n === 0) return;
    st.pos.undo();
    if (st.pos.turn === "w") st.pos.undo();
    st.phase = "black";
    st.result = null;
    st.selected = null;
    st.reach = null;
    st.lastReason = "";
    st.hint = null;
    this.emit();
    this.askValue();
  }

  resign(): void {
    const st = this.state;
    if (st.phase === "over") return;
    this.requestId++;
    st.phase = "over";
    st.result = "resigned";
    this.emit();
  }

  restart(): void {
    const st = this.state;
    this.requestId++;
    while (st.pos.history.length) st.pos.undo();
    st.phase = "black";
    st.result = null;
    st.selected = null;
    st.reach = null;
    st.lastReason = "";
    st.hint = null;
    this.emit();
    this.askValue();
  }
}
