export type Color = "w" | "b";
export type Kind = "K" | "Q" | "R" | "B" | "N" | "P";

// One character per piece: uppercase white, lowercase black.
export type Code = "K" | "Q" | "R" | "B" | "N" | "P" | "k" | "q" | "r" | "b" | "n" | "p";

export const colorOf = (code: Code): Color => (code === code.toUpperCase() ? "w" : "b");

export const kindOf = (code: Code): Kind => code.toUpperCase() as Kind;

export const isWhite = (code: Code): boolean => code === code.toUpperCase();
