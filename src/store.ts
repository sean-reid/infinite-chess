import { isLegal } from "../engine/moves.ts";
import { Position, type Move } from "../engine/position.ts";

// Moves travel in the URL hash as "x.y-x.y" pairs joined by semicolons, so a
// link resumes or shows a game with no server.
export function encodeMoves(moves: Move[]): string {
  return moves.map((m) => `${m.from.x}.${m.from.y}-${m.to.x}.${m.to.y}`).join(";");
}

export function decodeMoves(text: string): Move[] | null {
  if (!text) return [];
  const out: Move[] = [];
  for (const part of text.split(";")) {
    const m = /^(-?\d+)\.(-?\d+)-(-?\d+)\.(-?\d+)$/.exec(part);
    if (!m) return null;
    out.push({ from: { x: +m[1]!, y: +m[2]! }, to: { x: +m[3]!, y: +m[4]! } });
  }
  return out;
}

// Replays as far as the moves stay legal and returns how many were taken.
export function replayInto(pos: Position, moves: Move[]): number {
  let n = 0;
  for (const m of moves) {
    if (!isLegal(pos, m)) break;
    pos.play(m);
    n++;
  }
  return n;
}

export const GAME_KEY = "infinite-chess:game";
export const STATS_KEY = "infinite-chess:stats";

export interface Stats {
  games: number;
  finished: number;
  longest: number;
  farthest: number;
}

const EMPTY: Stats = { games: 0, finished: 0, longest: 0, farthest: 0 };

function read<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? { ...fallback, ...(parsed as T) } : fallback;
  } catch {
    return fallback;
  }
}

function readText(key: string): string {
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : "";
    return typeof parsed === "string" ? parsed : "";
  } catch {
    return "";
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage is optional
  }
}

export const loadGame = (): Move[] => decodeMoves(readText(GAME_KEY)) ?? [];
export const saveGame = (moves: Move[]): void => write(GAME_KEY, encodeMoves(moves));
export const loadStats = (): Stats => read<Stats>(STATS_KEY, EMPTY);
export const saveStats = (s: Stats): void => write(STATS_KEY, s);

export function hashMoves(): Move[] | null {
  const h = location.hash.replace(/^#/, "");
  const m = /^g=(.*)$/.exec(h);
  return m ? decodeMoves(decodeURIComponent(m[1] ?? "")) : null;
}

export function setHash(moves: Move[]): void {
  const next = moves.length ? `#g=${encodeMoves(moves)}` : "";
  if (location.hash === next || (!next && !location.hash)) return;
  history.replaceState(null, "", `${location.pathname}${location.search}${next}`);
}
