import React, { useState } from 'react';
import RecipeList, { RecipeItem } from '@/components/RecipeList';

export default function RecipesToImage() {
  const [base, setBase] = useState<RecipeItem[]>([{ material: '', amount: '', unit: '%' }]);
  const [additives, setAdditives] = useState<RecipeItem[]>([]);
  const [oxidation, setOxidation] = useState('');
  const [atmosphere, setAtmosphere] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        base: { items: base },
        additives: { items: additives },
        oxidation,
        atmosphere,
        notes: notes || undefined,
      };
      // TODO: POST payload to your backend
      await new Promise(r => setTimeout(r, 900)); // mock
      setResultUrl('https://placehold.co/800x600?text=Glaze+Preview');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 transition-all duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-8 items-start">
        {/* Left: Form */}
        <form onSubmit={handleGenerate} className="grid gap-6 w-full">
          <header>
            <h1 className="text-2xl font-semibold">Recipes → Image</h1>
            <p className="text-muted-foreground text-sm">Build your base and additives, set firing context, preview the glaze.</p>
          </header>

          <RecipeList title="Base Recipe" items={base} onChange={setBase} />
          <RecipeList title="Additives (optional)" items={additives} onChange={setAdditives} />

          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-3 gap-4">
              <label className="grid gap-2 min-w-0">
                <span className="text-sm font-medium">Oxidation Number</span>
                <input
                  type="text"
                  className="rounded-lg border bg-background p-3 w-full"
                  placeholder="e.g., 0.5, 1.0, 1.5"
                  value={oxidation}
                  onChange={(e) => setOxidation(e.target.value)}
                  required
                />
              </label>

              <label className="grid gap-2 min-w-0">
                <span className="text-sm font-medium">Atmosphere</span>
                <select
                  className="rounded-lg border bg-background p-3 w-full"
                  value={atmosphere}
                  onChange={(e) => setAtmosphere(e.target.value)}
                  required
                >
                  <option value="">Select...</option>
                  <option value="oxidation">Oxidation</option>
                  <option value="reduction">Reduction</option>
                  <option value="neutral">Neutral</option>
                  <option value="wood">Wood</option>
                  <option value="soda">Soda</option>
                  <option value="salt">Salt</option>
                </select>
              </label>

              <label className="grid gap-2 min-w-0 sm:col-span-2 lg:col-span-1 xl:col-span-1">
                <span className="text-sm font-medium">Notes (optional)</span>
                <input
                  type="text"
                  className="rounded-lg border bg-background p-3 w-full"
                  placeholder="cone, cooling, thickness..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-xl bg-primary text-primary-foreground px-4 py-2 font-medium disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Generating…' : 'Generate Preview'}
            </button>
            <span className="text-xs text-muted-foreground">Preview opens on the right.</span>
          </div>
        </form>

        {/* Right: Preview */}
        <aside className="sticky top-16 lg:max-h-[calc(100dvh-6rem)]">
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