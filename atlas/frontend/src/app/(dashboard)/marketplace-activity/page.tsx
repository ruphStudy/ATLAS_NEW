'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import {
  useMarketplaceActivitySearch,
  useMarketplaceActivityTimeline,
  useResolveSuspiciousMarketplaceActivity,
  useSuspiciousMarketplaceActivities,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { MarketplaceActivityModule, MarketplaceActivityRecord, MarketplaceActivityStatus } from '@/types';

const ACTIVITY_MODULES: MarketplaceActivityModule[] = [
  'ACCOUNT', 'CONFIGURATION', 'CREDENTIAL', 'CATALOG_SYNC', 'INVENTORY_SYNC', 'LISTING_SYNC',
  'ORDER_SYNC', 'SHIPMENT_SYNC', 'RETURN_SYNC', 'PRICING_SYNC', 'REPORT_SYNC',
  'WEBHOOK', 'EVENT', 'QUEUE', 'ADAPTER', 'PROVIDER',
];
const ACTIVITY_STATUSES: MarketplaceActivityStatus[] = ['SUCCESS', 'FAILURE', 'PENDING', 'CANCELLED', 'RETRIED', 'PARTIAL'];

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

export default function MarketplaceActivityPage() {
  return (
    <div>
      <PageHeader title="Marketplace Activity & Audit" description="Provider and account activity timeline, searchable audit trail and suspicious-activity alerts." />
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="suspicious">Suspicious</TabsTrigger>
        </TabsList>
        <TabsContent value="timeline">
          <TimelineTab />
        </TabsContent>
        <TabsContent value="search">
          <SearchTab />
        </TabsContent>
        <TabsContent value="suspicious">
          <SuspiciousTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TimelineTab() {
  const [{ startDate, endDate }, setRange] = useState(defaultDateRange());
  const [provider, setProvider] = useState('');
  const [accountId, setAccountId] = useState('');
  const { data, isLoading, isError, refetch } = useMarketplaceActivityTimeline(startDate, endDate, provider || undefined, accountId || undefined, 100);

  return (
    <div>
      <FilterBar className="mb-4">
        <Input type="date" value={startDate} onChange={(e) => setRange((r) => ({ ...r, startDate: e.target.value }))} className="h-9 w-40" />
        <Input type="date" value={endDate} onChange={(e) => setRange((r) => ({ ...r, endDate: e.target.value }))} className="h-9 w-40" />
        <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Provider" className="h-9 w-36" />
        <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="Account ID" className="h-9 w-36" />
      </FilterBar>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load the activity timeline." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.activities.length === 0 ? (
        <EmptyState title="No activity in this date range" />
      ) : (
        <ol className="space-y-3 border-l border-border pl-4">
          {data.activities.map((a) => (
            <ActivityListItem key={a.id} activity={a} />
          ))}
        </ol>
      )}
    </div>
  );
}

function ActivityListItem({ activity }: { activity: MarketplaceActivityRecord }) {
  return (
    <li className="relative">
      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-foreground">{activity.action.replace(/_/g, ' ')}</span>
        <StatusBadge status={activity.status} />
        <span className="text-xs text-muted-foreground">{activity.module.replace(/_/g, ' ')}</span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {activity.provider}{activity.accountId ? ` · ${activity.accountId}` : ''} · {activity.entityType} {activity.entityName ?? activity.entityId}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">By {activity.actor.type.toLowerCase()}{activity.actor.name ? ` (${activity.actor.name})` : ''} · {formatDate(activity.timestamp)}</p>
      {activity.errorMessage && <p className="mt-0.5 text-xs text-danger">{activity.errorMessage}</p>}
    </li>
  );
}

function SearchTab() {
  const [provider, setProvider] = useState('');
  const [accountId, setAccountId] = useState('');
  const [module, setModule] = useState<MarketplaceActivityModule | ''>('');
  const [status, setStatus] = useState<MarketplaceActivityStatus | ''>('');
  const [correlationId, setCorrelationId] = useState('');

  const { data: activities, isLoading, isError, refetch } = useMarketplaceActivitySearch({
    provider: provider || undefined,
    accountId: accountId || undefined,
    module: module || undefined,
    status: status || undefined,
    correlationId: correlationId || undefined,
    limit: 100,
    sortBy: 'timestamp',
    sortOrder: 'desc',
  });

  return (
    <div>
      <FilterBar
        hasActiveFilters={!!provider || !!accountId || !!module || !!status || !!correlationId}
        onClearFilters={() => { setProvider(''); setAccountId(''); setModule(''); setStatus(''); setCorrelationId(''); }}
        className="mb-4"
      >
        <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Provider" className="h-9 w-32" />
        <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="Account ID" className="h-9 w-32" />
        <Select value={module} onChange={(e) => setModule(e.target.value as MarketplaceActivityModule | '')} placeholder="All modules" options={ACTIVITY_MODULES.map((m) => ({ value: m, label: m.replace(/_/g, ' ') }))} className="h-9 w-40" />
        <Select value={status} onChange={(e) => setStatus(e.target.value as MarketplaceActivityStatus | '')} placeholder="All statuses" options={ACTIVITY_STATUSES.map((s) => ({ value: s, label: s }))} className="h-9 w-36" />
        <Input value={correlationId} onChange={(e) => setCorrelationId(e.target.value)} placeholder="Correlation ID" className="h-9 w-40" />
      </FilterBar>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load activities." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !activities || activities.length === 0 ? (
        <EmptyState title="No activities found" />
      ) : (
        <div className="space-y-2">
          {activities.map((a) => (
            <div key={a.id} className="rounded-[var(--radius)] border border-border p-3">
              <ActivityListItem activity={a} />
              {(a.correlationId || a.requestId || a.jobId) && (
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  {a.correlationId && <Badge variant="secondary" className="text-[10px]">corr: {a.correlationId}</Badge>}
                  {a.requestId && <Badge variant="secondary" className="text-[10px]">req: {a.requestId}</Badge>}
                  {a.jobId && <Badge variant="secondary" className="text-[10px]">job: {a.jobId}</Badge>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SuspiciousTab() {
  const { data: activities, isLoading, isError, refetch } = useSuspiciousMarketplaceActivities(false);
  const resolve = useResolveSuspiciousMarketplaceActivity();

  return (
    <div>
      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load suspicious activity." />
      ) : isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !activities || activities.length === 0 ? (
        <EmptyState title="No suspicious activity detected" icon={CheckCircle2} />
      ) : (
        <div className="space-y-2">
          {activities.map((s) => (
            <div key={s.activityId} className="flex items-start justify-between gap-3 rounded-[var(--radius)] border border-danger/20 bg-danger/5 p-3 text-sm">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-danger" />
                  <span className="font-medium text-foreground">{s.reason}</span>
                  <Badge variant="danger">{s.severity}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Detected {formatDate(s.detectedAt)}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => resolve.mutate(s.activityId)} disabled={resolve.isPending}>
                Resolve
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
