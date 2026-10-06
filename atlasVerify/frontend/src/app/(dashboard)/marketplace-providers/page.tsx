'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { CapabilityMatrix } from '@/components/marketplace/capability-matrix';
import { useDisableMarketplaceProvider, useEnableMarketplaceProvider, useMarketplaceProviders } from '@/hooks';

export default function MarketplaceProvidersPage() {
  const { data: providers, isLoading, isError, error, refetch } = useMarketplaceProviders();
  const enableProvider = useEnableMarketplaceProvider();
  const disableProvider = useDisableMarketplaceProvider();
  const [expanded, setExpanded] = useState<string | null>(null);

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <PageHeader title="Marketplace Providers" description="Registered integration providers, their capabilities, and workspace enablement." />

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load providers." />
      ) : isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !providers || providers.length === 0 ? (
        <EmptyState title="No providers registered" description="No marketplace integration providers are registered in this workspace." />
      ) : (
        <div className="space-y-4">
          {providers.map((provider) => {
            const isBusy = (enableProvider.isPending || disableProvider.isPending) && enableProvider.variables === provider.providerKey;
            return (
              <Card key={provider.providerKey}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {provider.displayName}
                        <Badge variant={provider.isActive ? 'success' : 'secondary'}>{provider.isActive ? 'Active' : 'Inactive'}</Badge>
                        {!provider.isRegistered && <Badge variant="warning">Not registered</Badge>}
                      </CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">{provider.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {provider.isActive ? (
                        <Button variant="outline" size="sm" onClick={() => disableProvider.mutate(provider.providerKey)} disabled={isBusy}>
                          {isBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          Disable
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => enableProvider.mutate(provider.providerKey)} disabled={isBusy}>
                          {isBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          Enable
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === provider.providerKey ? null : provider.providerKey)}>
                        {expanded === provider.providerKey ? 'Hide capabilities' : 'View capabilities'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
                  <Field label="Version" value={provider.version} />
                  <Field label="Supported countries" value={provider.supportedCountries.length ? provider.supportedCountries.join(', ') : 'All'} />
                  <Field label="Supported marketplaces" value={provider.supportedMarketplaces.join(', ') || '—'} />
                </CardContent>
                {expanded === provider.providerKey && (
                  <CardContent>
                    <CapabilityMatrix provider={provider} />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{value}</p>
    </div>
  );
}
