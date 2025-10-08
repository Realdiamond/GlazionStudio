// src/data/materials.ts
export type MaterialOption = {
  id: string;
  name: string;
  type: "frit" | "raw" | "opacifier" | "colorant" | "additive";
};

// ⚠️ Fill this with the full list from UMF’s seed.ts when ready.
// For now a small starter set:
export const MATERIALS: MaterialOption[] = [
  { id: "ferro-3110", name: "Ferro Frit 3110", type: "frit" },
  { id: "silica", name: "Silica (Quartz/Flint)", type: "raw" },
  { id: "kaolin", name: "Kaolin", type: "raw" },
  { id: "whiting", name: "Whiting (CaCO3)", type: "raw" },
  { id: "zinc-oxide", name: "Zinc Oxide", type: "raw" },
  { id: "zircon", name: "Zirconium Silicate", type: "opacifier" },
  { id: "tin-oxide", name: "Tin Oxide", type: "opacifier" },
  { id: "cobalt-carbonate", name: "Cobalt Carbonate", type: "colorant" },
  { id: "rutile", name: "Rutile", type: "colorant" },
  { id: "bentonite", name: "Bentonite", type: "additive" },
];
