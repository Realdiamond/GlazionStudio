// Heuristic CTE support (glaze-only). We keep it dataset-driven and optional.
import { OxideSymbol, OxideVector } from "./types";

export type CteBasis = "UMF" | "mole_fraction"; // pick one and be consistent

export interface CteTable {
  id: string;
  basis: CteBasis;
  oxides: { symbol: OxideSymbol; coef: number }[]; // coef in ppm/K per chosen basis unit
  notes?: string;
}

export function estimateCTE(vector: OxideVector, table: CteTable): number | null {
  const idx = Object.fromEntries(table.oxides.map(o => [o.symbol, o.coef]));
  let sum = 0;
  for (const [sym, val] of Object.entries(vector)) {
    const c = idx[sym as OxideSymbol];
    if (typeof c === "number" && typeof val === "number") {
      sum += c * val;
    }
  }
  return isFinite(sum) ? sum : null;
}
