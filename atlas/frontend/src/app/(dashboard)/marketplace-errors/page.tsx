'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useMarketplaceErrorOccurrences,
  useMarketplaceErrorSearch,
  useMarketplaceErrorsByCategory,
  useMarketplaceErrorsBySeverity,
  useResolveMarketplaceError,
  useTopMarketplaceErrors,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { MarketplaceErrorCategory, MarketplaceErrorHistoryEntry, MarketplaceErrorSeverity } from '@/types';

const ERROR_CATEGORIES: MarketplaceErrorCategory[] = ['PROVIDER', 'API', 'AUTHENTICATION', 'AUTHORIZATION', 'VALIDATION', 'NETWORK', 'TIMEOUT', 'RATE_LIMIT', 'QUEUE', 'BUSINESS', 'SYSTEM', 'UNKNOWN'];
const ERROR_SEVERITIES: MarketplaceErrorSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const SEVERITY_TONE: Record<MarketplaceErrorSeverity, StatusTone> = { LOW: 'neutral', MEDIUM: 'warning', HIGH: 'danger', CRITICAL: 'danger' };

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

export default function MarketplaceErrorsPage() {
  return (
    <div>
      <PageHeader title="Marketplace Error Center" description="Normalized error taxonomy across auth, validation, timeout, network, rate-limit, capability, provider and business errors." />
      <Tabs defaultValue="search">
        <TabsList>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="top">Top Errors</TabsTrigger>
          <TabsTrigger value="aggregates">Aggregates</TabsTrigger>
        </TabsList>
        <TabsContent value="search">
          <SearchTab />
        </TabsContent>
        <TabsContent value="top">
          <TopErrorsTab />
        </TabsContent>
        <TabsContent value="aggregates">
          <AggregatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SearchTab() {
  const [provider, setProvider] = useState('');
  const [accountId, setAccountId] = useState('');
  const [module, setModule] = useState('');
  const [category, setCategory] = useState<MarketplaceErrorCategory | ''>('');
  const [severity, setSeverity] = useState<MarketplaceErrorSeverity | ''>('');
  const [isResolved, setIsResolved] = useState<'true' | 'false' | ''>('false');
  const [selected, setSelected] = useState<MarketplaceErrorHistoryEntry | null>(null);

  const { data: errors, isLoading, isError, refetch } = useMarketplaceErrorSearch({
    provider: provider || undefined,
    accountId: accountId || undefined,
    module: module || undefined,
    category: category || undefined,
    severity: severity || undefined,
    isResolved: isResolved === '' ? undefined : isResolved === 'true',
    limit: 100,
  });
  const resolve = useResolveMarketplaceError();

  return (
    <div>
      <FilterBar
        hasActiveFilters={!!provider || !!accountId || !!module || !!category || !!severity}
        onClearFilters={() => { setProvider(''); setAccountId(''); setModule(''); setCategory(''); setSeverity(''); }}
        className="mb-4"
      >
        <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Provider" className="h-9 w-32" />
        <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="Account ID" className="h-9 w-32" />
        <Input value={module} onChange={(e) => setModule(e.target.value)} placeholder="Module" className="h-9 w-32" />
        <Select value={category} onChange={(e) => setCategory(e.target.value as MarketplaceErrorCategory | '')} placeholder="All categories" options={ERROR_CATEGORIES.map((c) => ({ value: c, label: c }))} className="h-9 w-40" />
        <Select value={severity} onChange={(e) => setSeverity(e.target.value as MarketplaceErrorSeverity | '')} placeholder="All severities" options={ERROR_SEVERITIES.map((s) => ({ value: s, label: s }))} className="h-9 w-36" />
        <Select value={isResolved} onChange={(e) => setIsResolved(e.target.value as 'true' | 'false' | '')} options={[{ value: '', label: 'All' }, { value: 'false', label: 'Unresolved' }, { value: 'true', label: 'Resolved' }]} className="h-9 w-36" />
      </FilterBar>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load errors." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !errors || errors.length === 0 ? (
        <EmptyState title="No errors found" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Category / Severity</TableHead>
              <TableHead>Provider / Module</TableHead>
              <TableHead>Occurrences</TableHead>
              <TableHead>Last seen</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {errors.map((err) => (
              <TableRow key={err.id} clickable onClick={() => setSelected(err)}>
                <TableCell className="text-sm font-medium text-foreground">{err.errorCode}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">{err.errorCategory}</Badge>
                    <StatusBadge status={err.errorSeverity} tone={SEVERITY_TONE[err.errorSeverity]} />
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{err.provider}{err.module ? ` · ${err.module}` : ''}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{err.occurrenceCount}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(err.lastOccurredAt)}</TableCell>
                <TableCell>
                  <StatusBadge status={err.isResolved ? 'RESOLVED' : 'UNRESOLVED'} tone={err.isResolved ? 'success' : 'warning'} />
                </TableCell>
                <TableCell className="text-right">
                  {!err.isResolved && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Resolve"
                      onClick={(e) => { e.stopPropagation(); resolve.mutate(err.id); }}
                      disabled={resolve.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ErrorDetailDialog error={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function ErrorDetailDialog({ error, onClose }: { error: MarketplaceErrorHistoryEntry | null; onClose: () => void }) {
  const { data: occurrences } = useMarketplaceErrorOccurrences(error?.id, 20);

  if (!error) return null;

  return (
    <Dialog open={!!error} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{error.errorCode}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-foreground">{error.errorMessage}</p>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <Field label="Category" value={error.errorCategory} />
            <Field label="Severity" value={error.errorSeverity} />
            <Field label="Provider" value={error.provider} />
            <Field label="Module" value={error.module ?? '—'} />
            <Field label="Operation" value={error.operation ?? '—'} />
            <Field label="HTTP status" value={error.httpStatus != null ? String(error.httpStatus) : '—'} />
            <Field label="Request ID" value={error.requestId ?? '—'} />
            <Field label="Resource ID" value={error.resourceId ?? '—'} />
            <Field label="Occurrences" value={String(error.occurrenceCount)} />
            <Field label="First seen" value={formatDate(error.firstOccurredAt)} />
            <Field label="Last seen" value={formatDate(error.lastOccurredAt)} />
          </div>
          {error.providerMessage && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Provider message</p>
              <p className="text-sm text-muted-foreground">{error.providerMessage}</p>
            </div>
          )}
          {occurrences && occurrences.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent occurrences</p>
              <ul className="space-y-1">
                {occurrences.map((o, i) => (
                  <li key={i} className="text-xs text-muted-foreground">{formatDate(o.timestamp)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TopErrorsTab() {
  const [{ startDate, endDate }, setRange] = useState(defaultDateRange());
  const { data: errors, isLoading } = useTopMarketplaceErrors(20, startDate, endDate);

  return (
    <div>
      <FilterBar className="mb-4">
        <Input type="date" value={startDate} onChange={(e) => setRange((r) => ({ ...r, startDate: e.target.value }))} className="h-9 w-40" />
        <Input type="date" value={endDate} onChange={(e) => setRange((r) => ({ ...r, endDate: e.target.value }))} className="h-9 w-40" />
      </FilterBar>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !errors || errors.length === 0 ? (
        <EmptyState title="No errors in this date range" />
      ) : (
        <div className="space-y-2">
          {errors.map((err) => (
            <div key={err.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-3 text-sm">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{err.errorCode}</span>
                  <Badge variant="secondary" className="text-[10px]">{err.errorCategory}</Badge>
                  <StatusBadge status={err.errorSeverity} tone={SEVERITY_TONE[err.errorSeverity]} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{err.errorMessage}</p>
              </div>
              <span className="text-lg font-semibold text-foreground">{err.occurrenceCount}×</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AggregatesTab() {
  const [{ startDate, endDate }, setRange] = useState(defaultDateRange());
  const { data: byCategory } = useMarketplaceErrorsByCategory(startDate, endDate);
  const { data: bySeverity } = useMarketplaceErrorsBySeverity(startDate, endDate);

  return (
    <div>
      <FilterBar className="mb-4">
        <Input type="date" value={startDate} onChange={(e) => setRange((r) => ({ ...r, startDate: e.target.value }))} className="h-9 w-40" />
        <Input type="date" value={endDate} onChange={(e) => setRange((r) => ({ ...r, endDate: e.target.value }))} className="h-9 w-40" />
      </FilterBar>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">By category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!byCategory || byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data for this range.</p>
            ) : (
              byCategory.map((c) => (
                <div key={c.category} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{c.category}</span>
                  <span className="text-muted-foreground">{c.count} error(s) · {c.occurrences} occurrence(s)</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">By severity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!bySeverity || bySeverity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data for this range.</p>
            ) : (
              bySeverity.map((s) => (
                <div key={s.severity} className="flex items-center justify-between text-sm">
                  <StatusBadge status={s.severity} tone={SEVERITY_TONE[s.severity]} />
                  <span className="text-muted-foreground">{s.count} error(s) · {s.occurrences} occurrence(s)</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  );
}
