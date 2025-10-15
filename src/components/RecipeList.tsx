import React from 'react';
import { MaterialAutocomplete } from './MaterialAutocomplete';
import { Trash2 } from 'lucide-react';

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
  isAdditive?: boolean; // to distinguish between base and additives
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
    // Base recipe: don't show delete for the first (and only) item if it's the only one
    if (!isAdditive && index === 0 && items.length === 1) {
      return false;
    }
    return true;
  }

  function handleAmountChange(idx: number, value: string) {
    const trimmed = value.trim();
    
    // Allow empty string
    if (trimmed === '') {
      update(idx, { amount: '' });
      return;
    }
    
    // Allow valid decimal patterns (including partial entries like "1." or ".5")
    if (/^-?\d*\.?\d*$/.test(trimmed)) {
      const num = parseFloat(trimmed);
      if (!isNaN(num)) {
        update(idx, { amount: num });
      } else if (trimmed === '.' || trimmed === '-' || trimmed.endsWith('.')) {
        // Allow partial decimal entries
        update(idx, { amount: trimmed as any });
      }
    }
  }

  // Calculate total percentage
  const total = items.reduce((sum, item) => {
    const amount = typeof item.amount === 'number' ? item.amount : 0;
    return sum + amount;
  }, 0);

  const isOverTotal = total > 100;
  const totalColor = isOverTotal ? 'text-red-600 bg-red-50' : 'text-gray-700';

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{title}</h3>
        <div className="flex items-center gap-3">
          {!isAdditive && (
            <>
              <span className={`text-sm font-medium px-3 py-1 rounded-lg ${totalColor}`}>
                {total.toFixed(1)}%
              </span>
              {isOverTotal && (
                <button
                  type="button"
                  onClick={() => {
                    // Retotal to 100: normalize all amounts proportionally
                    if (total > 0) {
                      const normalized = items.map(item => ({
                        ...item,
                        amount: typeof item.amount === 'number' 
                          ? parseFloat(((item.amount / total) * 100).toFixed(2))
                          : item.amount
                      }));
                      onChange(normalized);
                    }
                  }}
                  className="text-sm px-3 py-1 rounded-lg border hover:bg-muted"
                >
                  Retotal to 100
                </button>
              )}
            </>
          )}
          {isAdditive && (
            <span className="text-sm text-muted-foreground">Added as % over base</span>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        {items.map((it, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
            {/* Material autocomplete input */}
            <MaterialAutocomplete
              materials={materials}
              value={it.material}
              onChange={(value) => update(idx, { material: value })}
              placeholder="Type to search materials..."
            />

            {/* Amount - supports decimals */}
            <input
              className="rounded-lg border bg-background p-2 w-28"
              placeholder="Amount"
              inputMode="decimal"
              type="text"
              value={it.amount === '' ? '' : String(it.amount)}
              onChange={(e) => handleAmountChange(idx, e.target.value)}
              required
            />

            {/* Delete icon button */}
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
              <div className="w-9" /> // Spacer to maintain layout
            )}
          </div>
        ))}

        {items.length === 0 && !isAdditive && (
          <p className="text-xs text-muted-foreground">No materials yet. Click "Add Base Material" below.</p>
        )}
      </div>

      {/* Add button at the bottom */}
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