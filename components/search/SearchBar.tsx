'use client';

import { forwardRef } from 'react';
import { Camera, Search as SearchIcon, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onScanTap: () => void;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  { value, onChange, onScanTap },
  ref
) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
      <input
        ref={ref}
        type="text"
        inputMode="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name or scan barcode"
        className="h-tap w-full rounded-xl border border-elevated bg-surface pl-11 pr-24 text-base text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {value && (
          <button
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted active:bg-elevated"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onScanTap}
          aria-label="Scan barcode"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary active:bg-primary/25"
        >
          <Camera className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
});
