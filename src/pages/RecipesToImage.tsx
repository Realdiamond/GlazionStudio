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

// API function
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

// Friendly error messages based on error type
function getFriendlyError(error: any): {
  title: string;
  message: string;
  type: 'validation' | 'network' | 'server' | 'timeout' | 'unknown';
} {
  const errorMsg = error?.message || String(error);
  
  // Validation errors (client-side)
  if (errorMsg.includes('Materials database not loaded')) {
    return {
      title: 'Materials Not Ready',
      message: 'The materials database is still loading. Please wait a moment and try again.',
      type: 'validation'
    };
  }
  if (errorMsg.includes('Material not found in database') || errorMsg.includes('Material "')) {
    return {
      title: 'Invalid Material',
      message: 'One or more materials in your recipe are not recognized. Please check your selections.',
      type: 'validation'
    };
  }
  if (
    errorMsg.includes('Add at least one recipe line') ||
    errorMsg.includes('Base glaze must have at least one material')
  ) {
    return {
      title: 'Empty Recipe',
      message: 'Please add at least one material with an amount to your recipe.',
      type: 'validation'
    };
  }
  if (
    errorMsg.includes('Total amount must be greater') ||
    errorMsg.includes('Total base amount must be greater than 0')
  ) {
    return {
      title: 'Invalid Amounts',
      message: 'The total amount of materials must be greater than zero.',
      type: 'validation'
    };
  }

  // Network/timeout errors
  if (errorMsg.includes('took too long') || errorMsg.includes('aborted') || errorMsg.includes('timeout')) {
    return {
      title: 'Request Timeout',
      message: 'The image generation is taking longer than expected. This usually happens with complex recipes. Please try again.',
      type: 'timeout'
    };
  }
  if (errorMsg.includes('Failed to fetch') || errorMsg.includes('network')) {
    return {
      title: 'Connection Error',
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      type: 'network'
    };
  }

  // Server errors (from backend)
  if (errorMsg.includes('temporarily unavailable') || errorMsg.includes('503')) {
    return {
      title: 'Service Unavailable',
      message: 'The image generation service is temporarily down. Please try again in a few moments.',
      type: 'server'
    };
  }
  if (errorMsg.includes('500') || errorMsg.includes('Internal Server Error')) {
    return {
      title: 'Server Error',
      message: 'Something went wrong on our server. Our team has been notified. Please try again later.',
      type: 'server'
    };
  }
  if (errorMsg.includes('400') || errorMsg.includes('Bad Request')) {
    return {
      title: 'Invalid Request',
      message: 'The recipe data format is incorrect. Please refresh the page and try again.',
      type: 'validation'
    };
  }
  if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
    return {
      title: 'Authentication Error',
      message: 'Your session may have expired. Please refresh the page and try again.',
      type: 'server'
    };
  }
  if (errorMsg.includes('No imageUrl returned')) {
    return {
      title: 'Generation Failed',
      message: 'The image was processed but no result was returned. Please try again.',
      type: 'server'
    };
  }

  // Generic fallback
  return {
    title: 'Something Went Wrong',
    message: errorMsg || 'An unexpected error occurred. Please try again.',
    type: 'unknown'
  };
}

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

  const [loading, setLoading] = useState(false);
  type Friendly = ReturnType<typeof getFriendlyError>;
  const [error, setError] = useState<Friendly | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Validation warnings state
  interface ValidationError {
    field: string;
    message: string;
    type: 'warning' | 'error';
  }
  const [validationWarnings, setValidationWarnings] = useState<ValidationError[]>([]);

  const hasPreview = !!resultUrl;
  const coneOptions = getConeOptions();

  // helpers (no structural change to component)
  const toNum = (v: string | number | undefined) =>
    typeof v === 'number' ? v : Number.parseFloat(String(v ?? '').trim());
  const isFiniteNum = (n: unknown): n is number => Number.isFinite(n as number);
  const norm = (s: string) => s.trim().toLowerCase();

  // Load materials from JSON
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
      }).filter(m => m.name); // filter empty names
      setMaterials(normalized);
      console.log(`Loaded ${normalized.length} materials`);
    } catch (err) {
      console.error('Failed to load materials:', err);
      setError({
        title: 'Materials Loading Failed',
        message: 'Unable to load the materials database. Please refresh the page.',
        type: 'validation'
      });
    }
  }, []);

  const handleConeChange = useCallback((newCone: ConeNumber) => {
    const coneData = getConeData(newCone);
    if (coneData) {
      setConeNumber(newCone);
      setFahrenheit(coneData.fahrenheit);
      setCelsius(coneData.celsius);
    }
  }, []);

  const handleFahrenheitChange = useCallback((newF: number) => {
    if (isNaN(newF)) return;
    const closestCone = findClosestConeByFahrenheit(newF);
    setConeNumber(closestCone.cone);
    setFahrenheit(newF);
    setCelsius(Math.round((newF - 32) * 5 / 9));
  }, []);

  const handleCelsiusChange = useCallback((newC: number) => {
    if (isNaN(newC)) return;
    const closestCone = findClosestConeByCelsius(newC);
    setConeNumber(closestCone.cone);
    setCelsius(newC);
    setFahrenheit(Math.round((newC * 9 / 5) + 32));
  }, []);

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
  const retotalBase = useCallback(() => {
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
  }, [base, baseTotal]);

  const retotalAdditives = useCallback(() => {
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
  }, [additives, additivesTotal]);

  const retotalAll = useCallback(() => {
    if (overallTotal <= 0) return;
    
    // Retotal base proportionally
    const newBase = base.map(item => {
      const n = toNum(item.amount);
      if (!isFiniteNum(n) || n <= 0) return item;
      return {
        ...item,
        amount: parseFloat(((n / overallTotal) * 100).toFixed(2))
      };
    });
    
    // Retotal additives proportionally
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
  }, [base, additives, overallTotal]);

  // validation
  function validateRecipe(
    base: RecipeItem[], 
    additives: RecipeItem[], 
    materials: Material[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // 1. Check if materials are loaded
    if (materials.length === 0) {
      errors.push({
        field: 'materials',
        message: 'Materials database not loaded. Please refresh the page.',
        type: 'error'
      });
      return errors;
    }

    // 2. Check base recipe has at least one valid entry
    const validBase = base.filter(item => item.material && item.amount !== '' && item.amount != null);
    if (validBase.length === 0) {
      errors.push({
        field: 'base',
        message: 'Base glaze must have at least one material with an amount.',
        type: 'error'
      });
    }

    // 3. Check for empty material names in base
    base.forEach((item, idx) => {
      if ((item.amount !== '' && item.amount != null) && !item.material) {
        errors.push({
          field: 'base',
          message: `Base row ${idx + 1}: Material name is required when amount is specified.`,
          type: 'error'
        });
      }
    });

    // 4. Check for empty amounts in base
    base.forEach((item, idx) => {
      if (item.material && (item.amount === '' || item.amount == null)) {
        errors.push({
          field: 'base',
          message: `Base row ${idx + 1}: Amount is required for ${item.material}.`,
          type: 'error'
        });
      }
    });

    // 5. Amount numeric/negative/zero
    [...base, ...additives].forEach((item) => {
      if (!item.material) return;
      const n = toNum(item.amount);
      if (!isFiniteNum(n)) {
        errors.push({
          field: 'amount',
          message: `${item.material}: Amount must be a number.`,
          type: 'error'
        });
        return;
      }
      if (n < 0) {
        errors.push({
          field: 'amount',
          message: `Negative amounts are not allowed (found: ${n}).`,
          type: 'error'
        });
      }
      if (n === 0) {
        errors.push({
          field: 'amount',
          message: `${item.material}: Amount must be greater than 0.`,
          type: 'error'
        });
      }
    });

    // 6. Check for invalid materials (not in database), case-insensitive
    [...base, ...additives].forEach((item) => {
      if (item.material) {
        const exists = materials.find(m => norm(m.name) === norm(item.material!));
        if (!exists) {
          errors.push({
            field: 'material',
            message: `Material "${item.material}" not found in database.`,
            type: 'error'
          });
        }
      }
    });

    // 7. Check for duplicate materials (normalized)
    const allMaterials = [...base, ...additives]
      .filter(item => item.material)
      .map(item => item.material!);
    const allNorm = allMaterials.map(norm);
    const duplicates = allMaterials.filter((name, idx) => allNorm.indexOf(norm(name)) !== idx);
    if (duplicates.length > 0) {
      errors.push({
        field: 'material',
        message: `Duplicate materials found: ${[...new Set(duplicates)].join(', ')}`,
        type: 'warning'
      });
    }

    // 8. Check total base percentage
    const totalBase = base.reduce((sum, item) => {
      const n = toNum(item.amount);
      return sum + (isFiniteNum(n) ? n : 0);
    }, 0);

    if (totalBase === 0 && validBase.length > 0) {
      errors.push({
        field: 'base',
        message: 'Total base amount must be greater than 0.',
        type: 'error'
      });
    }

    // 9. Warn if base total is far from 100
    if (totalBase > 0 && (totalBase < 90 || totalBase > 110)) {
      errors.push({
        field: 'base',
        message: `Base total is ${totalBase.toFixed(1)}%. Consider using "Retotal to 100" for accurate percentages.`,
        type: 'warning'
      });
    }

    // 10. Check for very large additive amounts
    additives.forEach((item) => {
      if (!item.material) return;
      const n = toNum(item.amount);
      if (isFiniteNum(n) && n > 20) {
        errors.push({
          field: 'additives',
          message: `${item.material}: ${n}% is unusually high for a colorant (typically 0.5-15%).`,
          type: 'warning'
        });
      }
    });

    // 11. Check for empty additives in additives section
    additives.forEach((item, idx) => {
      if ((item.amount !== '' && item.amount != null) && !item.material) {
        errors.push({
          field: 'additives',
          message: `Colorant row ${idx + 1}: Material name is required.`,
          type: 'error'
        });
      }
      if (item.material && (item.amount === '' || item.amount == null)) {
        errors.push({
          field: 'additives',
          message: `Colorant row ${idx + 1}: Amount is required for ${item.material}.`,
          type: 'error'
        });
      }
    });

    return errors;
  }

  // Single handleGenerate that performs validation then generation
  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Run validation first
    const validationErrors = validateRecipe(base, additives, materials);
    const errorsOnly = validationErrors.filter(e => e.type === 'error');
    const warnings = validationErrors.filter(e => e.type === 'warning');

    if (errorsOnly.length > 0) {
      setError({
        title: 'Validation Failed',
        message: errorsOnly.map(e => e.message).join('\n'),
        type: 'validation'
      });
      return;
    }
    if (warnings.length > 0) {
      console.warn('Recipe warnings:', warnings);
      setValidationWarnings(warnings); // Store warnings to display in UI
    } else {
      setValidationWarnings([]); // Clear warnings if validation passes
    }

    setLoading(true);
    setResultUrl(null);
    setImgLoaded(false);

    try {
      if (materials.length === 0) {
        throw new Error('Materials database not loaded yet. Please wait.');
      }

      // map recipe lines with case-insensitive lookup and numeric parsing
      const allLines = [...base, ...additives]
        .filter(item => item.material && item.amount !== '' && item.amount != null)
        .map(item => {
          const mat = materials.find(m => norm(m.name) === norm(item.material!));
          if (!mat) {
            throw new Error(`Material not found in database: ${item.material}`);
          }
          const n = toNum(item.amount);
          if (!isFiniteNum(n)) {
            throw new Error(`Amount must be a number for ${item.material}`);
          }
          return {
            materialId: mat.id,
            partsPct: n,
          };
        });

      if (allLines.length === 0) {
        throw new Error('Add at least one recipe line with material and amount.');
      }

      const total = allLines.reduce((sum, line) => sum + line.partsPct, 0);
      if (total <= 0) {
        throw new Error('Total amount must be greater than 0.');
      }
      
      // normalize to 100%
      allLines.forEach(line => {
        line.partsPct = (line.partsPct / total) * 100;
      });

      const recipe: Recipe = {
        id: 'temp-recipe',
        name: 'User Recipe',
        category: 'glaze',
        cone: coneNumber,
        lines: allLines,
      };

      const calcOpts: CalcOptions = {
        fluxSet: DEFAULT_FLUX_SET,
        unityMode: 'flux_to_1',
      };
      
      const chemistry = computeChemistry(recipe, materials, calcOpts);

      if (chemistry.warnings.length > 0) {
        console.warn('UMF calculation warnings:', chemistry.warnings);
      }

      console.log('UMF Result:', chemistry.umf, chemistry.molePct);

      // Clean payload - exactly what backend expects
      const payload = {
        cone: coneNumber,
        atmosphere: atmosphere || undefined,
        umf: chemistry.umf,
        molePct: chemistry.molePct,
        note: notes || undefined, 
      };

      console.log('Sending payload:', payload);

      const resp = await generateImageFromRecipeViaProxy(payload);
      if (!resp.imageUrl) throw new Error('No imageUrl returned');
      setResultUrl(resp.imageUrl);
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  // Error icon based on type
  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'validation':
        return '⚠️';
      case 'network':
        return '📡';
      case 'server':
        return '🔧';
      case 'timeout':
        return '⏱️';
      default:
        return '❌';
    }
  };

  const previewContent = useMemo(() => {
    if (error) {
      return (
        <div className="grid h-full w-full place-items-center text-center p-6">
          <div className="max-w-md space-y-3">
            <div className="text-4xl mb-2">{getErrorIcon(error.type)}</div>
            <p className="text-base font-semibold text-gray-900">{error.title}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{error.message}</p>
            {error.type === 'timeout' && (
              <p className="text-xs text-gray-500 mt-2">
                💡 Tip: Complex recipes with many materials may take longer to process.
              </p>
            )}
          </div>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="relative h-full w-full overflow-hidden" aria-busy="true" aria-live="polite">
          <div className="absolute inset-0 animate-pulse bg-muted" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="flex flex-col items-center gap-3">
              <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
              </svg>
              <p className="text-xs text-muted-foreground">Generating glaze result…</p>
            </div>
          </div>
        </div>
      );
    }

    if (!hasPreview) {
      return (
        <div className="grid h-full w-full place-items-center">
          <span className="text-sm text-muted-foreground">No result yet</span>
        </div>
      );
    }

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
        <form onSubmit={handleGenerate} className="grid gap-6 w-full">
          <header>
            <h1 className="text-2xl font-semibold">Recipes → Image</h1>
            <p className="text-muted-foreground text-sm">
              Build your base and additives, set firing context, preview the glaze.
            </p>
          </header>

          {/* Only show inline error if not loading and no result */}
          {error && !loading && !resultUrl && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
              <div className="flex items-start gap-3">
                <span className="text-xl">{getErrorIcon(error.type)}</span>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-red-900">{error.title}</p>
                  <p className="text-sm text-red-700">{error.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Display validation warnings */}
          {validationWarnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-amber-900">Recipe Warnings</p>
                  <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                    {validationWarnings.map((warning, idx) => (
                      <li key={idx}>{warning.message}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <RecipeList 
            title="Base Glaze" 
            items={base} 
            onChange={setBase}
            materials={materials}
            isAdditive={false}
          />

          {/* Base Total and Retotal */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-green-50 border border-green-200 rounded-lg">
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
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
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
              <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-blue-50 border border-blue-200 rounded-lg">
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
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Retotal to 100
                </button>
              </div>
            }
          />

          {/* Overall Total and Retotal All */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-purple-50 border border-purple-200 rounded-lg">
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
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Retotal All to 100
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
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
                      <option key={cone} value={cone}>{cone}</option>
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
              <span className="text-sm font-medium">Notes</span>
              <textarea
                className="border rounded-lg px-3 py-2 min-h-[90px]"
                placeholder="Optional notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </label>
          </div>

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

        <aside className="grid gap-4">
          <div className="md:sticky md:top-20 rounded-xl border p-3 bg-card">
            <div className="text-sm font-medium mb-2">Glaze Result</div>
            <div className="relative mx-auto w-full max-w-[512px] aspect-square rounded-lg border overflow-hidden bg-background">
              {previewContent}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}