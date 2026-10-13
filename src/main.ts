import { Board } from "./board.ts";
import { Game } from "./game.ts";
import { attachInput } from "./input.ts";
import { renderMoves, renderPrompt, renderStatus } from "./panel.ts";
import { NARROW_BELOW, NARROW_VIEW, WIDE_VIEW } from "./views.ts";
import { KEY_BISHOP, BLACK_KING } from "../engine/geometry.ts";
import { inCheck } from "../engine/moves.ts";

const canvas = document.getElementById("board") as HTMLCanvasElement;
const narrow = window.innerWidth < NARROW_BELOW;
const board = new Board(canvas, { ...(narrow ? NARROW_VIEW : WIDE_VIEW) });
const game = new Game();

const movelist = document.getElementById("movelist") as HTMLOListElement;
const status = document.getElementById("status") as HTMLElement;
const prompt = document.getElementById("prompt") as HTMLElement;

function paint(): void {
  const st = game.state;
  const last = st.pos.history.at(-1);
  const king = st.pos.kings[st.pos.turn];
  board.draw(st.pos, {
    selected: st.selected,
    rays: st.reach?.rays ?? [],
    steps: st.reach?.steps ?? [],
    lastMove: last ? { from: last.from, to: last.to } : null,
    check: inCheck(st.pos, st.pos.turn) ? king : null,
  });
}

function layout(): void {
  board.resize();
  paint();
}

game.onChange((st) => {
  renderMoves(movelist, st);
  renderStatus(status, st);
  renderPrompt(prompt, st, (from, ray, n) => {
    game.playBlack({ from, to: { x: from.x + ray.dir.dx * n, y: from.y + ray.dir.dy * n } });
  });
  const last = st.pos.history.at(-1);
  if (last && !board.inView(last.to)) board.centreOn(last.to);
  paint();
});

attachInput(board, {
  tap: (s) => game.tap(s),
  changed: () => paint(),
});

layout();
window.addEventListener("resize", layout);
renderStatus(status, game.state);

const jumps: Record<string, { x: number; y: number }> = {
  throne: { x: 32, y: 61 },
  towers: KEY_BISHOP,
  cannons: { x: 54, y: 30 },
  wings: { x: 26, y: 28 },
};
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-jump]")) {
  button.addEventListener("click", () => {
    const key = button.dataset.jump ?? "";
    if (key === "last") {
      const last = game.state.pos.history.at(-1);
      board.centreOn(last ? last.to : BLACK_KING);
    } else {
      board.centreOn(jumps[key] ?? BLACK_KING);
    }
    paint();
  });
}

document.getElementById("new-game")?.addEventListener("click", () => game.restart());
document.getElementById("undo")?.addEventListener("click", () => game.undo());
document.getElementById("resign")?.addEventListener("click", () => game.resign());

const theme = document.getElementById("theme-button") as HTMLButtonElement;
const systemDark = matchMedia("(prefers-color-scheme: dark)");
const isDark = () =>
  document.documentElement.dataset.theme === "dark" ||
  (!document.documentElement.dataset.theme && systemDark.matches);
const labelTheme = () => {
  theme.textContent = isDark() ? "Light" : "Dark";
  theme.setAttribute("aria-pressed", String(isDark()));
};
labelTheme();
theme.addEventListener("click", () => {
  document.documentElement.dataset.theme = isDark() ? "light" : "dark";
  try {
    localStorage.setItem("infinite-chess:theme", document.documentElement.dataset.theme);
  } catch {
    // storage is optional
  }
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
