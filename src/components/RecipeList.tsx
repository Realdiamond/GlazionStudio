import React from 'react';
import {
  Select, SelectTrigger, SelectContent, SelectGroup,
  SelectItem, SelectLabel, SelectSeparator, SelectValue
} from "@/components/ui/select";
import { MATERIAL_GROUPS as groups } from "@/data/materials";



export type RecipeItem = { material: string; amount: number | ''; };

type Props = {
  title: string;
  items: RecipeItem[];
  onChange: (items: RecipeItem[]) => void;
};

export default function RecipeList({ title, items, onChange }: Props) {
  function update(idx: number, patch: Partial<RecipeItem>) {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange(next);
  }
  
  function add() {
    onChange([...items, { material: '', amount: '' }]);
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
        <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_120px_auto] gap-2 px-1 mb-1 text-xs text-muted-foreground">
          <div>Material</div>
          <div>Amount</div>
          <div>%</div>
          <div></div>
        </div>

        {items.map((it, idx) => (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_140px_120px_auto] gap-2">
            {/* Material dropdown (no repeating label) */}
            <div className="grid gap-2">
              <Select
                value={it.material || ""}
                onValueChange={(value) => update(idx, { material: value })}
              >
                <SelectTrigger className="rounded-lg border bg-background p-2" aria-label="Material">
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Frits</SelectLabel>
                    {groups.frit.map(m => <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}
                    <SelectSeparator />
                    <SelectLabel>Raw Materials</SelectLabel>
                    {groups.raw.map(m => <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}
                    <SelectSeparator />
                    <SelectLabel>Opacifiers</SelectLabel>
                    {groups.opacifier.map(m => <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}
                    <SelectSeparator />
                    <SelectLabel>Colorants</SelectLabel>
                    {groups.colorant.map(m => <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}
                    <SelectSeparator />
                    <SelectLabel>Additives</SelectLabel>
                    {groups.additive.map(m => <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <input
              className="rounded-lg border bg-background p-2"
              placeholder="Amount"
              inputMode="decimal"
              type="text"             // or keep type="number" if you prefer
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

            {/* Remove button (your logic) */}
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