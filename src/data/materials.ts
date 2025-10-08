export type MaterialOption = {
  name: string;
  type: "frit" | "raw" | "opacifier" | "colorant" | "additive";
};

export const MATERIALS: MaterialOption[] = [
  // FRITS
  { name: "Ferro Frit 3110", type: "frit" },
  { name: "Ferro Frit 3124", type: "frit" },
  { name: "Ferro Frit 3134", type: "frit" },
  { name: "Ferro Frit 3195", type: "frit" },
  { name: "Ferro Frit 3249", type: "frit" },

  // GLASS FORMERS
  { name: "Silica (Quartz/Flint)", type: "raw" },

  // INTERMEDIATES / CLAYS
  { name: "Kaolin (EPK)", type: "raw" },
  { name: "Calcined Kaolin", type: "raw" },
  { name: "Ball Clay", type: "raw" },
  { name: "Alumina Hydrate", type: "raw" },

  // ALKALI FLUXES (Feldspars & lithium)
  { name: "Potash Feldspar", type: "raw" },
  { name: "Soda Feldspar", type: "raw" },
  { name: "Nepheline Syenite", type: "raw" },
  { name: "Lithium Carbonate", type: "raw" },
  { name: "Spodumene", type: "raw" },

  // ALKALINE EARTH FLUXES
  { name: "Whiting (Calcium Carbonate)", type: "raw" },
  { name: "Wollastonite", type: "raw" },
  { name: "Dolomite", type: "raw" },
  { name: "Talc", type: "raw" },
  { name: "Magnesium Carbonate", type: "raw" },
  { name: "Strontium Carbonate", type: "raw" },
  { name: "Barium Carbonate", type: "raw" },

  // TRANSITION METAL FLUX
  { name: "Zinc Oxide", type: "raw" },

  // BORON SOURCES
  { name: "Gerstley Borate", type: "raw" },
  { name: "Borax", type: "raw" },

  // OPACIFIERS
  { name: "Zirconium Silicate (Zircopax)", type: "opacifier" },
  { name: "Tin Oxide", type: "opacifier" },
  { name: "Titanium Dioxide", type: "opacifier" },
  { name: "Rutile", type: "opacifier" },

  // COLORANTS
  { name: "Red Iron Oxide", type: "colorant" },
  { name: "Black Iron Oxide", type: "colorant" },
  { name: "Copper Carbonate", type: "colorant" },
  { name: "Copper Oxide (Black)", type: "colorant" },
  { name: "Cobalt Carbonate", type: "colorant" },
  { name: "Cobalt Oxide", type: "colorant" },
  { name: "Chrome Oxide (Green)", type: "colorant" },
  { name: "Manganese Dioxide", type: "colorant" },
  { name: "Manganese Carbonate", type: "colorant" },
  { name: "Nickel Oxide (Black)", type: "colorant" },

  // SPECIALTY CLAYS / ADDITIVES
  { name: "Bentonite", type: "additive" }
];

// handy groupings:
export const MATERIAL_GROUPS = {
  frit: MATERIALS.filter(m => m.type === "frit"),
  raw: MATERIALS.filter(m => m.type === "raw"),
  opacifier: MATERIALS.filter(m => m.type === "opacifier"),
  colorant: MATERIALS.filter(m => m.type === "colorant"),
  additive: MATERIALS.filter(m => m.type === "additive"),
};
