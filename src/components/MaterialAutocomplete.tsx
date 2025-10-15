import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Check } from "lucide-react";

interface Material {
  name: string;
  oxideAnalysis?: Record<string, number>;
  loi?: number;
}

interface MaterialAutocompleteProps {
  materials: Material[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MaterialAutocomplete({ 
  materials, 
  value, 
  onChange,
  placeholder = "Type to search materials..."
}: MaterialAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter materials based on input
  const filteredMaterials = useMemo(() => {
    if (!inputValue.trim()) {
      return materials.slice(0, 100);
    }
    
    const searchLower = inputValue.toLowerCase().trim();
    const matches = materials.filter(m => 
      m.name.toLowerCase().includes(searchLower)
    );
    
    return matches.slice(0, 100);
  }, [materials, inputValue]);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    setHighlightedIndex(0);
    
    // Only update parent if exact match exists
    const exactMatch = materials.find(m => m.name === newValue);
    if (exactMatch) {
      onChange(newValue);
    } else if (value !== '') {
      onChange(''); // Clear parent if no exact match
    }
  };

  const handleSelectMaterial = (materialName: string) => {
    setInputValue(materialName);
    onChange(materialName);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredMaterials.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredMaterials[highlightedIndex]) {
          handleSelectMaterial(filteredMaterials[highlightedIndex].name);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const isValidSelection = materials.some(m => m.name === value);

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full rounded-lg border px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary ${
          inputValue && !isValidSelection ? 'border-red-500' : ''
        }`}
        autoComplete="off"
      />

      {/* Validation indicator */}
      {inputValue && isValidSelection && (
        <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
      )}

      {/* Dropdown */}
      {isOpen && filteredMaterials.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-md border bg-popover shadow-md"
        >
          {filteredMaterials.map((material, index) => (
            <div
              key={material.name}
              onClick={() => handleSelectMaterial(material.name)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`
                px-3 py-2 cursor-pointer text-sm
                ${index === highlightedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}
                ${material.name === value ? 'font-medium' : ''}
              `}
            >
              {material.name}
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {isOpen && inputValue && filteredMaterials.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md p-3 text-center text-sm text-muted-foreground"
        >
          No materials found
        </div>
      )}
    </div>
  );
}