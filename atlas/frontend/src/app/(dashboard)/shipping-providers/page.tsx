'use client';

import { Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import {
  useCachedShippingProviderHealth,
  useCheckAllShippingProviderHealth,
  useCheckShippingProviderHealth,
  useShippingProviders,
} from '@/hooks';
import { formatDate } from '@/lib/utils';

const HEALTH_TONE: Record<string, StatusTone> = { HEALTHY: 'success', DEGRADED: 'warning', UNHEALTHY: 'danger', UNKNOWN: 'neutral' };

export default function ShippingProvidersPage() {
  const { data: providers, isLoading, isError, refetch } = useShippingProviders();
  const { data: health } = useCachedShippingProviderHealth();
  const checkAll = useCheckAllShippingProviderHealth();
  const checkOne = useCheckShippingProviderHealth();

  const healthByKey = new Map((health ?? []).map((h) => [h.providerKey, h]));

  return (
    <div>
      <PageHeader
        title="Shipping & Courier Providers"
        description="Registered shipping/courier providers, service levels, regions, capabilities and connection health."
        actions={
          <Button variant="outline" onClick={() => checkAll.mutate()} disabled={checkAll.isPending}>
            {checkAll.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Check all health
          </Button>
        }
      />

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load shipping providers." />
      ) : isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !providers || providers.length === 0 ? (
        <EmptyState title="No shipping providers registered" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => {
            const h = healthByKey.get(p.providerKey);
            const isChecking = checkOne.isPending && checkOne.variables === p.providerKey;
            return (
              <Card key={p.providerKey}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span>{p.displayName}</span>
                    {h && <StatusBadge status={h.status} tone={HEALTH_TONE[h.status]} />}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>{p.description}</p>
                  <p>v{p.version} · rate limit {p.rateLimitPerMinute}/min · {p.requiresCredentials ? 'requires credentials' : 'no credentials required'}</p>
                  {p.serviceLevels.length > 0 && <p>Service levels: {p.serviceLevels.join(', ')}</p>}
                  {p.supportedRegions.length > 0 && <p>Regions: {p.supportedRegions.map((r) => r.displayName).join(', ')}</p>}
                  {p.supportedCountries.length > 0 && <p>Countries: {p.supportedCountries.join(', ')}</p>}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {p.capabilities.map((c) => (
                      <Badge key={c} variant="secondary" className="text-[10px]">
                        {c.toLowerCase().replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                  {h && <p className="text-xs">Last checked {formatDate(h.checkedAt)}{h.latencyMs != null ? ` · ${h.latencyMs}ms` : ''}{h.message ? ` · ${h.message}` : ''}</p>}
                  <Button size="sm" variant="outline" onClick={() => checkOne.mutate(p.providerKey)} disabled={isChecking}>
                    {isChecking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Check health
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
