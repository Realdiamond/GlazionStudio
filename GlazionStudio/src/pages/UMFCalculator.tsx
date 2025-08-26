import React, { useState } from 'react';

type Oxide = { name: string; group: 'Flux' | 'Intermediate' | 'Former'; amount: number; };

const DEFAULTS: Oxide[] = [
  { name: 'Na2O', group: 'Flux', amount: 0 },
  { name: 'K2O', group: 'Flux', amount: 0 },
  { name: 'CaO', group: 'Flux', amount: 0 },
  { name: 'MgO', group: 'Flux', amount: 0 },
  { name: 'Al2O3', group: 'Intermediate', amount: 0 },
  { name: 'B2O3', group: 'Intermediate', amount: 0 },
  { name: 'SiO2', group: 'Former', amount: 0 },
];

export default function UMFCalculator() {
  const [oxides, setOxides] = useState<Oxide[]>(DEFAULTS);

  function update(i: number, amount: number) {
    setOxides(prev => prev.map((o, idx) => idx === i ? { ...o, amount } : o));
  }

  const totalFlux = oxides
    .filter(o => o.group === 'Flux')
    .reduce((s, o) => s + (o.amount || 0), 0) || 1;

  const normalized = oxides.map(o => ({
    ...o,
    umf: o.group === 'Flux' ? (o.amount || 0) / totalFlux : (o.amount || 0),
  }));

  const sio2 = normalized.find(o => o.name === 'SiO2')?.umf ?? 0;
  const al2o3 = normalized.find(o => o.name === 'Al2O3')?.umf ?? 0;
  const ratio = al2o3 ? (sio2 / al2o3) : 0;
  const warn = ratio && (ratio < 5 || ratio > 12);

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto max-w-5xl px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">UMF Calculator</h1>
          <p className="text-muted-foreground text-sm">Enter oxide molar amounts. Fluxes normalize to unity.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-300">
          {(['Flux','Intermediate','Former'] as const).map(group => (
            <section key={group} className="bg-card rounded-xl border border-border p-6 shadow-subtle">
              <h2 className="font-semibold text-foreground mb-4 text-lg">{group}s</h2>
              <div className="space-y-3">
                {oxides.map((o, i) => (
                  o.group === group && (
                    <label key={o.name} className="flex items-center justify-between gap-3" title={
                      o.name === 'Na2O' ? 'Common flux from soda feldspar' :
                      o.name === 'B2O3' ? 'Lowers melting temp; boron source' :
                      o.name === 'SiO2' ? 'Glass former (silica)' :
                      undefined
                    }>
                      <span className="text-sm font-medium text-foreground min-w-[60px]">{o.name}</span>
                      <input
                        type="number"
                        step="0.01"
                        className="w-24 rounded-lg border border-input bg-input px-3 py-2 text-sm text-right focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all"
                        value={o.amount}
                        onChange={(e) => update(i, parseFloat(e.target.value || '0'))}
                      />
                    </label>
                  )
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-6 bg-card rounded-xl border border-border p-6 shadow-subtle">
          <h2 className="font-semibold text-foreground mb-4 text-lg">Normalized (preview)</h2>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            {normalized.map(o => (
              <div key={o.name} className="flex justify-between items-center py-1 px-2 rounded bg-muted/50">
                <span className="text-sm font-medium text-foreground">{o.name}:</span>
                <span className="text-sm text-muted-foreground font-mono">{o.umf.toFixed(3)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-accent/30 rounded-lg border border-accent">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-foreground">SiO₂:Al₂O₃ ratio:</span> 
              <span className="font-mono text-primary">{ratio ? ratio.toFixed(2) : '—'}</span>
            </div>
            {warn && (
              <p className="mt-2 text-xs text-warning">
                ⚠️ Check typical ranges (5–12) for many stoneware glazes.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}