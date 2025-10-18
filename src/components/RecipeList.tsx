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
    // Allow empty string
    if (value === '') {
      update(idx, { amount: '' });
      return;
    }
    
    // Only allow valid number patterns (digits and single decimal point)
    // Allow: "1", "1.", "1.5", ".5", "10.25", "10.0", "10.05"
    if (/^\d*\.?\d*$/.test(value)) {
      // Keep as string while typing to preserve "10.0" format
      // Only convert to number when complete and doesn't end with trailing zeros after decimal
      update(idx, { amount: value });
    }
  }

  // Handle blur: convert valid string to number
  function handleAmountBlur(idx: number, currentValue: number | string | '') {
    if (currentValue === '' || currentValue === 0) return;
    
    const str = String(currentValue);
    const num = parseFloat(str);
    
    // Convert to number on blur if valid
    if (!isNaN(num) && num !== currentValue) {
      update(idx, { amount: num });
    }
  }

  // Calculate total percentage
  const total = items.reduce((sum, item) => {
    const amount = item.amount === '' || item.amount == null 
      ? 0 
      : typeof item.amount === 'number' 
        ? item.amount 
        : parseFloat(item.amount) || 0;
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
                      const normalized = items.map(item => {
                        const currentAmount = item.amount === '' || item.amount == null 
                          ? 0 
                          : typeof item.amount === 'number' 
                            ? item.amount 
                            : parseFloat(item.amount) || 0;
                        
                        return {
                          ...item,
                          amount: currentAmount > 0 
                            ? parseFloat(((currentAmount / total) * 100).toFixed(2))
                            : item.amount
                        };
                      });
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