'use client';

import { useState } from 'react';
import { Loader2, Pause, Play, RefreshCw, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import { useAuthStore } from '@/stores';
import {
  useAllMarketplaceAggregatedMetrics,
  useCancelMarketplaceJob,
  useCreateMarketplaceRateLimitConfig,
  useDrainMarketplaceQueue,
  useMarketplaceAggregatedMetrics,
  useMarketplaceDeadLetterJobs,
  useMarketplaceJobs,
  useMarketplaceQueueHealth,
  useMarketplaceRateLimitConfig,
  usePauseMarketplaceQueue,
  useRecoverStaleMarketplaceJobs,
  useReprocessMarketplaceDeadLetterJob,
  useResumeMarketplaceQueue,
  useRetryMarketplaceJob,
  useUpdateMarketplaceRateLimitConfig,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { MarketplaceJobState, MarketplaceQueueType, SetMarketplaceRateLimitPayload } from '@/types';

const QUEUE_TYPES: MarketplaceQueueType[] = [
  'CATALOG_SYNC', 'INVENTORY_SYNC', 'LISTING_SYNC', 'ORDER_SYNC', 'SHIPMENT_SYNC',
  'RETURN_SYNC', 'PRICING_SYNC', 'REPORT_SYNC', 'WEBHOOK_PROCESSING', 'EVENT_PROCESSING',
];
const JOB_STATES: MarketplaceJobState[] = ['WAITING', 'ACTIVE', 'DELAYED', 'COMPLETED', 'FAILED', 'CANCELLED', 'STALE'];

export default function MarketplaceQueuesPage() {
  return (
    <div>
      <PageHeader title="Marketplace Queue Management" description="Job queues, dead-letter jobs and rate-limit controls across marketplace sync, webhook and event processing." />
      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="queues">Queue Metrics</TabsTrigger>
          <TabsTrigger value="dead-letter">Dead Letter</TabsTrigger>
          <TabsTrigger value="rate-limits">Rate Limits</TabsTrigger>
        </TabsList>
        <TabsContent value="jobs">
          <JobsTab />
        </TabsContent>
        <TabsContent value="queues">
          <QueuesTab />
        </TabsContent>
        <TabsContent value="dead-letter">
          <DeadLetterTab />
        </TabsContent>
        <TabsContent value="rate-limits">
          <RateLimitsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function JobsTab() {
  const [queueType, setQueueType] = useState<MarketplaceQueueType | ''>('');
  const [state, setState] = useState<MarketplaceJobState | ''>('');
  const { data: jobs, isLoading, isError, refetch } = useMarketplaceJobs(queueType || undefined, state || undefined);
  const retry = useRetryMarketplaceJob();
  const cancel = useCancelMarketplaceJob();
  const recoverStale = useRecoverStaleMarketplaceJobs();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar>
          <Select value={queueType} onChange={(e) => setQueueType(e.target.value as MarketplaceQueueType | '')} placeholder="Select a queue" options={QUEUE_TYPES.map((q) => ({ value: q, label: q.replace(/_/g, ' ') }))} className="h-9 w-56" />
          <Select value={state} onChange={(e) => setState(e.target.value as MarketplaceJobState | '')} placeholder="Select a state" options={JOB_STATES.map((s) => ({ value: s, label: s }))} className="h-9 w-44" />
        </FilterBar>
        {queueType && (
          <Button
            variant="outline"
            onClick={() => recoverStale.mutate({ queueType, olderThanMinutes: 30 })}
            disabled={recoverStale.isPending}
          >
            {recoverStale.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Recover stale jobs
          </Button>
        )}
      </div>

      {!queueType || !state ? (
        <EmptyState title="Select a queue and a state to view jobs" />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load jobs." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !jobs || jobs.length === 0 ? (
        <EmptyState title={`No ${state.toLowerCase()} jobs in this queue`} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job ID</TableHead>
              <TableHead>Provider / Account</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Added</TableHead>
              <TableHead>State</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => {
              const isRetrying = retry.isPending && retry.variables?.jobId === job.id;
              const isCancelling = cancel.isPending && cancel.variables?.jobId === job.id;
              return (
                <TableRow key={job.id}>
                  <TableCell className="text-xs text-muted-foreground">{job.id}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{job.provider}{job.accountId ? ` · ${job.accountId}` : ''}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{job.data?.type ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{job.attempts} / {job.maxAttempts}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{job.progress != null ? `${job.progress}%` : '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(job.addedAt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={job.state} />
                    {job.failedReason && <p className="mt-1 max-w-xs text-xs text-danger">{job.failedReason}</p>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {(job.state === 'FAILED' || job.state === 'STALE') && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Retry"
                          onClick={() => retry.mutate({ workspaceId: job.workspaceId, queueType: job.queueType, jobId: job.id })}
                          disabled={isRetrying}
                        >
                          {isRetrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                      {(job.state === 'WAITING' || job.state === 'ACTIVE' || job.state === 'DELAYED') && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Cancel"
                          onClick={() => cancel.mutate({ workspaceId: job.workspaceId, queueType: job.queueType, jobId: job.id })}
                          disabled={isCancelling}
                        >
                          {isCancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function QueuesTab() {
  const [queueType, setQueueType] = useState<MarketplaceQueueType | ''>('');
  const { data: overview } = useAllMarketplaceAggregatedMetrics();
  const { data: aggregated } = useMarketplaceAggregatedMetrics(queueType || undefined);
  const { data: health } = useMarketplaceQueueHealth(queueType || undefined);
  const pause = usePauseMarketplaceQueue();
  const resume = useResumeMarketplaceQueue();
  const drain = useDrainMarketplaceQueue();

  return (
    <div>
      {overview && overview.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {overview.map((m) => (
            <Card key={m.queueType} hover className="cursor-pointer" onClick={() => setQueueType(m.queueType)}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>{m.queueType.replace(/_/g, ' ')}</span>
                  <span className="text-xs font-normal text-muted-foreground">Health {Math.round(m.healthScore)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <span>Waiting {m.waitingJobs}</span>
                <span>Active {m.activeJobs}</span>
                <span>Failed {m.failedJobs}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FilterBar className="mb-4">
        <Select value={queueType} onChange={(e) => setQueueType(e.target.value as MarketplaceQueueType | '')} placeholder="Select a queue" options={QUEUE_TYPES.map((q) => ({ value: q, label: q.replace(/_/g, ' ') }))} className="h-9 w-56" />
        {queueType && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => pause.mutate(queueType)} disabled={pause.isPending}>
              <Pause className="h-3.5 w-3.5" />
              Pause
            </Button>
            <Button variant="outline" size="sm" onClick={() => resume.mutate(queueType)} disabled={resume.isPending}>
              <Play className="h-3.5 w-3.5" />
              Resume
            </Button>
            <Button variant="outline" size="sm" onClick={() => drain.mutate({ queueType })} disabled={drain.isPending}>
              <Trash2 className="h-3.5 w-3.5" />
              Drain
            </Button>
          </div>
        )}
      </FilterBar>

      {!queueType ? (
        <EmptyState title="Select a queue to view detailed metrics and controls" />
      ) : !aggregated || !health ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MiniStat label="Total jobs" value={aggregated.totalJobs} />
          <MiniStat label="Waiting" value={aggregated.waitingJobs} />
          <MiniStat label="Active" value={aggregated.activeJobs} />
          <MiniStat label="Delayed" value={aggregated.delayedJobs} />
          <MiniStat label="Completed" value={aggregated.completedJobs} />
          <MiniStat label="Failed" value={aggregated.failedJobs} />
          <MiniStat label="Cancelled" value={aggregated.cancelledJobs} />
          <MiniStat label="Error rate" value={`${Math.round(aggregated.errorRate * 100) / 100}%`} />
          <div className="col-span-2 sm:col-span-4">
            <StatusBadge status={health.isHealthy ? 'HEALTHY' : 'UNHEALTHY'} tone={health.isHealthy ? 'success' : 'danger'} />
            {health.issues.length > 0 && <p className="mt-1 text-xs text-danger">{health.issues.join(', ')}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function DeadLetterTab() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const [queueType, setQueueType] = useState<MarketplaceQueueType | ''>('');
  const { data: jobs, isLoading, isError, refetch } = useMarketplaceDeadLetterJobs(queueType || undefined);
  const reprocess = useReprocessMarketplaceDeadLetterJob();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div>
      <FilterBar hasActiveFilters={!!queueType} onClearFilters={() => setQueueType('')} className="mb-4">
        <Select value={queueType} onChange={(e) => setQueueType(e.target.value as MarketplaceQueueType | '')} placeholder="All queues" options={QUEUE_TYPES.map((q) => ({ value: q, label: q.replace(/_/g, ' ') }))} className="h-9 w-56" />
      </FilterBar>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load dead-letter jobs." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !jobs || jobs.length === 0 ? (
        <EmptyState title="No dead-letter jobs" description="Jobs that exhaust all retry attempts land here." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Queue</TableHead>
              <TableHead>Provider / Account</TableHead>
              <TableHead>Original job</TableHead>
              <TableHead>Failed reason</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Failed at</TableHead>
              <TableHead>Reprocessed</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((j) => (
              <TableRow key={j.id}>
                <TableCell className="text-sm text-muted-foreground">{j.queueType.replace(/_/g, ' ')}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{j.provider}{j.accountId ? ` · ${j.accountId}` : ''}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{j.originalJobId}</TableCell>
                <TableCell className="text-xs text-danger">{j.failedReason}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{j.attempts}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(j.failedAt)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{j.isReprocessed ? `Yes (${j.reprocessedAt ? formatDate(j.reprocessedAt) : ''})` : 'No'}</TableCell>
                <TableCell className="text-right">
                  {!j.isReprocessed && (
                    <Button variant="outline" size="sm" onClick={() => setConfirmId(j.id)}>
                      Reprocess
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ReasonDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Reprocess dead-letter job"
        label="Note (optional context for audit trail)"
        confirmLabel="Reprocess"
        pending={reprocess.isPending}
        onSubmit={() => {
          if (!confirmId || !workspaceId) return;
          reprocess.mutate({ workspaceId, deadLetterJobId: confirmId }, { onSuccess: () => setConfirmId(null) });
        }}
      />
    </div>
  );
}

function RateLimitsTab() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const [provider, setProvider] = useState('');
  const [accountId, setAccountId] = useState('');
  const [queueType, setQueueType] = useState<MarketplaceQueueType | ''>('');
  const { data: config } = useMarketplaceRateLimitConfig(provider || undefined, queueType || undefined, accountId || undefined);
  const createConfig = useCreateMarketplaceRateLimitConfig();
  const updateConfig = useUpdateMarketplaceRateLimitConfig();
  const [form, setForm] = useState({ maxConcurrent: 5, maxPerMinute: 60, maxPerHour: 1000, isEnabled: true });

  const save = () => {
    if (!provider || !queueType || !workspaceId) return;
    const payload: SetMarketplaceRateLimitPayload = { workspaceId, provider, accountId: accountId || undefined, queueType, ...form };
    (config ? updateConfig : createConfig).mutate(payload);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <FormField label="Provider key" htmlFor="rl-provider" required>
          <Input id="rl-provider" value={provider} onChange={(e) => setProvider(e.target.value)} />
        </FormField>
        <FormField label="Account ID (optional)" htmlFor="rl-account">
          <Input id="rl-account" value={accountId} onChange={(e) => setAccountId(e.target.value)} />
        </FormField>
        <FormField label="Queue type" htmlFor="rl-queue" required>
          <Select id="rl-queue" value={queueType} onChange={(e) => setQueueType(e.target.value as MarketplaceQueueType | '')} placeholder="Select a queue" options={QUEUE_TYPES.map((q) => ({ value: q, label: q.replace(/_/g, ' ') }))} />
        </FormField>
      </div>

      {!provider || !queueType ? (
        <EmptyState title="Enter a provider and queue type to view or configure its rate limit" />
      ) : (
        <div className="grid grid-cols-2 gap-4 rounded-[var(--radius)] border border-border p-4 sm:grid-cols-4">
          <FormField label="Max concurrent" htmlFor="rl-concurrent">
            <Input id="rl-concurrent" type="number" value={form.maxConcurrent} onChange={(e) => setForm((f) => ({ ...f, maxConcurrent: Number(e.target.value) }))} />
          </FormField>
          <FormField label="Max per minute" htmlFor="rl-minute">
            <Input id="rl-minute" type="number" value={form.maxPerMinute} onChange={(e) => setForm((f) => ({ ...f, maxPerMinute: Number(e.target.value) }))} />
          </FormField>
          <FormField label="Max per hour" htmlFor="rl-hour">
            <Input id="rl-hour" type="number" value={form.maxPerHour} onChange={(e) => setForm((f) => ({ ...f, maxPerHour: Number(e.target.value) }))} />
          </FormField>
          <label className="flex items-end gap-2 pb-2 text-sm text-foreground">
            <Checkbox checked={form.isEnabled} onChange={(e) => setForm((f) => ({ ...f, isEnabled: e.target.checked }))} />
            Enabled
          </label>
          <div className="col-span-2 sm:col-span-4">
            {config && (
              <p className="mb-2 text-xs text-muted-foreground">
                Current: {config.maxConcurrent} concurrent · {config.maxPerMinute}/min · {config.maxPerHour}/hr · {config.isEnabled ? 'enabled' : 'disabled'}
              </p>
            )}
            <Button onClick={save} disabled={createConfig.isPending || updateConfig.isPending}>
              {(createConfig.isPending || updateConfig.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              {config ? 'Update rate limit' : 'Create rate limit'}
            </Button>
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
