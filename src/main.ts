import { Board } from "./board.ts";
import { Position } from "../engine/position.ts";
import { pseudoReach } from "../engine/moves.ts";

const canvas = document.getElementById("board") as HTMLCanvasElement;
const pos = new Position();
const narrow = window.innerWidth < 1024;
const board = new Board(
  canvas,
  narrow ? { cx: 44, cy: 48, scale: 11 } : { cx: 40, cy: 44, scale: 15 },
);
const key = { x: 46, y: 45 };
const reach = pseudoReach(pos, key);

function paint(): void {
  board.resize();
  board.draw(pos, { selected: key, rays: reach?.rays ?? [], steps: reach?.steps ?? [] });
}

paint();
window.addEventListener("resize", paint);
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  board.refreshPalette();
  paint();
});

const theme = document.getElementById("theme-button") as HTMLButtonElement;
theme.addEventListener("click", () => {
  const root = document.documentElement;
  const dark =
    root.dataset.theme === "dark" ||
    (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.theme = dark ? "light" : "dark";
  theme.setAttribute("aria-pressed", String(!dark));
  theme.textContent = dark ? "Dark" : "Light";
  try {
    localStorage.setItem("infinite-chess:theme", root.dataset.theme);
  } catch {
    // storage is optional
  }
  board.refreshPalette();
  paint();
});

const help = document.getElementById("help") as HTMLDialogElement;
document.getElementById("help-button")?.addEventListener("click", () => help.showModal());
