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
const count = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;

export function loadStats(): Stats {
  const raw = readJson<Record<string, unknown>>(STATS_KEY, {});
  return {
    games: count(raw.games),
    finished: count(raw.finished),
    longest: count(raw.longest),
    farthest: count(raw.farthest),
  };
}
export const saveStats = (s: Stats): void => writeText(STATS_KEY, JSON.stringify(s));

export async function hashMoves(): Promise<Move[] | null> {
  const h = location.hash.replace(/^#/, "");
  const m = /^g=(.*)$/.exec(h);
  if (!m) return null;
  try {
    return await decodeMoves(decodeURIComponent(m[1] ?? ""));
  } catch {
    return null;
  }
}

let pending = 0;
let frozenAt = -1;

// A game opened from a link is not saved over the player's own until it is
// played on: storage stays as it was while the move list has this length.
// Infinity holds it until the link has been read.
export function freezeStorage(length: number): void {
  frozenAt = length;
}

export const openedOnLink = (): boolean => location.hash.startsWith("#g=");

// Writes the hash and local storage for the latest move list; an older
// encode that finishes late is dropped.
export async function persist(moves: Move[]): Promise<void> {
  const ticket = ++pending;
  const packed = await encodeMoves(moves);
  if (ticket !== pending) return;
  if (frozenAt === Infinity || moves.length === frozenAt) return;
  frozenAt = -1;
  writeText(GAME_KEY, packed);
  const next = packed ? `#g=${packed}` : "";
  if (location.hash === next || (!next && !location.hash)) return;
  history.replaceState(null, "", `${location.pathname}${location.search}${next}`);
}
