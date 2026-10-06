'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { AlertTriangle, Loader2, RefreshCw, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { KpiCard } from '@/components/ui/kpi-card';
import { useActiveSyncIssues, useAllSyncs, useCancelSync, useRetrySync, useSyncMetrics } from '@/hooks';
import { formatDate } from '@/lib/utils';

export default function MarketplaceHealthPage() {
  const { data: syncs, isLoading, isError, error, refetch } = useAllSyncs();
  const { data: metrics } = useSyncMetrics();
  const { data: issues } = useActiveSyncIssues();
  const retrySync = useRetrySync();
  const cancelSync = useCancelSync();
  const [retryingKey, setRetryingKey] = useState<string | null>(null);

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <PageHeader title="Marketplace Health" description="Sync status across catalog, inventory, listing, order, shipment, return, pricing and report modules." />

      {metrics && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Active jobs" value={metrics.activeJobs} />
          <KpiCard label="Completed" value={metrics.completedJobs} />
          <KpiCard label="Failed" value={metrics.failedJobs} gradient="from-danger to-warning" />
          <KpiCard label="Success rate" value={`${Math.round(metrics.overallSuccessRate * 100) / 100}%`} />
          <KpiCard label="Stuck jobs" value={metrics.stuckJobsCount} gradient="from-warning to-danger" />
          <KpiCard label="Active issues" value={metrics.activeIssuesCount} gradient="from-danger to-warning" />
        </div>
      )}

      {issues && issues.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-danger" />
              Active issues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {issues.map((issue, i) => (
              <div key={i} className="rounded-[var(--radius)] border border-danger/20 bg-danger/5 p-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{issue.type.replace(/_/g, ' ')}</span>
                  <span className="text-xs capitalize text-muted-foreground">{issue.module.toLowerCase()} · {issue.provider}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{issue.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load sync status." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !syncs || syncs.length === 0 ? (
        <EmptyState title="No sync activity yet" description="Sync jobs will appear here once marketplace data starts syncing." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {syncs.map((agg) => {
            const key = `${agg.snapshot.module}-${agg.snapshot.provider}-${agg.snapshot.accountId ?? 'default'}`;
            const canRetry = ['FAILED', 'STUCK', 'CANCELLED'].includes(agg.snapshot.status);
            const canCancel = ['RUNNING', 'QUEUED', 'SCHEDULED'].includes(agg.snapshot.status);
            return (
              <Card key={key}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm capitalize">
                      {agg.snapshot.module.toLowerCase()} · {agg.snapshot.provider}
                    </CardTitle>
                    <StatusBadge status={agg.snapshot.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <MiniStat label="Processed" value={agg.snapshot.itemsProcessed} />
                    <MiniStat label="Failed" value={agg.snapshot.itemsFailed} />
                    <MiniStat label="Success" value={`${Math.round(agg.snapshot.successRate)}%`} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Last success: {agg.snapshot.lastSuccessfulSyncAt ? formatDate(agg.snapshot.lastSuccessfulSyncAt) : '—'}</span>
                    <span>Next: {agg.snapshot.nextScheduledSyncAt ? formatDate(agg.snapshot.nextScheduledSyncAt) : '—'}</span>
                  </div>
                  {agg.snapshot.lastError && <p className="text-xs text-danger">{agg.snapshot.lastError}</p>}
                  <div className="flex justify-end gap-2">
                    {canCancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          cancelSync.mutate({
                            workspaceId: agg.snapshot.workspaceId,
                            module: agg.snapshot.module,
                            provider: agg.snapshot.provider,
                            accountId: agg.snapshot.accountId,
                            jobId: agg.snapshot.jobId ?? '',
                          })
                        }
                        disabled={cancelSync.isPending}
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    )}
                    {canRetry && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRetryingKey(key);
                          retrySync.mutate(
                            { workspaceId: agg.snapshot.workspaceId, module: agg.snapshot.module, provider: agg.snapshot.provider, accountId: agg.snapshot.accountId, jobId: agg.snapshot.jobId },
                            { onSettled: () => setRetryingKey(null) },
                          );
                        }}
                        disabled={retrySync.isPending && retryingKey === key}
                      >
                        {retrySync.isPending && retryingKey === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Retry
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--radius)] bg-secondary/50 p-2 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
