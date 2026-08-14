'use client';

import { RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from '@/lib/utils';
import type { MarketplaceComparison } from '@/types';

export interface DashboardFilterState {
  startDate: string;
  endDate: string;
  marketplaceIds: string[];
  currency: string;
}

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'INR', label: 'INR' },
  { value: 'AUD', label: 'AUD' },
  { value: 'CAD', label: 'CAD' },
];

export function DashboardFilters({
  filters,
  onChange,
  marketplaceOptions,
  generatedAt,
  isFetching,
  onRefresh,
}: {
  filters: DashboardFilterState;
  onChange: (next: DashboardFilterState) => void;
  marketplaceOptions: MarketplaceComparison[];
  generatedAt?: string;
  isFetching?: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">From</label>
        <Input type="date" value={filters.startDate} onChange={(e) => onChange({ ...filters, startDate: e.target.value })} className="h-9 w-40" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">To</label>
        <Input type="date" value={filters.endDate} onChange={(e) => onChange({ ...filters, endDate: e.target.value })} className="h-9 w-40" />
      </div>

      {marketplaceOptions.length > 0 && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Marketplace</label>
          <Select
            value={filters.marketplaceIds[0] ?? ''}
            onChange={(e) => onChange({ ...filters, marketplaceIds: e.target.value ? [e.target.value] : [] })}
            placeholder="All marketplaces"
            options={marketplaceOptions.map((m) => ({ value: m.marketplaceId, label: m.marketplaceName }))}
            className="h-9 w-44"
          />
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Currency</label>
        <Select value={filters.currency} onChange={(e) => onChange({ ...filters, currency: e.target.value })} options={CURRENCY_OPTIONS} className="h-9 w-28" />
      </div>

      <div className="ml-auto flex items-center gap-3">
        {generatedAt && <span className="text-xs text-muted-foreground">Updated {formatDistanceToNow(generatedAt)}</span>}
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
}
