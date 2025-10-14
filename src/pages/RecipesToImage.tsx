import React, { useMemo, useState, useCallback, useEffect } from 'react';
import RecipeList, { RecipeItem } from '@/components/RecipeList';
import { computeChemistry } from '@/lib/chemistry';
import type { Material, Recipe, CalcOptions, OxideSymbol } from '@/lib/types';
import materialsData from '@/data/materials.json';
import { 
  getConeOptions, 
  getConeData, 
  findClosestConeByFahrenheit, 
  findClosestConeByCelsius,
  type ConeNumber 
} from '@/utils/coneConversion';

// API function - keep your existing one or use this
async function generateImageFromRecipeViaProxy(payload: any) {
  const response = await fetch('/api/recipes-to-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Request failed' } }));
    throw new Error(error?.error?.message || 'Failed to generate image');
  }

  return response.json();
}

// Default flux set (matches converter)
const DEFAULT_FLUX_SET: OxideSymbol[] = [
  "K2O", "Na2O", "Li2O", "CaO", "MgO", "BaO", "SrO", "ZnO"
];

export default function RecipesToImage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [base, setBase] = useState<RecipeItem[]>([{ material: '', amount: '' }]);
  const [additives, setAdditives] = useState<RecipeItem[]>([]);
  const [coneNumber, setConeNumber] = useState<ConeNumber>('10');
  const [fahrenheit, setFahrenheit] = useState(2345);
  const [celsius, setCelsius] = useState(1285);
  const [atmosphere, setAtmosphere] = useState('');
  const [notes, setNotes] = useState('');
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('medium');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const hasPreview = !!resultUrl;
  const coneOptions = getConeOptions();

  // Load and normalize materials from JSON
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
      });
      setMaterials(normalized);
      console.log(`Loaded ${normalized.length} materials`);
    } catch (err) {
      console.error('Failed to load materials:', err);
      setError('Failed to load materials database');
    }
  }, []);

  // Handle cone selection - updates F and C
  const handleConeChange = useCallback((newCone: ConeNumber) => {
    const coneData = getConeData(newCone);
    if (coneData) {
      setConeNumber(newCone);
      setFahrenheit(coneData.fahrenheit);
      setCelsius(coneData.celsius);
    }
  }, []);

  // Handle Fahrenheit input - updates cone and C
  const handleFahrenheitChange = useCallback((newF: number) => {
    if (isNaN(newF)) return;
    
    const closestCone = findClosestConeByFahrenheit(newF);
    setConeNumber(closestCone.cone);
    setFahrenheit(newF);
    setCelsius(Math.round((newF - 32) * 5 / 9));
  }, []);

  // Handle Celsius input - updates cone and F
  const handleCelsiusChange = useCallback((newC: number) => {
    if (isNaN(newC)) return;
    
    const closestCone = findClosestConeByCelsius(newC);
    setConeNumber(closestCone.cone);
    setCelsius(newC);
    setFahrenheit(Math.round((newC * 9 / 5) + 32));
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResultUrl(null);
    setImgLoaded(false);

    try {
      if (materials.length === 0) {
        throw new Error('Materials database not loaded yet. Please wait.');
      }

      // Build combined recipe lines
      const allLines = [...base, ...additives]
        .filter(item => item.material && item.amount)
        .map(item => {
          const mat = materials.find(m => m.name === item.material);
          if (!mat) {
            throw new Error(`Material not found in database: ${item.material}`);
          }
          
          return {
            materialId: mat.id,
            partsPct: Number(item.amount),
          };
        });

      if (allLines.length === 0) {
        throw new Error('Add at least one recipe line with material and amount.');
      }

      // Normalize to 100%
      const total = allLines.reduce((sum, line) => sum + line.partsPct, 0);
      if (total <= 0) {
        throw new Error('Total amount must be greater than 0.');
      }
      
      allLines.forEach(line => {
        line.partsPct = (line.partsPct / total) * 100;
      });

      // Build recipe object for chemistry calculation
      const recipe: Recipe = {
        id: 'temp-recipe',
        name: 'User Recipe',
        category: 'glaze',
        cone: coneNumber,
        lines: allLines,
      };

      // Calculate UMF using client's chemistry library
      const calcOpts: CalcOptions = {
        fluxSet: DEFAULT_FLUX_SET,
        unityMode: 'flux_to_1',
      };
      
      const chemistry = computeChemistry(recipe, materials, calcOpts);

      // Log warnings if any
      if (chemistry.warnings.length > 0) {
        console.warn('UMF calculation warnings:', chemistry.warnings);
      }

      console.log('UMF Calculation Result:', {
        umf: chemistry.umf,
        molePct: chemistry.molePct,
        fluxSum: chemistry.fluxSum,
      });

      // Build NEW API payload with UMF data
      const payload = {
        cone: coneNumber,
        atmosphere: atmosphere || undefined,
        umf: chemistry.umf,
        molePct: chemistry.molePct,
        notes: notes || undefined,
        enhancePrompt: true,
        quality: quality,
      };

      console.log('Sending UMF payload to API:', payload);

      const resp = await generateImageFromRecipeViaProxy(payload);
      if (!resp.imageUrl) throw new Error('No imageUrl returned.');
      setResultUrl(resp.imageUrl);
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err?.message || 'Failed to generate image.');
    } finally {
      setLoading(false);
    }
  }

  // Preview state content (empty / loading / error / image)
  const previewContent = useMemo(() => {
    // ERROR
    if (error) {
      return (
        <div className="grid h-full w-full place-items-center text-center p-4">
          <div className="max-w-[90%]">
            <p className="text-sm text-red-600 font-medium mb-1">Couldn't generate image</p>
            <p className="text-xs text-red-700/80">{error}</p>
          </div>
        </div>
      );
    }

    // LOADING
    if (loading) {
      return (
        <div
          className="relative h-full w-full overflow-hidden"
          aria-busy="true"
          aria-live="polite"
          aria-label="Generating glaze preview"
        >
          {/* Skeleton tile */}
          <div className="absolute inset-0 animate-pulse bg-muted" />
          {/* Center spinner + copy */}
          <div className="absolute inset-0 grid place-items-center">
            <div className="flex flex-col items-center gap-3">
              {/* spinner */}
              <svg
                className="h-6 w-6 animate-spin"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                <path d="M22 12a10 10 0 0 1-10 10"
                  stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
              </svg>
              <p className="text-xs text-muted-foreground">Generating glaze preview…</p>
            </div>
          </div>
        </div>
      );
    }

    // EMPTY
    if (!hasPreview) {
      return (
        <div className="grid h-full w-full place-items-center">
          <span className="text-sm text-muted-foreground">No preview yet</span>
        </div>
      );
    }

    // IMAGE (fade in when loaded)
    return (
      <img
        src={resultUrl!}
        alt="Glaze preview"
        className={`h-full w-full object-contain transition-opacity duration-200 ${
          imgLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setImgLoaded(true)}
        draggable={false}
      />
    );
  }, [error, loading, hasPreview, resultUrl, imgLoaded]);

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <div className="grid gap-8 items-start md:grid-cols-[minmax(0,1fr)_540px]">
        {/* LEFT: Form column */}
        <form onSubmit={handleGenerate} className="grid gap-6 w-full">
          <header>
            <h1 className="text-2xl font-semibold">Recipes → Image</h1>
            <p className="text-muted-foreground text-sm">
              Build your base and additives, set firing context, preview the glaze.
            </p>
          </header>

          {/* Inline error (non-preview) for validation or global issues */}
          {error && !loading && !resultUrl && (
            <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-lg p-2">{error}</div>
          )}

          <RecipeList 
            title="Base Recipe" 
            items={base} 
            onChange={setBase}
            materials={materials}
          />
          <RecipeList 
            title="Additives (optional)" 
            items={additives} 
            onChange={setAdditives}
            materials={materials}
          />

          <div className="grid grid-cols-1 gap-4">
            {/* Firing Temperature Section */}
            <div className="grid gap-4">
              <h3 className="text-sm font-medium">Firing Temperature</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="grid gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground">Cone</span>
                  <select
                    className="border rounded-lg px-3 py-2"
                    value={coneNumber}
                    onChange={e => handleConeChange(e.target.value as ConeNumber)}
                  >
                    {coneOptions.map(cone => (
                      <option key={cone} value={cone}>
                        {cone}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground">°F</span>
                  <input
                    className="border rounded-lg px-3 py-2"
                    type="number"
                    value={fahrenheit}
                    onChange={e => handleFahrenheitChange(Number(e.target.value))}
                  />
                </label>

                <label className="grid gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground">°C</span>
                  <input
                    className="border rounded-lg px-3 py-2"
                    type="number"
                    value={celsius}
                    onChange={e => handleCelsiusChange(Number(e.target.value))}
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium">Atmosphere</span>
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="e.g., oxidation / reduction"
                  value={atmosphere}
                  onChange={e => setAtmosphere(e.target.value)}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium">Quality</span>
                <select
                  className="border rounded-lg px-3 py-2"
                  value={quality}
                  onChange={e => setQuality(e.target.value as 'high' | 'medium' | 'low')}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-medium">Notes</span>
              <textarea
                className="border rounded-lg px-3 py-2 min-h-[90px]"
                placeholder="Optional notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </label>
          </div>

          {/* Sticky action bar on desktop; inline on mobile */}
          <div className="md:sticky md:bottom-0 md:bg-background/80 md:backdrop-blur md:border-t md:px-0 md:py-3">
            <div className="flex gap-3 justify-start md:justify-end">
              <button
                type="submit"
                disabled={loading || materials.length === 0}
                className="px-4 py-2 rounded-lg border bg-primary text-primary-foreground disabled:opacity-50"
              >
                {loading ? 'Generating…' : materials.length === 0 ? 'Loading materials...' : 'Generate'}
              </button>
            </div>
          </div>
        </form>

        {/* RIGHT: Preview column */}
        <aside className="grid gap-4">
          <div className="rounded-xl border p-3 bg-card">
            <div className="text-sm font-medium mb-2">Preview</div>

            {/* Fixed-size 512×512 canvas; never upscale above 512 */}
            <div
              className="
                relative
                mx-auto
                w-full max-w-[512px]
                aspect-square
                rounded-lg border
                overflow-hidden
                bg-background
              "
            >
              {previewContent}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}