import React from 'react';

export type RecipeItem = { material: string; amount: number | ''; unit?: string };

type Props = {
  title: string;
  items: RecipeItem[];
  onChange: (items: RecipeItem[]) => void;
};

const UNITS = ['%', 'parts', 'g'];

export default function RecipeList({ title, items, onChange }: Props) {
  function update(idx: number, patch: Partial<RecipeItem>) {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange(next);
  }
  
  function add() {
    onChange([...items, { material: '', amount: '', unit: '%' }]);
  }
  
  function remove(idx: number) {
    const next = items.filter((_, i) => i != idx);
    onChange(next);
  }

  // Determine if remove button should be shown
  function shouldShowRemove(index: number): boolean {
    // For Base Recipe: don't show remove on first item if it's the only one
    if (title === "Base Recipe" && index === 0 && items.length === 1) {
      return false;
    }
    // For all other cases (additives, or base recipe with multiple items): show remove
    return true;
  }

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <button type="button" onClick={add} className="text-sm px-3 py-1 rounded-lg border hover:bg-muted">
          Add row
        </button>
      </div>
      <div className="grid gap-2">
        {items.map((it, idx) => (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_140px_120px_auto] gap-2">
            <input
              className="rounded-lg border bg-background p-2"
              placeholder="Material (e.g., Feldspar)"
              value={it.material}
              onChange={(e) => update(idx, { material: e.target.value })}
              required
            />
            <input
              className="rounded-lg border bg-background p-2"
              placeholder="Amount"
              type="number"
              step="0.01"
              value={it.amount}
              onChange={(e) => update(idx, { amount: e.target.value === '' ? '' : parseFloat(e.target.value) })}
              required
            />
            <select
              className="rounded-lg border bg-background p-2"
              value={it.unit ?? '%'}
              onChange={(e) => update(idx, { unit: e.target.value })}
            >
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            
            {/* Conditionally show/hide Remove button while maintaining layout */}
            <button 
              type="button" 
              onClick={() => remove(idx)} 
              className={`px-3 py-2 rounded-lg border hover:bg-muted ${
                shouldShowRemove(idx) ? '' : 'invisible'
              }`}
              disabled={!shouldShowRemove(idx)}
            >
              Remove
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground">No items yet. Click "Add row".</p>
        )}
      </div>
    </section>
  );
}