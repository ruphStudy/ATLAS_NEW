'use client';

import { useState } from 'react';
import { Loader2, Search, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Badge } from '@/components/ui/badge';
import {
  useDetectSyncIssues,
  useFilteredSyncs,
  useItemFailures,
  useResolveSyncIssue,
  useSyncErrorSummary,
  useSyncIssuesByType,
  useSyncQueueHealth,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { SyncIssueType, SyncModule, SyncStatus } from '@/types';

const SYNC_MODULES: SyncModule[] = ['CATALOG', 'INVENTORY', 'LISTING', 'ORDER', 'SHIPMENT', 'RETURN', 'PRICING', 'REPORT'];
const SYNC_STATUSES: SyncStatus[] = ['IDLE', 'SCHEDULED', 'QUEUED', 'RUNNING', 'PAUSED', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'CANCELLED', 'STUCK', 'DELAYED'];
const ISSUE_TYPES: SyncIssueType[] = ['STUCK', 'DELAYED', 'REPEATEDLY_FAILING', 'PARTIALLY_COMPLETED', 'RATE_LIMITED', 'QUEUE_BACKED_UP', 'HIGH_ERROR_RATE', 'MISSING_SCHEDULE'];

export default function MarketplaceSyncHistoryPage() {
  return (
    <div>
      <PageHeader title="Sync History & Failures" description="Sync run history, item-level failures, normalized error summaries and detected issues across marketplace sync modules." />
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Run History</TabsTrigger>
          <TabsTrigger value="failures">Item Failures</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="queue-health">Queue Health</TabsTrigger>
        </TabsList>
        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>
        <TabsContent value="failures">
          <FailuresTab />
        </TabsContent>
        <TabsContent value="issues">
          <IssuesTab />
        </TabsContent>
        <TabsContent value="queue-health">
          <QueueHealthTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HistoryTab() {
  const [module, setModule] = useState<SyncModule | ''>('');
  const [provider, setProvider] = useState('');
  const [accountId, setAccountId] = useState('');
  const [status, setStatus] = useState<SyncStatus | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<SyncModule | null>(null);

  const { data: runs, isLoading, isError, refetch } = useFilteredSyncs({
    module: module || undefined,
    provider: provider || undefined,
    accountId: accountId || undefined,
    status: status || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    limit: 100,
  });

  const hasFilters = !!module || !!provider || !!accountId || !!status || !!startDate || !!endDate;

  return (
    <div>
      <FilterBar
        hasActiveFilters={hasFilters}
        onClearFilters={() => { setModule(''); setProvider(''); setAccountId(''); setStatus(''); setStartDate(''); setEndDate(''); }}
        className="mb-4"
      >
        <Select value={module} onChange={(e) => setModule(e.target.value as SyncModule | '')} placeholder="All modules" options={SYNC_MODULES.map((m) => ({ value: m, label: m }))} className="h-9 w-36" />
        <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Provider key" className="h-9 w-40" />
        <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="Account ID" className="h-9 w-40" />
        <Select value={status} onChange={(e) => setStatus(e.target.value as SyncStatus | '')} placeholder="All statuses" options={SYNC_STATUSES.map((s) => ({ value: s, label: s }))} className="h-9 w-40" />
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 w-40" />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 w-40" />
      </FilterBar>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load sync run history." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !runs || runs.length === 0 ? (
        <EmptyState title="No sync runs found" description="Try adjusting your filters, or check back once syncs have run." icon={Search} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module / Provider</TableHead>
              <TableHead>Job ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Processed / Failed</TableHead>
              <TableHead>Success rate</TableHead>
              <TableHead>Triggered by</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((r) => (
              <TableRow key={r.jobId} clickable onClick={() => { setSelectedJobId(r.jobId); setSelectedModule(r.module); }}>
                <TableCell className="text-sm font-medium text-foreground">
                  <span className="capitalize">{r.module.toLowerCase()}</span> · {r.provider}
                  {r.accountId && <span className="text-xs text-muted-foreground"> ({r.accountId})</span>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.jobId}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(r.startedAt)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.duration != null ? `${Math.round(r.duration / 1000)}s` : '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.itemsProcessed} / {r.itemsFailed}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{Math.round(r.successRate)}%</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.triggeredBy ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ErrorSummaryDialog jobId={selectedJobId} module={selectedModule} onClose={() => { setSelectedJobId(null); setSelectedModule(null); }} />
    </div>
  );
}

function ErrorSummaryDialog({ jobId, module, onClose }: { jobId: string | null; module: SyncModule | null; onClose: () => void }) {
  const { data: summary, isLoading } = useSyncErrorSummary(jobId ?? undefined);
  const { data: failures } = useItemFailures(jobId ?? undefined, module ?? undefined);

  if (!jobId) return null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span>Error summary — job {jobId}</span>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !summary || summary.length === 0 ? (
          <p className="text-sm text-muted-foreground">No normalized errors recorded for this job.</p>
        ) : (
          <div className="space-y-2">
            {summary.map((s, i) => (
              <div key={i} className="rounded-[var(--radius)] border border-border p-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{s.errorCode ?? 'UNKNOWN'}</span>
                  <Badge variant={s.isRecoverable ? 'secondary' : 'danger'}>{s.count}× {s.isRecoverable ? 'recoverable' : 'not recoverable'}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{s.errorMessage}</p>
                {s.suggestedAction && <p className="mt-1 text-xs text-info">Suggested: {s.suggestedAction}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(s.firstOccurrence)} — {formatDate(s.lastOccurrence)} · {s.affectedItems.length} item(s) affected</p>
              </div>
            ))}
          </div>
        )}
        {failures && failures.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Item-level failures</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Retries</TableHead>
                  <TableHead>Resolved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failures.slice(0, 25).map((f, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs text-muted-foreground">{f.externalId ?? f.itemId}</TableCell>
                    <TableCell className="text-xs text-danger">{f.errorCode ? `${f.errorCode}: ` : ''}{f.errorMessage}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{f.retryCount}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{f.isResolved ? 'Yes' : 'No'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FailuresTab() {
  const [module, setModule] = useState<SyncModule | ''>('');
  const [jobId, setJobId] = useState('');
  const [unresolvedOnly, setUnresolvedOnly] = useState(true);
  const { data: failures, isLoading, isError, refetch } = useItemFailures(jobId || undefined, module || undefined, unresolvedOnly);

  return (
    <div>
      <FilterBar hasActiveFilters={!!module || !!jobId} onClearFilters={() => { setModule(''); setJobId(''); }} className="mb-4">
        <Select value={module} onChange={(e) => setModule(e.target.value as SyncModule | '')} placeholder="All modules" options={SYNC_MODULES.map((m) => ({ value: m, label: m }))} className="h-9 w-36" />
        <Input value={jobId} onChange={(e) => setJobId(e.target.value)} placeholder="Job ID" className="h-9 w-48" />
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox checked={unresolvedOnly} onChange={(e) => setUnresolvedOnly(e.target.checked)} />
          Unresolved only
        </label>
      </FilterBar>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load item failures." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !failures || failures.length === 0 ? (
        <EmptyState title="No item-level failures" description="Failures will appear here as sync jobs process items." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module / Provider</TableHead>
              <TableHead>Job ID</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Error</TableHead>
              <TableHead>Retries</TableHead>
              <TableHead>Failed at</TableHead>
              <TableHead>Resolved</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {failures.map((f, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm text-muted-foreground"><span className="capitalize">{f.module.toLowerCase()}</span> · {f.provider}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{f.jobId}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{f.externalId ?? f.itemId}</TableCell>
                <TableCell className="text-xs text-danger">{f.errorCode ? `${f.errorCode}: ` : ''}{f.errorMessage}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{f.retryCount}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(f.failedAt)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{f.isResolved ? 'Yes' : 'No'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function IssuesTab() {
  const [module, setModule] = useState<SyncModule | ''>('');
  const [type, setType] = useState<SyncIssueType | ''>('');
  const { data: issues, isLoading, isError, refetch } = useSyncIssuesByType(module || undefined, type || undefined);
  const detect = useDetectSyncIssues();
  const resolve = useResolveSyncIssue();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!module || !!type} onClearFilters={() => { setModule(''); setType(''); }}>
          <Select value={module} onChange={(e) => setModule(e.target.value as SyncModule | '')} placeholder="All modules" options={SYNC_MODULES.map((m) => ({ value: m, label: m }))} className="h-9 w-36" />
          <Select value={type} onChange={(e) => setType(e.target.value as SyncIssueType | '')} placeholder="All issue types" options={ISSUE_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))} className="h-9 w-48" />
        </FilterBar>
        <Button variant="outline" onClick={() => detect.mutate(module || undefined)} disabled={detect.isPending}>
          {detect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Run detection
        </Button>
      </div>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load sync issues." />
      ) : isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !issues || issues.length === 0 ? (
        <EmptyState title="No active issues" description="Stuck, delayed, repeatedly-failing and partially-completed syncs will appear here." />
      ) : (
        <div className="space-y-2">
          {issues.map((issue, i) => (
            <div key={i} className="flex items-start justify-between gap-3 rounded-[var(--radius)] border border-danger/20 bg-danger/5 p-3 text-sm">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{issue.type.replace(/_/g, ' ')}</span>
                  <Badge variant="secondary">{issue.severity}</Badge>
                  <span className="text-xs capitalize text-muted-foreground">{issue.module.toLowerCase()} · {issue.provider}{issue.accountId ? ` · ${issue.accountId}` : ''}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{issue.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">Detected {formatDate(issue.detectedAt)}</p>
              </div>
              {!issue.resolvedAt && issue.id && (
                <Button variant="outline" size="sm" onClick={() => resolve.mutate(issue.id as string)} disabled={resolve.isPending}>
                  Resolve
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QueueHealthTab() {
  const [module, setModule] = useState<SyncModule | ''>('');
  const { data: health, isLoading } = useSyncQueueHealth(module || undefined);

  return (
    <div>
      <FilterBar className="mb-4">
        <Select value={module} onChange={(e) => setModule(e.target.value as SyncModule | '')} placeholder="Select a module" options={SYNC_MODULES.map((m) => ({ value: m, label: m }))} className="h-9 w-48" />
      </FilterBar>

      {!module ? (
        <EmptyState title="Select a module to view queue health" />
      ) : isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !health ? (
        <EmptyState title="No queue health data available" />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MiniStat label="Waiting" value={health.waiting} />
          <MiniStat label="Active" value={health.active} />
          <MiniStat label="Delayed" value={health.delayed} />
          <MiniStat label="Completed" value={health.completed} />
          <MiniStat label="Failed" value={health.failed} />
          <MiniStat label="Paused" value={health.paused} />
          <MiniStat label="Throughput" value={health.throughput != null ? `${Math.round(health.throughput)}/min` : '—'} />
          <MiniStat label="Error rate" value={health.errorRate != null ? `${Math.round(health.errorRate * 100) / 100}%` : '—'} />
          <div className="col-span-2 sm:col-span-4">
            <StatusBadge status={health.isHealthy ? 'HEALTHY' : 'UNHEALTHY'} tone={health.isHealthy ? 'success' : 'danger'} />
            {health.lastJobAt && <span className="ml-2 text-xs text-muted-foreground">Last job {formatDate(health.lastJobAt)}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--radius)] bg-secondary/50 p-3 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
