'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendChart } from '@/components/financial/trend-chart';
import {
  useAdjustResourceUsageRecord,
  useResourceUsageBreakdown,
  useResourceUsageRecords,
  useResourceUsageSummary,
  useReverseResourceUsageRecord,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { ResourceUsageFilterParams, ResourceUsageRecord, ResourceUsageThresholdLevel } from '@/types';

const THRESHOLD_TONE: Record<ResourceUsageThresholdLevel, 'success' | 'warning' | 'danger'> = {
  NORMAL: 'success',
  APPROACHING: 'success',
  WARNING: 'warning',
  GRACE: 'warning',
  EXCEEDED: 'danger',
};

const BUCKET_OPTIONS = [
  { value: 'DAY', label: 'Daily' },
  { value: 'WEEK', label: 'Weekly' },
  { value: 'MONTH', label: 'Monthly' },
  { value: 'HOUR', label: 'Hourly' },
] as const;

export default function UsagePage() {
  const summary = useResourceUsageSummary();
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const rows = summary.data ?? [];

  return (
    <div>
      <PageHeader title="Usage" description="Metered resource usage vs. plan allowance — API calls, AI usage, storage, and other tracked resources." />

      {summary.isLoading ? (
        <Skeleton className="mb-6 h-40 w-full" />
      ) : summary.isError ? (
        <QueryErrorState refetch={summary.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No usage recorded yet" className="mb-6" />
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((u) => {
            const limit = u.comparison?.limit?.hard ?? u.comparison?.limit?.soft ?? null;
            const pct = limit ? Math.min(100, Math.round((u.currentPeriodUsage / limit) * 100)) : null;
            const level = u.comparison?.thresholdLevel ?? 'NORMAL';
            return (
              <Card
                key={u.resourceKey}
                hover
                className={`cursor-pointer p-4 ${selectedResource === u.resourceKey ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedResource(u.resourceKey)}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{u.resourceKey}</p>
                  <Badge variant={THRESHOLD_TONE[level]} className="text-[10px]">
                    {level.toLowerCase()}
                  </Badge>
                </div>
                <p className="mt-2 text-xl font-bold text-foreground">
                  {u.currentPeriodUsage.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{u.unit}</span>
                </p>
                {limit !== null && (
                  <>
                    <Progress value={pct ?? 0} variant={level === 'EXCEEDED' ? 'danger' : level === 'WARNING' || level === 'GRACE' ? 'warning' : 'default'} className="mt-2" />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pct}% of {limit.toLocaleString()} {u.unit} limit
                      {u.comparison && u.comparison.overageAmount > 0 && ` · ${u.comparison.overageAmount.toLocaleString()} over`}
                    </p>
                  </>
                )}
                {u.comparison?.forecastedUsage != null && (
                  <p className="mt-1 text-xs text-muted-foreground">Forecasted: {u.comparison.forecastedUsage.toLocaleString()}</p>
                )}
                {level === 'EXCEEDED' && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-danger">
                    <AlertTriangle className="h-3 w-3" /> Limit exceeded
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {selectedResource && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <UsageBreakdownChart resourceKey={selectedResource} />
          </CardContent>
        </Card>
      )}

      <UsageRecordsTable />
    </div>
  );
}

function UsageBreakdownChart({ resourceKey }: { resourceKey: string }) {
  const today = new Date();
  const defaultEnd = today.toISOString().slice(0, 10);
  const defaultStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [bucket, setBucket] = useState<(typeof BUCKET_OPTIONS)[number]['value']>('DAY');
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const breakdown = useResourceUsageBreakdown({ resourceKey, bucket, startDate, endDate });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{resourceKey} — usage over time</p>
        <div className="flex items-center gap-2">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 w-36" />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 w-36" />
          <Select value={bucket} onChange={(e) => setBucket(e.target.value as typeof bucket)} options={[...BUCKET_OPTIONS]} className="h-8 w-32" />
        </div>
      </div>
      {breakdown.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <TrendChart data={(breakdown.data ?? []).map((b) => ({ label: formatDate(b.bucketStart), value: b.totalQuantity }))} />
      )}
    </div>
  );
}

function UsageRecordsTable() {
  const [resourceKey, setResourceKey] = useState('');
  const [module, setModule] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState<ResourceUsageRecord | null>(null);
  const [actionMode, setActionMode] = useState<'reverse' | 'adjust' | null>(null);

  const params = useMemo<ResourceUsageFilterParams>(() => ({ resourceKey: resourceKey || undefined, module: module || undefined, page, limit }), [resourceKey, module, page, limit]);
  const records = useResourceUsageRecords(params);
  const rows = records.data?.data ?? [];

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="mb-4 text-sm font-semibold text-foreground">Usage records</p>
        <FilterBar
          hasActiveFilters={!!(resourceKey || module)}
          onClearFilters={() => {
            setResourceKey('');
            setModule('');
            setPage(1);
          }}
          className="mb-4"
        >
          <Input placeholder="Resource key" value={resourceKey} onChange={(e) => setResourceKey(e.target.value)} className="h-9 w-40" />
          <Input placeholder="Module" value={module} onChange={(e) => setModule(e.target.value)} className="h-9 w-40" />
        </FilterBar>

        {records.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : records.isError ? (
          <QueryErrorState refetch={records.refetch} />
        ) : rows.length === 0 ? (
          <EmptyState title="No usage records" className="border-none py-8" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Module / Feature</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Occurred</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const actions: ActionMenuItem[] = r.isReversed
                    ? []
                    : [
                        { label: 'Adjust', icon: SlidersHorizontal, onSelect: () => { setSelected(r); setActionMode('adjust'); } },
                        { label: 'Reverse', icon: RotateCcw, onSelect: () => { setSelected(r); setActionMode('reverse'); }, destructive: true },
                      ];
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm font-medium text-foreground">{r.resourceKey}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.module}
                        {r.feature ? ` / ${r.feature}` : ''}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.quantity.toLocaleString()} {r.unit}
                        {r.isReversed && (
                          <Badge variant="secondary" className="ml-1.5 text-[9px]">
                            Reversed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {r.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(r.occurredAt)}</TableCell>
                      <TableCell className="text-right">
                        <ActionMenu items={actions} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Pagination
              page={records.data?.page ?? page}
              limit={records.data?.limit ?? limit}
              total={records.data?.total ?? 0}
              totalPages={records.data?.totalPages ?? 0}
              onPageChange={setPage}
              onLimitChange={(l) => {
                setLimit(l);
                setPage(1);
              }}
            />
          </>
        )}
      </CardContent>

      <UsageRecordActionDialog record={selected} mode={actionMode} onClose={() => { setSelected(null); setActionMode(null); }} />
    </Card>
  );
}

function UsageRecordActionDialog({ record, mode, onClose }: { record: ResourceUsageRecord | null; mode: 'reverse' | 'adjust' | null; onClose: () => void }) {
  const reverse = useReverseResourceUsageRecord(record?.id ?? '');
  const adjust = useAdjustResourceUsageRecord(record?.id ?? '');
  const [reason, setReason] = useState('');
  const [quantityDelta, setQuantityDelta] = useState('');

  if (!record || !mode) return null;

  const submit = () => {
    if (mode === 'reverse') {
      reverse.mutate({ reason }, { onSuccess: onClose });
    } else {
      adjust.mutate({ quantityDelta: Number(quantityDelta), reason }, { onSuccess: onClose });
    }
  };

  return (
    <Dialog open={!!record} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{mode === 'reverse' ? 'Reverse usage record' : 'Adjust usage record'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {record.resourceKey} — {record.quantity} {record.unit}
          </p>
          {mode === 'adjust' && (
            <FormField label="Quantity delta" htmlFor="adj-delta" required hint="Positive to add, negative to subtract.">
              <Input id="adj-delta" type="number" value={quantityDelta} onChange={(e) => setQuantityDelta(e.target.value)} />
            </FormField>
          )}
          <FormField label="Reason" htmlFor="adj-reason" required>
            <Textarea id="adj-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={submit}
            disabled={!reason || (mode === 'adjust' && !quantityDelta) || reverse.isPending || adjust.isPending}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
