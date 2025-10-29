import React, { useMemo, useState, useEffect } from 'react';
import RecipeList, { RecipeItem } from '../components/RecipeList';
import { computeChemistry } from '../lib/chemistry';
import type { Material, Recipe, CalcOptions, OxideSymbol, OxideVector } from '../lib/types';
import materialsData from '../data/materials.json';
import glazeLimitsData from '../data/glaze-limits.json';

interface GlazeLimit {
  cone: string;
  oxide: string;
  minUmf: number;
  maxUmf: number;
  notes: string;
}

const DEFAULT_FLUX_SET: OxideSymbol[] = [
  "K2O", "Na2O", "Li2O", "CaO", "MgO", "BaO", "SrO", "ZnO"
];

// Helper functions
const toNum = (v: string | number | undefined) =>
  typeof v === 'number' ? v : Number.parseFloat(String(v ?? '').trim());
const isFiniteNum = (n: unknown): n is number => Number.isFinite(n as number);
const norm = (s: string) => s.trim().toLowerCase();

// ChemTable Component
function ChemTable({ obj, fmt }: { obj: OxideVector; fmt: (n: number) => string }) {
  const entries = Object.entries(obj)
    .filter(([, v]) => typeof v === "number" && isFinite(v as number) && (v as number) !== 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number));

  if (!entries.length) return <div className="text-sm text-gray-500">No values</div>;

  return (
    <div className="space-y-1">
      {entries.map(([k, v]) => (
        <div key={k} className="flex justify-between text-sm">
          <span>{k}</span>
          <span className="font-mono">{fmt(v as number)}</span>
        </div>
      ))}
    </div>
  );
}

