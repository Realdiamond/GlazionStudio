import React from 'react';
import { MaterialAutocomplete } from './MaterialAutocomplete';

export type RecipeItem = { material: string; amount: number | ''; };

interface Material {
  name: string;
  oxideAnalysis?: Record<string, number>;
  loi?: number;
}

type Props = {
  title: string;
  items: RecipeItem[];
  onChange: (items: RecipeItem[]) => void;
  materials: Material[];
};

export default function RecipeList({ title, items, onChange, materials }: Props) {
  function update(idx: number, patch: Partial<RecipeItem>) {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange(next);
  }
  
  function add() {
    onChange([...items, { material: '', amount: '' }]);
  }
  
  function remove(idx: number) {
    const next = items.filter((_, i) => i !== idx);
    onChange(next);
  }

  function shouldShowRemove(index: number): boolean {
    if (title === "Base Recipe" && index === 0 && items.length === 1) {
      return false;
    }
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
            {/* Material autocomplete input */}
            <MaterialAutocomplete
              materials={materials}
              value={it.material}
              onChange={(value) => update(idx, { material: value })}
              placeholder="Type to search materials..."
            />

            {/* Amount */}
            <input
              className="rounded-lg border bg-background p-2"
              placeholder="Amount"
              inputMode="decimal"
              type="text"
              value={it.amount === '' ? '' : String(it.amount)}
              onChange={(e) =>
                update(idx, {
                  amount: e.target.value.trim() === '' ? '' : Number(e.target.value)
                })
              }
              required
            />

            {/* % display */}
            <div className="rounded-lg border bg-background p-2 flex items-center justify-center text-muted-foreground">
              %
            </div>

            {/* Remove button */}
            <button
              type="button"
              onClick={() => remove(idx)}
              className={`px-3 py-2 rounded-lg border hover:bg-muted ${shouldShowRemove(idx) ? "" : "invisible"}`}
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