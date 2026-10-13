import type { Move } from "../engine/position.ts";
import { Position } from "../engine/position.ts";
import { chooseWhite } from "../engine/white.ts";

export interface WhiteRequest {
  id: number;
  moves: Move[];
}

export interface WhiteReply {
  id: number;
  move: Move | null;
  reason: string;
  ms: number;
}

// Replays the game from the start on every request, so the worker needs no
// state of its own and undo costs nothing.
self.onmessage = (e: MessageEvent<WhiteRequest>) => {
  const { id, moves } = e.data;
  const started = performance.now();
  const pos = new Position();
  for (const m of moves) pos.play(m);
  const choice = pos.turn === "w" ? chooseWhite(pos) : null;
  const reply: WhiteReply = {
    id,
    move: choice?.move ?? null,
    reason: choice?.reason ?? "",
    ms: Math.round(performance.now() - started),
  };
  self.postMessage(reply);
};