// GroupedUMFTable Component
function GroupedUMFTable({ umf }: { umf: OxideVector }) {
  const r2oOxides = ["Na2O", "K2O", "Li2O"];
  const roOxides = ["CaO", "MgO", "BaO", "SrO", "ZnO", "PbO", "FeO", "MnO", "CoO", "NiO", "CuO"];
  const r2o3Oxides = ["Al2O3", "Fe2O3", "Cr2O3", "V2O3", "La2O3", "Y2O3"];
  const ro2Oxides = ["SiO2", "B2O3", "ZrO2", "TiO2", "SnO2", "P2O5", "CeO2"];

  const getOxidesWithValues = (oxideList: string[]) => {
    return oxideList
      .filter(ox => (umf as any)[ox] && (umf as any)[ox] > 0)
      .sort((a, b) => ((umf as any)[b] || 0) - ((umf as any)[a] || 0));
  };

  const r2oValues = getOxidesWithValues(r2oOxides);
  const roValues = getOxidesWithValues(roOxides);
  const r2o3Values = getOxidesWithValues(r2o3Oxides);
  const ro2Values = getOxidesWithValues(ro2Oxides);

  const renderOxideRow = (oxide: string) => (
    <div key={oxide} className="flex justify-between items-baseline text-sm">
      <span className="text-gray-600">{oxide}</span>
      <span className="font-mono text-base ml-4">
        {((umf as any)[oxide] || 0).toFixed(2)}
      </span>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {/* Fluxes Column */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-purple-600">Fluxes</h4>
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-500 mb-1">R₂O</div>
          {r2oValues.length > 0 ? (
            r2oValues.map(ox => renderOxideRow(ox))
          ) : (
            <div className="text-sm text-gray-400 italic">—</div>
          )}
          
          <div className="text-xs font-semibold text-gray-500 mt-3 mb-1">RO</div>
          {roValues.length > 0 ? (
            roValues.map(ox => renderOxideRow(ox))
          ) : (
            <div className="text-sm text-gray-400 italic">—</div>
          )}
        </div>
      </div>

      {/* Stabilizers Column */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-blue-600">Stabilizers</h4>
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-500 mb-1">R₂O₃</div>
          {r2o3Values.length > 0 ? (
            r2o3Values.map(ox => renderOxideRow(ox))
          ) : (
            <div className="text-sm text-gray-400 italic">—</div>
          )}
        </div>
      </div>

      {/* Glass-Formers Column */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-green-600">Glass-Formers</h4>
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-500 mb-1">RO₂</div>
          {ro2Values.length > 0 ? (
            ro2Values.map(ox => renderOxideRow(ox))
          ) : (
            <div className="text-sm text-gray-400 italic">—</div>
          )}
        </div>
      </div>
    </div>
  );
}

// OptimizationSuggestions Component
function OptimizationSuggestions({
  umf,
  limits,
  cone,
  materials,
  recipeLines
}: {
  umf: OxideVector;
  limits: GlazeLimit[];
  cone: string;
  materials: Material[];
  recipeLines: Array<{ materialId: string; partsPct: number }>;
}) {
  const suggestions = useMemo(() => {
    const result: {
      oxide: string;
      current: number;
      target: string;
      direction: "increase" | "decrease";
      materials: { name: string; oxideContent: number; inRecipe: boolean }[];
    }[] = [];

    limits.forEach(limit => {
      const oxide = limit.oxide;
      const value = (umf as any)[oxide] || 0;
      const min = limit.minUmf;
      const max = limit.maxUmf;

      let direction: "increase" | "decrease" | null = null;
      let target = "";

      if (min !== null && value < min) {
        direction = "increase";
        target = `${min.toFixed(2)} - ${max?.toFixed(2) ?? "∞"}`;
      } else if (max !== null && value > max) {
        direction = "decrease";
        target = `${min?.toFixed(2) ?? "0"} - ${max.toFixed(2)}`;
      }

      if (direction) {
        const relevantMaterials = materials
          .filter(m => {
            const content = m.oxideAnalysis[oxide] || 0;
            return content > 5;
          })
          .map(m => ({
            name: m.name,
            oxideContent: m.oxideAnalysis[oxide] || 0,
            inRecipe: recipeLines.some(l => l.materialId === m.id)
          }))
          .sort((a, b) => b.oxideContent - a.oxideContent)
          .slice(0, 3);

        if (relevantMaterials.length > 0) {
          result.push({
            oxide,
            current: value,
            target,
            direction,
            materials: relevantMaterials
          });
        }
      }
    });

    return result;
  }, [umf, limits, materials, recipeLines]);

  if (suggestions.length === 0) {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
        <h4 className="text-sm font-semibold text-green-800 mb-1">Recipe Optimized</h4>
        <p className="text-xs text-green-700">
          All oxides are within target ranges for Cone {cone}.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
      <h4 className="text-sm font-semibold text-blue-800 mb-2">Optimization Suggestions</h4>
      <div className="space-y-3">
        {suggestions.map(({ oxide, current, target, direction, materials: suggestedMats }) => (
          <div key={oxide} className="text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">
                {oxide}: {current.toFixed(3)} → {target}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                direction === "increase" 
                  ? "bg-green-100 text-green-700" 
                  : "bg-red-100 text-red-700"
              }`}>
                {direction === "increase" ? "↑ Increase" : "↓ Decrease"}
              </span>
            </div>
            <div className="pl-2 border-l-2 border-blue-300">
              {direction === "increase" ? (
                <p className="text-gray-600 mb-1">Add materials high in {oxide}:</p>
              ) : (
                <p className="text-gray-600 mb-1">Reduce materials high in {oxide}:</p>
              )}
              <div className="space-y-0.5">
                {suggestedMats.map(mat => (
                  <div key={mat.name} className="flex items-center justify-between text-gray-900">
                    <span className="flex items-center gap-1">
                      {mat.inRecipe && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="In recipe" />
                      )}
                      {mat.name}
                    </span>
                    <span className="font-mono">{mat.oxideContent.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-blue-200">
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          = Currently in recipe
        </span>
      </p>
    </div>
  );
}

// Main Component
export default function UMFCalculator() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [glazeLimits, setGlazeLimits] = useState<GlazeLimit[]>([]);
  const [base, setBase] = useState<RecipeItem[]>([{ material: '', amount: '' }]);
  const [additives, setAdditives] = useState<RecipeItem[]>([]);
  const [selectedCone, setSelectedCone] = useState('6');

  // Load materials and glaze limits from JSON
  useEffect(() => {
    try {
      const normalized = (materialsData as any[]).map((m) => {
        const name = String(m.name || '').trim();
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `material-${Math.random()}`;
        
        return {
          id,
          name,
          type: 'raw' as const,
          loi_pct: Number(m.loi || 0),
          oxideAnalysis: m.oxideAnalysis || {},
        };
      }).filter(m => m.name);
      setMaterials(normalized);

      // Load glaze limits
      setGlazeLimits(glazeLimitsData as GlazeLimit[]);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }, []);

  // Filter glaze limits by selected cone
  const coneLimits = useMemo(() => {
    return glazeLimits.filter(limit => limit.cone === selectedCone);
  }, [glazeLimits, selectedCone]);

  // Calculate totals
  const baseTotal = useMemo(() => {
    return base.reduce((sum, item) => {
      const n = toNum(item.amount);
      return sum + (isFiniteNum(n) ? n : 0);
    }, 0);
  }, [base]);

  const additivesTotal = useMemo(() => {
    return additives.reduce((sum, item) => {
      const n = toNum(item.amount);
      return sum + (isFiniteNum(n) ? n : 0);
    }, 0);
  }, [additives]);

  const overallTotal = useMemo(() => {
    return baseTotal + additivesTotal;
  }, [baseTotal, additivesTotal]);

  // Retotal functions
  const retotalBase = () => {
    if (baseTotal <= 0) return;
    const newBase = base.map(item => {
      const n = toNum(item.amount);
      if (!isFiniteNum(n) || n <= 0) return item;
      return {
        ...item,
        amount: parseFloat(((n / baseTotal) * 100).toFixed(2))
      };
    });
    setBase(newBase);
  };

  const retotalAdditives = () => {
    if (additivesTotal <= 0) return;
    const newAdditives = additives.map(item => {
      const n = toNum(item.amount);
      if (!isFiniteNum(n) || n <= 0) return item;
      return {
        ...item,
        amount: parseFloat(((n / additivesTotal) * 100).toFixed(2))
      };
    });
    setAdditives(newAdditives);
  };

  const retotalAll = () => {
    if (overallTotal <= 0) return;
    
    const newBase = base.map(item => {
      const n = toNum(item.amount);
      if (!isFiniteNum(n) || n <= 0) return item;
      return {
        ...item,
        amount: parseFloat(((n / overallTotal) * 100).toFixed(2))
      };
    });
    
    const newAdditives = additives.map(item => {
      const n = toNum(item.amount);
      if (!isFiniteNum(n) || n <= 0) return item;
      return {
        ...item,
        amount: parseFloat(((n / overallTotal) * 100).toFixed(2))
      };
    });
    
    setBase(newBase);
    setAdditives(newAdditives);
  };

  // Calculate chemistry
  const { chem, recipeLines } = useMemo(() => {
    if (materials.length === 0) return { chem: null, recipeLines: [] };

    try {
      const allLines = [...base, ...additives]
        .filter(item => item.material && item.amount !== '' && item.amount != null)
        .map(item => {
          const mat = materials.find(m => norm(m.name) === norm(item.material));
          if (!mat) return null;
          const n = toNum(item.amount);
          if (!isFiniteNum(n)) return null;
          return {
            materialId: mat.id,
            partsPct: n,
          };
        })
        .filter(Boolean) as Array<{ materialId: string; partsPct: number }>;

      if (allLines.length === 0) return { chem: null, recipeLines: [] };

      const total = allLines.reduce((sum, line) => sum + line.partsPct, 0);
      if (total <= 0) return { chem: null, recipeLines: [] };

      allLines.forEach(line => {
        line.partsPct = (line.partsPct / total) * 100;
      });

      const recipe: Recipe = {
        id: 'temp-recipe',
        name: 'User Recipe',
        category: 'glaze',
        cone: selectedCone,
        lines: allLines,
      };

      const calcOpts: CalcOptions = {
        fluxSet: DEFAULT_FLUX_SET,
        unityMode: 'flux_to_1',
      };

      const chemistry = computeChemistry(recipe, materials, calcOpts);
      return { chem: chemistry, recipeLines: allLines };
    } catch (err) {
      console.error('Chemistry calculation error:', err);
      return { chem: null, recipeLines: [] };
    }
  }, [base, additives, materials, selectedCone]);

  return (
    <div className="container mx-auto max-w-7xl p-4 sm:p-6">
      <div className="grid gap-6 lg:gap-8 items-start lg:grid-cols-[minmax(0,1fr)_minmax(400px,540px)]">
        {/* LEFT PANEL - Recipe Input */}
        <div className="grid gap-6 w-full">
          <header>
            <h1 className="text-2xl sm:text-3xl font-semibold">UMF Calculator</h1>
            <p className="text-gray-600 text-sm mt-1">
              Build your recipe and see real-time Unity Molecular Formula analysis
            </p>
          </header>

          {/* Cone Selector */}
          <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Firing Cone
            </label>
            <select
              value={selectedCone}
              onChange={(e) => setSelectedCone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="06">Cone 06</option>
              <option value="6">Cone 6</option>
              <option value="9">Cone 9</option>
              <option value="10">Cone 10</option>
            </select>
          </div>

          <RecipeList 
            title="Base Glaze" 
            items={base} 
            onChange={setBase}
            materials={materials}
            isAdditive={false}
          />

          {/* Base Total and Retotal */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm font-medium text-gray-700">Base Total:</span>
              <span className={`text-sm sm:text-lg font-semibold px-2 sm:px-3 py-0.5 sm:py-1 rounded ${
                baseTotal >= 99 && baseTotal <= 101 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {baseTotal.toFixed(2)}%
              </span>
            </div>
            <button
              type="button"
              onClick={retotalBase}
              disabled={baseTotal <= 0}
              className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Retotal to 100
            </button>
          </div>

          <RecipeList
            title="Metallic Oxides (Colorants)"
            items={additives}
            onChange={setAdditives}
            materials={materials}
            isAdditive={true}
            afterTitle={
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xs sm:text-sm font-medium text-gray-700">Oxides Total:</span>
                  <span className="text-sm sm:text-lg font-semibold bg-blue-100 text-blue-800 px-2 sm:px-3 py-0.5 sm:py-1 rounded">
                    {additivesTotal.toFixed(2)}%
                  </span>
                </div>
                <button
                  type="button"
                  onClick={retotalAdditives}
                  disabled={additivesTotal <= 0}
                  className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Retotal to 100
                </button>
              </div>
            }
          />

          {/* Overall Total and Retotal All */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm font-medium text-gray-700">Overall Total:</span>
              <span className={`text-sm sm:text-lg font-semibold px-2 sm:px-3 py-0.5 sm:py-1 rounded ${
                overallTotal >= 99 && overallTotal <= 101 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-purple-100 text-purple-800'
              }`}>
                {overallTotal.toFixed(2)}%
              </span>
            </div>
            <button
              type="button"
              onClick={retotalAll}
              disabled={overallTotal <= 0}
              className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Retotal All to 100
            </button>
          </div>

          {/* Mole % Card - Moved to left side */}
          {chem && (
            <div className="rounded-xl border p-4 sm:p-6 bg-white shadow-sm">
              <h3 className="font-semibold mb-3 text-base sm:text-lg">Mole %</h3>
              <ChemTable obj={chem.molePct} fmt={(v) => v.toFixed(2)} />
            </div>
          )}
        </div>

        {/* RIGHT PANEL - UMF Results */}
        <aside className="space-y-4">
          <div className="lg:sticky lg:top-20 space-y-4">
            {/* UMF Analysis Card */}
            <div className="rounded-xl border p-4 sm:p-6 bg-white shadow-sm">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Chemistry Analysis</h2>
              
              {!chem ? (
                <p className="text-gray-500 text-sm">Add materials to see chemistry analysis</p>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {/* Warnings */}
                  {chem.warnings.length > 0 && (
                    <div className="space-y-1">
                      {chem.warnings.map((w, i) => (
                        <div key={i} className="text-xs sm:text-sm text-yellow-600">
                          ⚠ {w}
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold mb-3 sm:mb-4 text-base sm:text-lg">UMF (flux to 1)</h3>
                    <GroupedUMFTable umf={chem.umf} />
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2 sm:mb-3 text-base">Key Ratios</h3>
                    <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span>SiO₂ : Al₂O₃</span>
                        <span className="font-mono">
                          {chem.ratios.si_al?.toFixed(2) ?? "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>(KNaLi) / (CaMgBaSrZn)</span>
                        <span className="font-mono">
                          {chem.ratios.alkali_over_alkaline?.toFixed(2) ?? "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>B₂O₃ %</span>
                        <span className="font-mono">
                          {chem.ratios.b2o3_pct?.toFixed(2) ?? "0.00"}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2 mt-2">
                        <span>CTE (×10⁻⁷/°C)</span>
                        <span className="font-mono font-semibold">
                          {chem.cte.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 bg-gray-50 rounded-md">
                    <h4 className="text-sm font-semibold mb-2">Clay Body Matching</h4>
                    <div className="text-xs space-y-1 text-gray-600">
                      <p>
                        {chem.cte < 60 ? "Low CTE: Fits tight, may craze on high-expansion bodies" :
                         chem.cte < 70 ? "Medium CTE: Good fit for most mid-range clay bodies" :
                         "High CTE: May shiver on low-expansion bodies"}
                      </p>
                      <p className="mt-2">
                        <span className="font-semibold text-gray-900">Target ranges:</span><br />
                        Porcelain: 55-65 • Stoneware: 60-70 • Earthenware: 65-75
                      </p>
                    </div>
                  </div>

                  {/* Optimization Suggestions */}
                  {coneLimits.length > 0 && (
                    <OptimizationSuggestions
                      umf={chem.umf}
                      limits={coneLimits}
                      cone={selectedCone}
                      materials={materials}
                      recipeLines={recipeLines}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}