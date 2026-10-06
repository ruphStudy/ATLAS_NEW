'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import { CheckCircle2, PauseCircle, PlayCircle, RotateCcw, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useApproveCycleCount,
  useAssignCycleCount,
  useCancelCycleCount,
  useCompleteCycleCount,
  useCycleCount,
  useCycleCountLines,
  usePauseCycleCount,
  useRejectCycleCount,
  useScheduleCycleCount,
  useStartCycleCount,
  useSubmitCycleCountLine,
} from '@/hooks';
import { formatDate } from '@/lib/utils';

export default function CycleCountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: cycleCount, isLoading, isError, error, refetch } = useCycleCount(id);
  const { data: linesRaw } = useCycleCountLines(id);
  const schedule = useScheduleCycleCount(id);
  const assign = useAssignCycleCount(id);
  const start = useStartCycleCount(id);
  const pause = usePauseCycleCount(id);
  const complete = useCompleteCycleCount(id);
  const approve = useApproveCycleCount(id);
  const reject = useRejectCycleCount(id);
  const cancel = useCancelCycleCount(id);
  const submitLine = useSubmitCycleCountLine(id);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [countInputs, setCountInputs] = useState<Record<string, string>>({});

  const isForbidden = isAxiosError(error) && error.response?.status === 403;
  const lines = Array.isArray(linesRaw) ? linesRaw : linesRaw?.items ?? [];

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description="We couldn't load this cycle count." />;
  if (isLoading || !cycleCount) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const actions: ActionMenuItem[] = [];
  if (cycleCount.status === 'DRAFT') {
    actions.push({ label: 'Schedule', icon: PlayCircle, onSelect: () => setScheduleOpen(true) });
  }
  if (cycleCount.status === 'SCHEDULED') {
    actions.push({ label: 'Assign to me', icon: CheckCircle2, onSelect: () => assign.mutate('me') });
  }
  if (cycleCount.status === 'ASSIGNED' || cycleCount.status === 'PAUSED') {
    actions.push({ label: 'Start', icon: PlayCircle, onSelect: () => start.mutate() });
  }
  if (cycleCount.status === 'IN_PROGRESS') {
    actions.push({ label: 'Pause', icon: PauseCircle, onSelect: () => pause.mutate(undefined) });
    actions.push({ label: 'Complete', icon: CheckCircle2, onSelect: () => complete.mutate() });
  }
  if (cycleCount.status === 'COMPLETED') {
    actions.push({ label: 'Approve', icon: CheckCircle2, onSelect: () => approve.mutate(undefined) });
    actions.push({ label: 'Reject', icon: X, onSelect: () => setRejectOpen(true), destructive: true });
  }
  if (!['COMPLETED', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(cycleCount.status)) {
    actions.push({ label: 'Cancel', icon: X, onSelect: () => setCancelOpen(true), destructive: true, separatorBefore: true });
  }

  return (
    <div>
      <PageHeader
        title={`Cycle count · ${cycleCount.type}`}
        breadcrumbs={[{ label: 'Cycle Counts', href: '/inventory-cycle-counts' }, { label: cycleCount.id }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={cycleCount.status} />
            <ActionMenu items={actions} />
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total lines" value={String(cycleCount.totalLines)} />
        <Stat label="Counted" value={String(cycleCount.countedLines)} />
        <Stat label="Variance lines" value={String(cycleCount.varianceLines)} />
        <Stat label="Blind count" value={cycleCount.isBlind ? 'Yes' : 'No'} />
      </div>

      {lines.length === 0 ? (
        <EmptyState title="No lines" description="This cycle count has no lines." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Counted</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => {
                  const canCount = cycleCount.status === 'IN_PROGRESS' && line.lineStatus !== 'VERIFIED';
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="text-sm text-foreground">{line.sku ?? line.inventoryItemId}</TableCell>
                      <TableCell>
                        <StatusBadge status={line.lineStatus} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{cycleCount.isBlind ? '—' : (line.expectedQuantity ?? '—')}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{line.countedQuantity ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{line.varianceQuantity ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        {canCount && (
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              type="number"
                              min="0"
                              placeholder="Qty"
                              value={countInputs[line.id] ?? ''}
                              onChange={(e) => setCountInputs((prev) => ({ ...prev, [line.id]: e.target.value }))}
                              className="h-8 w-20"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => countInputs[line.id] && submitLine.mutate({ lineId: line.id, countedQuantity: Number(countInputs[line.id]) })}
                              disabled={!countInputs[line.id] || submitLine.isPending}
                            >
                              Submit
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ReasonDialog open={rejectOpen} onOpenChange={setRejectOpen} title="Reject this cycle count" confirmLabel="Reject" variant="danger" pending={reject.isPending} onSubmit={(reason) => reject.mutate(reason, { onSuccess: () => setRejectOpen(false) })} />
      <ReasonDialog open={cancelOpen} onOpenChange={setCancelOpen} title="Cancel this cycle count" confirmLabel="Cancel" variant="danger" pending={cancel.isPending} onSubmit={(reason) => cancel.mutate(reason, { onSuccess: () => setCancelOpen(false) })} />
      <ReasonDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        title="Schedule this cycle count"
        label="Scheduled date"
        confirmLabel="Schedule"
        pending={schedule.isPending}
        onSubmit={(value) => schedule.mutate(value, { onSuccess: () => setScheduleOpen(false) })}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
