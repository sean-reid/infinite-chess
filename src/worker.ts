import { cannonFront, towerSquare, wingGuard } from "../engine/geometry.ts";
import { lastShot, mainLine, wingOfHallway, type Hint } from "../engine/mainline.ts";
import { gameValue, type GameValue } from "../engine/ordinal.ts";
import type { Move } from "../engine/position.ts";
import { Position } from "../engine/position.ts";
import type { Square } from "../engine/square.ts";
import { activeTower, chooseWhite, towers } from "../engine/white.ts";

export type WhiteRequest =
  | { id: number; kind: "white"; moves: Move[] }
  | { id: number; kind: "value"; moves: Move[] }
  | { id: number; kind: "hint"; moves: Move[] };

export interface Focus {
  tower: Square | null;
  cannon: Square | null;
  wing: Square | null;
}

export type WhiteReply =
  | { id: number; kind: "white"; move: Move | null; reason: string; value: GameValue; focus: Focus }
  | { id: number; kind: "value"; value: GameValue; focus: Focus }
  | { id: number; kind: "hint"; hint: Hint };

// Replays the game from the start on every request, so the worker needs no
// state of its own and undo costs nothing.
function replay(moves: Move[]): Position {
  const pos = new Position();
  for (const m of moves) pos.play(m);
  return pos;
}

function focusOf(pos: Position): Focus {
  const tw = towers(pos);
  const m = tw.first === null ? null : activeTower(pos, tw);
  const shot = lastShot(pos);
  const w = shot ? wingOfHallway(shot.square) : null;
  return {
    tower: m === null ? null : towerSquare(m, 0, 0),
    cannon: shot ? cannonFront(shot.n) : null,
    wing: w === null ? null : wingGuard(w),
  };
}

self.onmessage = (e: MessageEvent<WhiteRequest>) => {
  const req = e.data;
  const pos = replay(req.moves);
  let reply: WhiteReply;
  if (req.kind === "white") {
    const choice = pos.turn === "w" ? chooseWhite(pos) : null;
    if (choice) pos.play(choice.move);
    reply = {
      id: req.id,
      kind: "white",
      move: choice?.move ?? null,
      reason: choice?.reason ?? "",
      value: gameValue(pos),
      focus: focusOf(pos),
    };
  } else if (req.kind === "value") {
    reply = { id: req.id, kind: "value", value: gameValue(pos), focus: focusOf(pos) };
  } else {
    reply = { id: req.id, kind: "hint", hint: mainLine(pos) };
  }
  self.postMessage(reply);
};
