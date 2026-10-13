import type { Ray } from "../engine/moves.ts";
import type { Square } from "../engine/square.ts";
import type { GameState } from "./game.ts";
import { moveText } from "./notation.ts";
import { formatValue } from "../engine/ordinal.ts";

const DIRECTION: Record<string, string> = {
  "0,1": "up",
  "0,-1": "down",
  "1,0": "right",
  "-1,0": "left",
  "1,1": "up and right",
  "1,-1": "down and right",
  "-1,1": "up and left",
  "-1,-1": "down and left",
};

export function renderValue(ordinal: HTMLElement, terms: HTMLElement, state: GameState): void {
  const v = state.value;
  if (!v) return;
  ordinal.innerHTML = formatValue(v);
  terms.hidden = v.r === null || v.mateIn !== null;
  const show = (name: string, n: number | "open" | null) => {
    const dd = terms.querySelector<HTMLElement>(`[data-term="${name}"]`);
    if (dd) dd.textContent = n === null ? "" : n === "open" ? "ω" : String(n);
  };
  show("r", v.r);
  show("h", v.h);
  show("b", v.b);
  show("g", v.g);
}

export function renderHint(el: HTMLElement, state: GameState): void {
  if (!state.hint) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = state.hint.text;
}

export function renderMoves(el: HTMLOListElement, state: GameState): void {
  const moves = state.pos.history;
  const rows: string[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    const b = moves[i];
    const w = moves[i + 1];
    rows.push(
      `<li><span class="b">${b ? moveText(b) : ""}</span><span class="w">${w ? moveText(w) : ""}</span></li>`,
    );
  }
  el.innerHTML = rows.join("");
  el.scrollTop = el.scrollHeight;
}

export function renderStatus(el: HTMLElement, state: GameState): void {
  const n = Math.floor(state.pos.history.length / 2) + 1;
  let text: string;
  if (state.result === "checkmate") {
    text =
      state.pos.turn === "b"
        ? `Checkmate. White wins after ${n - 1} moves.`
        : "Checkmate. Black wins.";
  } else if (state.result === "resigned") {
    text = `Black resigned after ${n - 1} moves.`;
  } else if (state.phase === "white") {
    text = `move ${n} · white is thinking`;
  } else {
    const why = state.lastReason ? `white: ${state.lastReason} · ` : "";
    text = `${why}move ${n} · black to play`;
  }
  el.textContent = text;
}

// Open rays get a number instead of a tap: how far along this line.
export function renderPrompt(
  el: HTMLElement,
  state: GameState,
  onMove: (from: Square, ray: Ray, n: number) => void,
): void {
  const open = state.reach?.rays.filter((r) => r.length === Infinity) ?? [];
  if (!state.selected || !open.length) {
    el.hidden = true;
    el.innerHTML = "";
    delete el.dataset.for;
    return;
  }
  // The same selection keeps its form, so a number being typed survives a redraw.
  const key = `${state.selected.x},${state.selected.y}`;
  if (el.dataset.for === key && !el.hidden) return;
  el.dataset.for = key;
  el.hidden = false;
  el.innerHTML = "";
  const from = state.selected;
  const head = document.createElement("h2");
  head.textContent = "Open line";
  el.append(head);
  for (const ray of open) {
    const form = document.createElement("form");
    form.className = "open-ray";
    const label = document.createElement("label");
    const word = DIRECTION[`${ray.dir.dx},${ray.dir.dy}`] ?? "along";
    label.textContent = `${word}, by`;
    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.step = "1";
    input.value = "1";
    input.inputMode = "numeric";
    input.setAttribute("aria-label", `squares ${word}`);
    label.append(input);
    const go = document.createElement("button");
    go.type = "submit";
    go.textContent = "Move";
    form.append(label, go);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const n = Math.floor(Number(input.value));
      if (!Number.isFinite(n) || n < 1) return;
      onMove(from, ray, n);
    });
    el.append(form);
  }
}
