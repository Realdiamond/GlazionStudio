import React, { useMemo, useState } from 'react';
import RecipeList, { RecipeItem } from '@/components/RecipeList';
import { generateImageFromRecipeViaProxy, type RecipeLine } from '@/utils/api';

export default function RecipesToImage() {
  const [base, setBase] = useState<RecipeItem[]>([{ material: '', amount: '', unit: '%' }]);
  const [additives, setAdditives] = useState<RecipeItem[]>([]);
  const [oxidation, setOxidation] = useState('');
  const [atmosphere, setAtmosphere] = useState('');
  const [notes, setNotes] = useState('');
  const [quality, setQuality] = useState<'standard' | 'high' | ''>('');
  const [enhancePrompt, setEnhancePrompt] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const hasPreview = !!resultUrl;

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResultUrl(null);
    setImgLoaded(false);

    try {
      // Build baseRecipe (Swagger expects a single object)
      const baseValid = base
        .map(b => ({
          material: (b.material || '').trim(),
          amount: Number(b.amount),
          unit: (b.unit || '%').trim(),
        }))
        .filter(b => b.material && !Number.isNaN(b.amount)) as RecipeLine[];

      if (baseValid.length === 0) throw new Error('Add at least one Base Recipe line with a material and amount.');

      const additivesValid = additives
        .map(a => ({
          material: (a.material || '').trim(),
          amount: Number(a.amount),
          unit: (a.unit || '%').trim(),
        }))
        .filter(a => a.material && !Number.isNaN(a.amount)) as RecipeLine[];

      const payload = {
        baseRecipe: baseValid[0],
        additives: additivesValid.length ? additivesValid : undefined,
        oxidationNumber: oxidation ? Number(oxidation) : undefined,
        atmosphere: atmosphere || undefined,
        notes: notes || undefined,
        enhancePrompt,
        quality: quality || undefined,
      };

      const resp = await generateImageFromRecipeViaProxy(payload);
      if (!resp.imageUrl) throw new Error('No imageUrl returned.');
      setResultUrl(resp.imageUrl);
    } catch (err: any) {
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
            <p className="text-sm text-red-600 font-medium mb-1">Couldn’t generate image</p>
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

          <RecipeList title="Base Recipe" items={base} onChange={setBase} />
          <RecipeList title="Additives (optional)" items={additives} onChange={setAdditives} />

          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-3 gap-4">
              <label className="grid gap-2 min-w-0">
                <span className="text-sm font-medium">Firing (Oxidation #)</span>
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="e.g., 10"
                  inputMode="numeric"
                  value={oxidation}
                  onChange={e => setOxidation(e.target.value)}
                />
              </label>

              <label className="grid gap-2 min-w-0">
                <span className="text-sm font-medium">Atmosphere</span>
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="e.g., oxidation / reduction"
                  value={atmosphere}
                  onChange={e => setAtmosphere(e.target.value)}
                />
              </label>

              <label className="grid gap-2 min-w-0">
                <span className="text-sm font-medium">Quality</span>
                <select
                  className="border rounded-lg px-3 py-2"
                  value={quality}
                  onChange={e => setQuality(e.target.value as any)}
                >
                  <option value="">Default</option>
                  <option value="standard">Standard</option>
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

            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={enhancePrompt} onChange={() => setEnhancePrompt(v => !v)} />
              <span className="text-sm">Enhance Prompt</span>
            </label>
          </div>

          {/* Sticky action bar on desktop; inline on mobile */}
          <div className="md:sticky md:bottom-0 md:bg-background/80 md:backdrop-blur md:border-t md:px-0 md:py-3">
            <div className="flex gap-3 justify-start md:justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg border bg-primary text-primary-foreground disabled:opacity-50"
              >
                {loading ? 'Generating…' : 'Generate'}
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
