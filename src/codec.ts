import type { Move } from "../engine/position.ts";

// Moves packed for a link: each move is four zigzag varints, the from square
// relative to the same side's previous destination and the to square relative
// to the from square, then deflated and base64url'd. A pawn march or a bishop
// shuttling back and forth becomes a repeated byte pattern that deflate folds
// away, so the string stays short for the long games the position produces.

const zigzag = (n: number): number => (n << 1) ^ (n >> 31);
const unzigzag = (n: number): number => (n >>> 1) ^ -(n & 1);

function varints(values: number[]): Uint8Array {
  const out: number[] = [];
  for (const v of values) {
    let n = zigzag(v) >>> 0;
    while (n >= 0x80) {
      out.push((n & 0x7f) | 0x80);
      n >>>= 7;
    }
    out.push(n);
  }
  return Uint8Array.from(out);
}

function unvarints(bytes: Uint8Array): number[] {
  const out: number[] = [];
  let n = 0;
  let shift = 0;
  for (const b of bytes) {
    n |= (b & 0x7f) << shift;
    if (b & 0x80) {
      shift += 7;
      continue;
    }
    out.push(unzigzag(n >>> 0));
    n = 0;
    shift = 0;
  }
  return out;
}

export function packMoves(moves: Move[]): Uint8Array {
  const values: number[] = [];
  const prev = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];
  moves.forEach((m, i) => {
    const p = prev[i % 2] as { x: number; y: number };
    values.push(m.from.x - p.x, m.from.y - p.y, m.to.x - m.from.x, m.to.y - m.from.y);
    prev[i % 2] = m.to;
  });
  return varints(values);
}

export function unpackMoves(bytes: Uint8Array): Move[] | null {
  const values = unvarints(bytes);
  if (values.length % 4 !== 0) return null;
  const moves: Move[] = [];
  const prev = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];
  for (let i = 0; i < values.length; i += 4) {
    const side = (i / 4) % 2;
    const p = prev[side] as { x: number; y: number };
    const from = { x: p.x + (values[i] as number), y: p.y + (values[i + 1] as number) };
    const to = { x: from.x + (values[i + 2] as number), y: from.y + (values[i + 3] as number) };
    moves.push({ from, to });
    prev[side] = to;
  }
  return moves;
}

const base64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

function fromBase64url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  try {
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function pipe(
  bytes: Uint8Array,
  stream: { readable: ReadableStream; writable: WritableStream },
): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  const quiet = () => undefined;
  writer.write(bytes).catch(quiet);
  writer.close().catch(quiet);
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value as Uint8Array);
  }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

export async function encodeMoves(moves: Move[]): Promise<string> {
  if (!moves.length) return "";
  const packed = await pipe(packMoves(moves), new CompressionStream("deflate-raw"));
  return base64url(packed);
}

// Reads the packed form, or the earlier "x.y-x.y;..." text, or null for junk.
export async function decodeMoves(text: string): Promise<Move[] | null> {
  if (!text) return [];
  if (/^-?\d+\./.test(text)) return decodeText(text);
  const bytes = fromBase64url(text);
  if (!bytes) return null;
  try {
    return unpackMoves(await pipe(bytes, new DecompressionStream("deflate-raw")));
  } catch {
    return null;
  }
}

function decodeText(text: string): Move[] | null {
  const out: Move[] = [];
  for (const part of text.split(";")) {
    const m = /^(-?\d+)\.(-?\d+)-(-?\d+)\.(-?\d+)$/.exec(part);
    if (!m) return null;
    out.push({ from: { x: +m[1]!, y: +m[2]! }, to: { x: +m[3]!, y: +m[4]! } });
  }
  return out;
}
