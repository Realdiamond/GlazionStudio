import { CalcOptions, ChemistryResult, Material, OxideSymbol, OxideVector, Recipe } from "./types";
import { OXIDE_INDEX } from "./oxides";

const ZERO = 1e-12;

function sum(obj: Record<string, number>): number {
  return Object.values(obj).reduce((a,b)=>a+b, 0);
}

export function computeChemistry(
  recipe: Recipe,
  materials: Material[],
  opts: CalcOptions
): ChemistryResult {
  const matIndex = Object.fromEntries(materials.map(m => [m.id, m]));
  const warnings: string[] = [];
  const moles: OxideVector = {};

  // 1) per line: dry mass after LOI, oxide masses → moles
  recipe.lines.forEach(line => {
    const m = matIndex[line.materialId];
    if (!m) return;
    const dry = line.partsPct * (1 - (m.loi_pct || 0)/100);
    const oa = m.oxideAnalysis || {};
    const totalPct = Object.values(oa).reduce((a,b)=>a+b, 0);
    if (totalPct > 100 + 1e-6) warnings.push(`Material ${m.name} oxide sum > 100%`);
    for (const [sym, pct] of Object.entries(oa)) {
      const ox = OXIDE_INDEX[sym as OxideSymbol];
      if (!ox) {
        warnings.push(`Unknown oxide ${sym} in material ${m.name}`);
        continue;
      }
      const mass = dry * (pct/100); // grams per 100g batch basis
      const mol = mass / ox.mw;
      moles[ox.symbol] = (moles[ox.symbol] || 0) + mol;
    }
  });

  // 2) Mole% and Analysis% (fired glass)
  const totalMoles = sum(moles as Record<string, number>);
  const molePct: OxideVector = {};
  if (totalMoles > ZERO) {
    for (const [k, n] of Object.entries(moles)) {
      molePct[k as OxideSymbol] = 100 * n / totalMoles;
    }
  }

  const oxideMasses: Record<string, number> = {};
  for (const [k, n] of Object.entries(moles)) {
    const mw = OXIDE_INDEX[k as OxideSymbol].mw;
    oxideMasses[k] = n * mw;
  }
  const totalOxMass = sum(oxideMasses);
  const analysisPct: OxideVector = {};
  if (totalOxMass > ZERO) {
    for (const [k, g] of Object.entries(oxideMasses)) {
      analysisPct[k as OxideSymbol] = 100 * g / totalOxMass;
    }
  }

  // 3) UMF (flux to 1)
  const fluxSum = opts.fluxSet.map(s => moles[s] || 0).reduce((a,b)=>a+b, 0);
  const umf: OxideVector = {};
  if (fluxSum <= ZERO) {
    warnings.push("UMF undefined: flux sum is zero. Add flux oxides.");
  } else {
    for (const [k, n] of Object.entries(moles)) {
      umf[k as OxideSymbol] = n / fluxSum;
    }
  }

  // 4) Ratios
  const si = umf["SiO2"] || 0;
  const al = umf["Al2O3"] || 0;
  const k = (umf["K2O"]||0)+(umf["Na2O"]||0)+(umf["Li2O"]||0);
  const ro = (umf["CaO"]||0)+(umf["MgO"]||0)+(umf["BaO"]||0)+(umf["SrO"]||0)+(umf["ZnO"]||0);
  const bPct = analysisPct["B2O3"] || 0;

  // 5) CTE Estimation (Coefficient of Thermal Expansion)
  const cte = estimateCTE(umf);

  return {
    moles,
    molePct,
    analysisPct,
    umf,
    fluxSum,
    warnings,
    ratios: {
      si_al: (si>ZERO && al>ZERO) ? si/al : undefined,
      alkali_over_alkaline: (ro>ZERO) ? k/ro : undefined,
      b2o3_pct: bPct
    },
    cte
  };
}

function estimateCTE(umf: OxideVector): number {
  const coefficients: Record<string, number> = {
    "SiO2": 0.5,
    "Al2O3": -2.0,
    "B2O3": -0.8,
    "Li2O": 35.0,
    "Na2O": 40.0,
    "K2O": 38.0,
    "MgO": 5.0,
    "CaO": 13.0,
    "SrO": 11.0,
    "BaO": 10.0,
    "ZnO": 7.0,
    "PbO": 11.0,
    "TiO2": 8.0,
    "P2O5": 5.0,
    "ZrO2": 4.0,
  };

  let cte = 0;
  for (const [oxide, coef] of Object.entries(coefficients)) {
    const molFraction = (umf[oxide as OxideSymbol] || 0);
    cte += molFraction * coef;
  }

  return Math.max(0, cte);
}
