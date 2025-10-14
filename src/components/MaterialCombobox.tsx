import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Material {
  name: string;
  oxideAnalysis?: Record<string, number>;
  loi?: number;
}

interface MaterialComboboxProps {
  materials: Material[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MaterialCombobox({ 
  materials, 
  value, 
  onChange,
  placeholder = "Search material..."
}: MaterialComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Filter materials based on search (case-insensitive, efficient)
  const filteredMaterials = useMemo(() => {
    if (!search.trim()) {
      return materials.slice(0, 100); // Show first 100 when no search
    }
    
    const searchLower = search.toLowerCase().trim();
    const matches = materials.filter(m => 
      m.name.toLowerCase().includes(searchLower)
    );
    
    return matches.slice(0, 100); // Limit to 100 results for performance
  }, [materials, search]);

  const displayValue = value || placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Type to search materials..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              No material found.
              {search.length > 0 && (
                <div className="text-xs text-muted-foreground mt-2">
                  Try a different search term
                </div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredMaterials.map((material) => (
                <CommandItem
                  key={material.name}
                  value={material.name}
                  onSelect={(currentValue) => {
                    onChange(currentValue);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === material.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {material.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}