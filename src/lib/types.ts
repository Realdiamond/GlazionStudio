export type OxideSymbol =
  | "SiO2" | "Al2O3" | "B2O3" | "P2O5"
  | "K2O" | "Na2O" | "Li2O"
  | "CaO" | "MgO" | "BaO" | "SrO" | "ZnO" | "PbO"
  | "ZrO2" | "TiO2" | "SnO2"
  | "Fe2O3" | "FeO"
  | "MnO" | "CoO" | "NiO" | "CuO" | "Cr2O3" | "V2O5"
  | "MoO3" | "WO3"
  | "CeO2" | "La2O3" | "Y2O3" | "Nb2O5" | "Ta2O5";

export type OxideRole = "former" | "intermediate" | "flux_R2O" | "flux_RO" | "opacifier" | "colorant";

export interface OxideDef {
  symbol: OxideSymbol;
  name: string;
  mw: number;              // g/mol
  roles: OxideRole[];
  colorant: boolean;
}

export type OxideVector = Partial<Record<OxideSymbol, number>>; // value depends on basis

export interface Material {
  id: string;
  name: string;
  type: "raw" | "frit" | "stain" | "opacifier" | "additive";
  loi_pct: number;        // 0..100
  oxideAnalysis: OxideVector; // wt% dry basis
  meta?: { supplier?: string; lot?: string; cost_per_kg?: number; };
}

export interface RecipeLine {
  materialId: string;
  partsPct: number;       // 0..100, sum to ~100
  locked?: boolean;
  min?: number;
  max?: number;
}

export interface Recipe {
  id: string;
  name: string;
  category: "glaze" | "engobe" | "slip" | "body";
  cone?: string;
  lines: RecipeLine[];
}

export type FluxSet = OxideSymbol[]; // e.g., ["K2O","Na2O","Li2O","CaO","MgO","BaO","SrO","ZnO"];

export interface CalcOptions {
  fluxSet: FluxSet;
  unityMode?: "flux_to_1"; // extensible
}

export interface ChemistryResult {
  moles: OxideVector;
  molePct: OxideVector;
  analysisPct: OxideVector; // fired glass wt%
  umf: OxideVector;
  fluxSum: number;
  warnings: string[];
  ratios: {
    si_al?: number;
    alkali_over_alkaline?: number; // (KNaLi)/(CaMgBaSrZn)
    b2o3_pct?: number; // in analysis %
  };
  cte: number; // Coefficient of Thermal Expansion (×10⁻⁷/°C)
}
