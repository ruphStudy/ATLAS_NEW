import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketplaceCapability, MarketplaceProviderMetadata } from '@/types';

const ALL_CAPABILITIES: MarketplaceCapability[] = [
  'PUBLISH_LISTING',
  'UPDATE_LISTING',
  'DELETE_LISTING',
  'GET_LISTING',
  'SEARCH_LISTINGS',
  'BULK_LISTING',
  'SYNC_INVENTORY',
  'UPDATE_INVENTORY',
  'GET_INVENTORY',
  'SYNC_ORDERS',
  'GET_ORDER',
  'UPDATE_ORDER',
  'CANCEL_ORDER',
  'SYNC_SHIPMENTS',
  'CREATE_SHIPMENT',
  'GET_SHIPMENT',
  'TRACK_SHIPMENT',
];

/** Renders every known capability against what this specific provider actually declares as supported — unsupported ones are shown greyed out rather than hidden, so gaps are visible rather than silently dropped. */
export function CapabilityMatrix({ provider }: { provider: MarketplaceProviderMetadata }) {
  const supported = new Set(provider.supportedCapabilities);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {ALL_CAPABILITIES.map((cap) => {
        const isSupported = supported.has(cap);
        return (
          <div
            key={cap}
            className={cn(
              'flex items-center gap-2 rounded-[var(--radius)] border px-2.5 py-1.5 text-xs',
              isSupported ? 'border-success/20 bg-success/5 text-foreground' : 'border-border bg-muted/30 text-muted-foreground',
            )}
          >
            {isSupported ? <Check className="h-3.5 w-3.5 shrink-0 text-success" /> : <X className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            <span className="truncate">{cap.toLowerCase().replace(/_/g, ' ')}</span>
          </div>
        );
      })}
    </div>
  );
}
