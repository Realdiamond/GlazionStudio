// src/pages/RecipesToImage.tsx
import React, { useState } from 'react';
import RecipeList, { RecipeItem } from '@/components/RecipeList';
import { generateImageFromRecipeViaProxy, type RecipeLine } from '@/utils/api';

export default function RecipesToImage() {
  const [base, setBase] = useState<RecipeItem[]>([{ material: '', amount: '', unit: '%' }]);
  const [additives, setAdditives] = useState<RecipeItem[]>([]);
  const [oxidation, setOxidation] = useState('');
  const [atmosphere, setAtmosphere] = useState('');
  const [notes, setNotes] = useState('');
  const [quality, setQuality] = useState<'standard' | 'high' | ''>('');   // optional UI control
  const [enhancePrompt, setEnhancePrompt] = useState(true);               // default true
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResultUrl(null);

    try {
      // Build baseRecipe (Swagger: single object)
      const baseValid = base
        .map(b => ({
          material: (b.material || '').trim(),
          amount: Number(b.amount),
          unit: (b.unit || '%').trim(),
        }))
        .filter(b => b.material && !Number.isNaN(b.amount)) as RecipeLine[];

      if (baseValid.length === 0) throw new Error('Add at least one Base Recipe line with a material and amount.');
      const baseRecipe = baseValid[0]; // take the first row by default

      const additivesValid = additives
        .map(a => ({
          material: (a.material || '').trim(),
          amount: Number(a.amount),
          unit: (a.unit || '%').trim(),
        }))
        .filter(a => a.material && !Number.isNaN(a.amount)) as RecipeLine[];

      const payload = {
        baseRecipe,
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

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="grid gap-8 items-start md:grid-cols-[minmax(0,1fr)_380px]">
        {/* Left: Form */}
        <form onSubmit={handleGenerate} className="grid gap-6 w-full">
          <header>
            <h1 className="text-2xl font-semibold">Recipes → Image</h1>
            <p className="text-muted-foreground text-sm">
              Build your base and additives, set firing context, preview the glaze.
            </p>
          </header>

          {error && (
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
              <input
                type="checkbox"
                checked={enhancePrompt}
                onChange={() => setEnhancePrompt(v => !v)}
              />
              <span className="text-sm">Enhance Prompt</span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg border bg-primary text-primary-foreground disabled:opacity-50"
            >
              {loading ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </form>

        {/* Right: Preview */}
        <aside className="grid gap-4">
          <div className="rounded-xl border p-3 bg-card">
            <div className="text-sm font-medium mb-2">Preview</div>
            {resultUrl ? (
              <img src={resultUrl} alt="Glaze preview" className="w-full rounded-lg border" />
            ) : (
              <div className="aspect-video grid place-items-center rounded-lg border text-sm text-muted-foreground">
                No preview yet
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
