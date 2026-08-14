'use client';

import { useState } from 'react';
import { Loader2, X, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { KpiCard } from '@/components/ui/kpi-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useCancelMarketplaceEvent,
  useFailedMarketplaceEvents,
  useMarketplaceEventHistory,
  useMarketplaceEventMetrics,
  useMarketplaceEvents,
  usePendingMarketplaceEvents,
  useReprocessMarketplaceEvent,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { MarketplaceEventCategory, MarketplaceEventRecord, MarketplaceEventSource, MarketplaceEventStatus } from '@/types';

const EVENT_CATEGORIES: MarketplaceEventCategory[] = ['CATALOG', 'INVENTORY', 'LISTING', 'ORDER', 'SHIPMENT', 'RETURN', 'PRICING', 'PAYMENT', 'REPORT', 'ACCOUNT', 'DISPUTE', 'UNKNOWN'];
const EVENT_STATUSES: MarketplaceEventStatus[] = ['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'CANCELLED', 'DUPLICATE', 'STALE'];
const EVENT_SOURCES: MarketplaceEventSource[] = ['WEBHOOK', 'POLLING', 'SYNC', 'MANUAL', 'SYSTEM'];

export default function MarketplaceEventsPage() {
  const { data: metrics } = useMarketplaceEventMetrics();

  return (
    <div>
      <PageHeader title="Marketplace Event Processing" description="Normalized marketplace events — received, processing, completed, failed and dead-letter states." />

      {metrics && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Total" value={metrics.totalEvents} />
          <KpiCard label="Pending" value={metrics.pendingEvents} />
          <KpiCard label="Processing" value={metrics.processingEvents} />
          <KpiCard label="Processed" value={metrics.processedEvents} />
          <KpiCard label="Failed" value={metrics.failedEvents} gradient="from-danger to-warning" />
          <KpiCard label="Success rate" value={`${Math.round(metrics.successRate * 100) / 100}%`} />
        </div>
      )}

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Events</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <AllEventsTab />
        </TabsContent>
        <TabsContent value="pending">
          <QuickListTab useHook={usePendingMarketplaceEvents} emptyTitle="No pending events" />
        </TabsContent>
        <TabsContent value="failed">
          <QuickListTab useHook={useFailedMarketplaceEvents} emptyTitle="No failed events" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AllEventsTab() {
  const [accountId, setAccountId] = useState('');
  const [providerKey, setProviderKey] = useState('');
  const [category, setCategory] = useState<MarketplaceEventCategory | ''>('');
  const [status, setStatus] = useState<MarketplaceEventStatus | ''>('');
  const [source, setSource] = useState<MarketplaceEventSource | ''>('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MarketplaceEventRecord | null>(null);

  const { data, isLoading, isError, refetch } = useMarketplaceEvents({
    accountId: accountId || undefined,
    providerKey: providerKey || undefined,
    category: category || undefined,
    status: status || undefined,
    source: source || undefined,
    page,
    limit: 20,
  });

  return (
    <div>
      <FilterBar
        hasActiveFilters={!!accountId || !!providerKey || !!category || !!status || !!source}
        onClearFilters={() => { setAccountId(''); setProviderKey(''); setCategory(''); setStatus(''); setSource(''); setPage(1); }}
        className="mb-4"
      >
        <Input value={accountId} onChange={(e) => { setAccountId(e.target.value); setPage(1); }} placeholder="Account ID" className="h-9 w-36" />
        <Input value={providerKey} onChange={(e) => { setProviderKey(e.target.value); setPage(1); }} placeholder="Provider key" className="h-9 w-36" />
        <Select value={category} onChange={(e) => { setCategory(e.target.value as MarketplaceEventCategory | ''); setPage(1); }} placeholder="All categories" options={EVENT_CATEGORIES.map((c) => ({ value: c, label: c }))} className="h-9 w-36" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value as MarketplaceEventStatus | ''); setPage(1); }} placeholder="All statuses" options={EVENT_STATUSES.map((s) => ({ value: s, label: s }))} className="h-9 w-36" />
        <Select value={source} onChange={(e) => { setSource(e.target.value as MarketplaceEventSource | ''); setPage(1); }} placeholder="All sources" options={EVENT_SOURCES.map((s) => ({ value: s, label: s }))} className="h-9 w-36" />
      </FilterBar>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load marketplace events." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No events found" />
      ) : (
        <>
          <EventTable events={data.items} onSelect={setSelected} />
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <EventDetailDialog event={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function QuickListTab({ useHook, emptyTitle }: { useHook: (accountId?: string, limit?: number) => { data?: MarketplaceEventRecord[]; isLoading: boolean }; emptyTitle: string }) {
  const [accountId, setAccountId] = useState('');
  const [selected, setSelected] = useState<MarketplaceEventRecord | null>(null);
  const { data: events, isLoading } = useHook(accountId || undefined, 100);

  return (
    <div>
      <FilterBar hasActiveFilters={!!accountId} onClearFilters={() => setAccountId('')} className="mb-4">
        <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="Account ID" className="h-9 w-40" />
      </FilterBar>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !events || events.length === 0 ? (
        <EmptyState title={emptyTitle} />
      ) : (
        <EventTable events={events} onSelect={setSelected} />
      )}

      <EventDetailDialog event={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function EventTable({ events, onSelect }: { events: MarketplaceEventRecord[]; onSelect: (e: MarketplaceEventRecord) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Provider / Account</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Received</TableHead>
          <TableHead>Attempts</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((e) => (
          <TableRow key={e.id} clickable onClick={() => onSelect(e)}>
            <TableCell className="text-sm font-medium text-foreground">{e.eventType.replace(/_/g, ' ')}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{e.providerKey} · {e.accountId}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{e.category}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{e.source}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{e.priority}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{formatDate(e.receivedAt)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{e.attemptCount} / {e.maxAttempts}</TableCell>
            <TableCell>
              <StatusBadge status={e.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EventDetailDialog({ event, onClose }: { event: MarketplaceEventRecord | null; onClose: () => void }) {
  const { data: history } = useMarketplaceEventHistory(event?.id);
  const reprocess = useReprocessMarketplaceEvent();
  const cancel = useCancelMarketplaceEvent();

  if (!event) return null;

  const canReprocess = ['FAILED', 'CANCELLED', 'STALE'].includes(event.status);
  const canCancel = ['PENDING', 'PROCESSING'].includes(event.status);

  return (
    <Dialog open={!!event} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{event.eventType.replace(/_/g, ' ')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <Field label="Provider" value={event.providerKey} />
            <Field label="Marketplace" value={event.marketplaceKey} />
            <Field label="Account" value={event.accountId} />
            <Field label="External event ID" value={event.externalEventId} />
            <Field label="Category" value={event.category} />
            <Field label="Source" value={event.source} />
            <Field label="Priority" value={event.priority} />
            <Field label="Status" value={event.status} />
            <Field label="Attempts" value={`${event.attemptCount} / ${event.maxAttempts}`} />
            <Field label="Occurred at" value={formatDate(event.occurredAt)} />
            <Field label="Received at" value={formatDate(event.receivedAt)} />
            <Field label="Processed at" value={event.processedAt ? formatDate(event.processedAt) : '—'} />
          </div>
          {event.errorMessage && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Error</p>
              <p className="text-sm text-danger">{event.errorMessage}</p>
            </div>
          )}
          {history && history.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</p>
              <p className="text-xs text-muted-foreground">{history.length} recorded state transition(s)</p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            {canCancel && (
              <Button variant="outline" size="sm" onClick={() => cancel.mutate(event.id)} disabled={cancel.isPending}>
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
            )}
            {canReprocess && (
              <Button variant="outline" size="sm" onClick={() => reprocess.mutate(event.id)} disabled={reprocess.isPending}>
                {reprocess.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Reprocess
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
