import React from 'react';
import { MaterialAutocomplete } from './MaterialAutocomplete';
import { Trash2 } from 'lucide-react';

export type RecipeItem = { material: string; amount: number | string | ''; };

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
  isAdditive?: boolean;
};

export default function RecipeList({ title, items, onChange, materials, isAdditive = false }: Props) {
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
    if (!isAdditive && index === 0 && items.length === 1) {
      return false;
    }
    return true;
  }

  function handleAmountChange(idx: number, value: string) {
    if (value === '') {
      update(idx, { amount: '' });
      return;
    }
    
    if (/^\d*\.?\d*$/.test(value)) {
      update(idx, { amount: value });
    }
  }

  function handleAmountBlur(idx: number, currentValue: number | string | '') {
    if (currentValue === '' || currentValue === 0) return;
    
    const str = String(currentValue);
    const num = parseFloat(str);
    
    if (!isNaN(num) && num !== currentValue) {
      update(idx, { amount: num });
    }
  }

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{title}</h3>
        {isAdditive && (
          <span className="text-sm text-muted-foreground">Added as % over base</span>
        )}
      </div>

      <div className="grid gap-2">
        {items.map((it, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
            
            <MaterialAutocomplete
              materials={materials}
              value={it.material}
              onChange={(value) => update(idx, { material: value })}
              placeholder="Type to search materials..."
            />

            <input
              className="rounded-lg border bg-background p-2 w-28"
              placeholder="Amount"
              inputMode="decimal"
              type="text"
              value={it.amount === '' ? '' : String(it.amount)}
              onChange={(e) => handleAmountChange(idx, e.target.value)}
              onBlur={() => handleAmountBlur(idx, it.amount)}
              min="0"
              step="0.01"
              required
            />

            {shouldShowRemove(idx) ? (
              <button
                type="button"
                onClick={() => remove(idx)}
                className="p-2 rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors"
                aria-label="Delete material"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            ) : (
              <div className="w-9" />
            )}
          </div>
        ))}

        {items.length === 0 && !isAdditive && (
          <p className="text-xs text-muted-foreground">No materials yet. Click "Add Base Material" below.</p>
        )}
      </div>

      <button
        type="button"
        onClick={add}
        className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg border hover:bg-muted transition-colors text-sm font-medium"
      >
        <span className="text-lg">+</span>
        {isAdditive ? 'Add Colorant' : 'Add Base Material'}
      </button>
    </section>
  );
}