import { Board } from "./board.ts";
import { Game } from "./game.ts";
import { attachInput } from "./input.ts";
import {
  renderControls,
  renderHint,
  renderMoves,
  renderPrompt,
  renderStatus,
  renderValue,
} from "./panel.ts";
import { NARROW_BELOW, NARROW_VIEW, WIDE_VIEW } from "./views.ts";
import {
  THEME_KEY,
  freezeStorage,
  hashMoves,
  loadGame,
  openedOnLink,
  persist,
  writeText,
} from "./store.ts";
import { renderStats } from "./panel.ts";
import { KEY_BISHOP, BLACK_KING } from "../engine/geometry.ts";
import { inCheck } from "../engine/moves.ts";

const canvas = document.getElementById("board") as HTMLCanvasElement;
const narrow = window.innerWidth < NARROW_BELOW;
const board = new Board(canvas, { ...(narrow ? NARROW_VIEW : WIDE_VIEW) });
if (openedOnLink()) freezeStorage(Infinity);
const game = new Game();

const movelist = document.getElementById("movelist") as HTMLOListElement;
const status = document.getElementById("status") as HTMLElement;
const prompt = document.getElementById("prompt") as HTMLElement;
const ordinal = document.getElementById("ordinal") as HTMLElement;
const terms = document.getElementById("terms") as HTMLElement;
const hintText = document.getElementById("hint-text") as HTMLElement;
const statsEl = document.getElementById("stats") as HTMLElement;

let seenMoves = 0;
let frame = 0;

// Several events per frame ask for a paint; one happens.
function paint(): void {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    paintNow();
  });
}

function paintNow(): void {
  const st = game.state;
  canvas.dataset.cx = String(board.view.cx);
  canvas.dataset.cy = String(board.view.cy);
  const last = st.pos.history.at(-1);
  const king = st.pos.kings[st.pos.turn];
  board.draw(st.pos, {
    selected: st.selected,
    rays: st.reach?.rays ?? [],
    steps: st.reach?.steps ?? [],
    lastMove: last ? { from: last.from, to: last.to } : null,
    check: inCheck(st.pos, st.pos.turn) ? king : null,
    target: st.hint?.move?.to ?? null,
  });
}

function layout(): void {
  board.resize();
  paint();
}

game.onChange((st) => {
  void persist(st.pos.history.map((p) => ({ from: p.from, to: p.to })));
  renderStats(statsEl, st);
  renderMoves(movelist, st);
  renderStatus(status, st);
  renderValue(ordinal, terms, st);
  renderHint(hintText, st);
  renderControls(st);
  renderPrompt(prompt, st, (m) => game.playBlack(m));
  // Follow a move that lands off screen, but never on a selection or a redraw.
  const last = st.pos.history.at(-1);
  if (st.pos.history.length !== seenMoves) {
    seenMoves = st.pos.history.length;
    if (last && !board.inView(last.to)) board.centreOn(last.to);
  }
  // A hint is an explicit request, so the piece it names comes into view.
  if (st.hint?.move && st.selected && !board.inView(st.selected)) board.centreOn(st.selected);
  paint();
});

attachInput(board, {
  tap: (s) => game.tap(s),
  changed: () => paint(),
});

layout();
window.addEventListener("resize", layout);
renderStatus(status, game.state);
renderStats(statsEl, game.state);
renderControls(game.state);
// A shared link plays in this tab without touching the game kept in local
// storage until a move is made in it.
async function openFromLocation(): Promise<void> {
  if (openedOnLink()) freezeStorage(Infinity);
  try {
    const linked = await hashMoves();
    if (linked) {
      freezeStorage(linked.length);
      const taken = game.load(linked);
      if (taken < linked.length)
        status.textContent =
          "That link did not fully load; the game starts where it stopped making sense.";
    } else if (openedOnLink()) {
      status.textContent = "That link did not decode. Starting fresh.";
      freezeStorage(0);
      game.restart();
    } else {
      game.load(await loadGame());
    }
  } catch {
    game.restart();
  }
}
void openFromLocation();
window.addEventListener("hashchange", () => {
  if (openedOnLink()) freezeStorage(Infinity);
  game.restart();
  void openFromLocation();
});

const share = document.getElementById("share") as HTMLButtonElement;
share.addEventListener("click", async () => {
  const url = location.href;
  try {
    if (navigator.share) await navigator.share({ title: document.title, url });
    else await navigator.clipboard.writeText(url);
    share.textContent = "Link copied";
  } catch {
    share.textContent = "Copy failed";
  }
  setTimeout(() => {
    share.textContent = "Share";
  }, 1500);
});

const jumps: Record<string, { x: number; y: number }> = {
  throne: { x: 32, y: 61 },
  towers: KEY_BISHOP,
  cannons: { x: 54, y: 30 },
  wings: { x: 26, y: 28 },
};
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-jump]")) {
  button.addEventListener("click", () => {
    const key = button.dataset.jump ?? "";
    const { focus, pos } = game.state;
    const live =
      key === "last"
        ? (pos.history.at(-1)?.to ?? null)
        : key === "towers"
          ? focus.tower
          : key === "cannons"
            ? focus.cannon
            : key === "wings"
              ? focus.wing
              : null;
    board.centreOn(live ?? jumps[key] ?? BLACK_KING);
    paint();
  });
}

document.getElementById("hint")?.addEventListener("click", () => game.askHint());

document.getElementById("new-game")?.addEventListener("click", () => game.restart());
document.getElementById("undo")?.addEventListener("click", () => game.undo());
document.getElementById("resign")?.addEventListener("click", () => {
  if (game.state.pos.history.length && confirm("Resign this game?")) game.resign();
});

const theme = document.getElementById("theme-button") as HTMLButtonElement;
const systemDark = matchMedia("(prefers-color-scheme: dark)");
const isDark = () =>
  document.documentElement.dataset.theme === "dark" ||
  (!document.documentElement.dataset.theme && systemDark.matches);
const labelTheme = () => theme.setAttribute("aria-pressed", String(isDark()));
labelTheme();
theme.addEventListener("click", () => {
  document.documentElement.dataset.theme = isDark() ? "light" : "dark";
  writeText(THEME_KEY, document.documentElement.dataset.theme);
  labelTheme();
  board.refreshPalette();
  paint();
});
systemDark.addEventListener("change", () => {
  labelTheme();
  board.refreshPalette();
  paint();
});

const help = document.getElementById("help") as HTMLDialogElement;
document.getElementById("help-button")?.addEventListener("click", () => help.showModal());
