export interface Square {
  x: number;
  y: number;
}

export const isDark = (s: Square): boolean => (s.x + s.y) % 2 === 0;

export const sameSquare = (a: Square, b: Square): boolean => a.x === b.x && a.y === b.y;

export const squareKey = (s: Square): string => `${s.x},${s.y}`;

export const squareName = (s: Square): string => `(${s.x}, ${s.y})`;

export const parseSquareKey = (key: string): Square => {
  const [x, y] = key.split(",").map(Number);
  if (x === undefined || y === undefined || !Number.isInteger(x) || !Number.isInteger(y)) {
    throw new Error(`bad square key ${key}`);
  }
  return { x, y };
};
