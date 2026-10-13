import { isLegal } from "../engine/moves.ts";
import { Position, type Move } from "../engine/position.ts";
import { decodeMoves, encodeMoves } from "./codec.ts";

// The move list travels in the URL hash as `#g=<packed moves>`, so a link
// reopens or shows a game with no server. Local storage keeps the same string
// and a few personal counts.

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
export const THEME_KEY = "infinite-chess:theme";

export interface Stats {
  games: number;
  finished: number;
  longest: number;
  farthest: number;
}

const EMPTY: Stats = { games: 0, finished: 0, longest: 0, farthest: 0 };

function readJson<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? { ...fallback, ...(parsed as T) } : fallback;
  } catch {
    return fallback;
  }
}

export function writeText(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage is optional
  }
}

function readText(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export const loadGame = async (): Promise<Move[]> => (await decodeMoves(readText(GAME_KEY))) ?? [];
export const loadStats = (): Stats => readJson<Stats>(STATS_KEY, EMPTY);
export const saveStats = (s: Stats): void => writeText(STATS_KEY, JSON.stringify(s));

export async function hashMoves(): Promise<Move[] | null> {
  const h = location.hash.replace(/^#/, "");
  const m = /^g=(.*)$/.exec(h);
  return m ? decodeMoves(decodeURIComponent(m[1] ?? "")) : null;
}

let pending = 0;

// Writes the hash and local storage for the latest move list; an older
// encode that finishes late is dropped.
export async function persist(moves: Move[]): Promise<void> {
  const ticket = ++pending;
  const packed = await encodeMoves(moves);
  if (ticket !== pending) return;
  writeText(GAME_KEY, packed);
  const next = packed ? `#g=${packed}` : "";
  if (location.hash === next || (!next && !location.hash)) return;
  history.replaceState(null, "", `${location.pathname}${location.search}${next}`);
}
