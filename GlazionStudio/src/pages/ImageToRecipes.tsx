import React, { useState, DragEvent, useRef } from 'react';

export default function ImageToRecipes() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    if (e.target === dropRef.current) setDragging(false);
  }

  async function handleAnalyze() {
    if (!file) return;
    setLoading(true);
    try {
      // TODO: call your backend endpoint e.g. /api/image-to-recipes
      await new Promise(r => setTimeout(r, 900)); // mock
      setResult({
        recipe: 'Feldspar 45%, Silica 25%, Whiting 20%, Kaolin 10%',
        oxidation: '1.0',
        atmosphere: 'oxidation',
        notes: 'Simulated output for demo.'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: full container dropzone */}
        <div
          ref={dropRef}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={
            'relative min-h-[360px] rounded-2xl border-2 border-dashed grid place-items-center text-center p-6 ' +
            (dragging ? 'border-primary bg-primary/5' : '')
          }
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="glaze-file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {!file ? (
            <label htmlFor="glaze-file" className="cursor-pointer grid gap-1">
              <p className="font-medium">Upload your glaze image</p>
              <p className="text-xs text-muted-foreground">or drag it anywhere in this panel</p>
            </label>
          ) : (
            <div className="grid gap-3">
              <img src={URL.createObjectURL(file)} alt="preview" className="max-h-72 mx-auto rounded-lg border" />
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleAnalyze}
                  className="rounded-xl bg-primary text-primary-foreground px-4 py-2 font-medium disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Analyzing…' : 'Analyze Image'}
                </button>
                <button
                  onClick={() => { setFile(null); setResult(null); }}
                  className="rounded-xl border px-4 py-2"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {dragging && (
            <div className="absolute inset-0 grid place-items-center text-foreground/80 pointer-events-none">
              <div className="rounded-xl border bg-background/80 px-4 py-2 text-sm shadow">
                Drag it here
              </div>
            </div>
          )}
        </div>

        {/* Right: results */}
        <aside className="sticky top-16">
          <div className="rounded-xl border p-4 bg-card">
            <div className="text-sm font-medium mb-2">Predicted Recipe</div>
            {!result ? (
              <div className="text-sm text-muted-foreground">Upload an image to see results here.</div>
            ) : (
              <div className="grid gap-1 text-sm">
                <p><span className="font-medium">Recipe:</span> {result.recipe}</p>
                <p><span className="font-medium">Oxidation:</span> {result.oxidation}</p>
                <p><span className="font-medium">Atmosphere:</span> {result.atmosphere}</p>
                <p><span className="font-medium">Notes:</span> {result.notes}</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}