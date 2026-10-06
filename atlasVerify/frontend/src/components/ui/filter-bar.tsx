'use client';

import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { Button } from './button';

interface FilterBarProps {
  /** Omit together with `onSearchChange` for modules whose backend list endpoint has no full-text `search` param — the search box is hidden rather than rendered as a no-op. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  children?: React.ReactNode;
  className?: string;
}

/** Generic search + filter-controls row — pass module-specific `<Select>`s etc as `children`. */
export function FilterBar({ searchValue, onSearchChange, searchPlaceholder = 'Search…', hasActiveFilters, onClearFilters, children, className }: FilterBarProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center', className)}>
      {onSearchChange && (
        <Input
          value={searchValue ?? ''}
          onChange={(e) => onSearchChange(e.target.value)}
          icon={<Search className="h-4 w-4" />}
          rightElement={
            searchValue ? (
              <button onClick={() => onSearchChange('')} aria-label="Clear search" className="pointer-events-auto text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            ) : undefined
          }
          placeholder={searchPlaceholder}
          className="sm:max-w-xs"
        />
      )}

      {children}

      {hasActiveFilters && onClearFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <X className="h-3.5 w-3.5" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
