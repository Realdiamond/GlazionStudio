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
  const [showCaseWarning, setShowCaseWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter and sort materials based on input
  const filteredMaterials = useMemo(() => {
    // Show first 100 materials alphabetically when empty
    if (!inputValue.trim()) {
      return [...materials]
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 100);
    }
    
    const searchLower = inputValue.toLowerCase().trim();
    
    // Find ALL materials that contain the search term
    const matches = materials.filter(m => 
      m.name.toLowerCase().includes(searchLower)
    );
    
    // Sort by: starts-with first, then alphabetically within each group
    matches.sort((a, b) => {
      const aLower = a.name.toLowerCase();
      const bLower = b.name.toLowerCase();
      const aStarts = aLower.startsWith(searchLower);
      const bStarts = bLower.startsWith(searchLower);
      
      // If one starts with search and other doesn't, prioritize the one that starts
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      // Both start with search OR both don't start with search
      // Sort alphabetically
      return a.name.localeCompare(b.name);
    });
    
    return matches;
  }, [materials, inputValue]);

  // Check if input matches exactly (case-insensitive)
  const exactMatch = useMemo(() => {
    const inputLower = inputValue.toLowerCase().trim();
    return materials.find(m => m.name.toLowerCase() === inputLower);
  }, [materials, inputValue]);

  // Check if value is valid (exact match in database)
  const isValidSelection = materials.some(m => m.name === value);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
    setShowCaseWarning(false);
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
    setIsOpen(true); // Always keep dropdown open while typing
    setHighlightedIndex(0); // Reset to first item
    
    // Check if there's an exact match (case-insensitive)
    const inputLower = newValue.toLowerCase().trim();
    const match = materials.find(m => m.name.toLowerCase() === inputLower);
    
    if (match) {
      // If exact match found but different case, show warning
      if (match.name !== newValue) {
        setShowCaseWarning(true);
        onChange(''); // Don't set value yet - let user pick from dropdown
      } else {
        // Perfect match - set the value
        onChange(match.name);
        setShowCaseWarning(false);
      }
    } else {
      // No exact match - clear warning and let user continue typing
      setShowCaseWarning(false);
      // Clear parent selection since input doesn't match anymore
      if (value !== '' && newValue !== value) {
        onChange('');
      }
    }
  };

  const handleSelectMaterial = (materialName: string) => {
    setInputValue(materialName);
    onChange(materialName);
    setIsOpen(false);
    setShowCaseWarning(false);
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
          inputValue && !isValidSelection && !showCaseWarning ? 'border-red-500' : ''
        } ${
          showCaseWarning ? 'border-amber-500' : ''
        }`}
        autoComplete="off"
      />

      {/* Validation indicator - Green checkmark for exact match */}
      {inputValue && isValidSelection && (
        <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
      )}

      {/* Case warning - when typed correctly but wrong case */}
      {showCaseWarning && exactMatch && (
        <div className="absolute left-0 right-0 top-full mt-1 z-40 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
          ⚠️ Please choose "{exactMatch.name}" from the dropdown
        </div>
      )}

      {/* Dropdown - Show ALL matching results */}
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
                ${material.name === value ? 'font-medium bg-green-50' : ''}
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