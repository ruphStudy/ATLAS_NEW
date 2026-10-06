'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import { CheckCircle2, PlayCircle, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import { useAssignPutawayTask, useCancelPutawayTask, useCompletePutawayTask, useExecutePutawayLine, usePutawayTask, useStartPutawayTask } from '@/hooks';
import { formatDate } from '@/lib/utils';

export default function PutawayTaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: task, isLoading, isError, error, refetch } = usePutawayTask(id);
  const assign = useAssignPutawayTask(id);
  const start = useStartPutawayTask(id);
  const execute = useExecutePutawayLine(id);
  const complete = useCompletePutawayTask(id);
  const cancel = useCancelPutawayTask(id);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [binInputs, setBinInputs] = useState<Record<string, string>>({});

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description="We couldn't load this putaway task." />;
  if (isLoading || !task) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const actions: ActionMenuItem[] = [];
  if (task.status === 'PENDING') {
    actions.push({ label: 'Assign', icon: CheckCircle2, onSelect: () => setAssignOpen(true) });
  }
  if (task.status === 'ASSIGNED') {
    actions.push({ label: 'Start', icon: PlayCircle, onSelect: () => start.mutate() });
  }
  if (task.status === 'IN_PROGRESS') {
    actions.push({ label: 'Complete', icon: CheckCircle2, onSelect: () => complete.mutate() });
  }
  if (!['COMPLETED', 'CANCELLED', 'FAILED'].includes(task.status)) {
    actions.push({ label: 'Cancel', icon: X, onSelect: () => setCancelOpen(true), destructive: true, separatorBefore: true });
  }

  return (
    <div>
      <PageHeader
        title={task.taskNumber}
        breadcrumbs={[{ label: 'Putaway', href: '/putaway' }, { label: task.taskNumber }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={task.status} />
            <ActionMenu items={actions} />
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Strategy" value={task.strategy.replace(/_/g, ' ')} />
        <Stat label="Progress" value={`${task.putawayQuantity}/${task.totalQuantity}`} />
        <Stat label="Priority" value={String(task.priority)} />
        <Stat label="Assigned to" value={task.assignedTo ?? '—'} />
      </div>

      {task.lines && task.lines.length > 0 && (
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
                  <TableHead>Recommended bin</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Put away</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {task.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="text-sm text-foreground">{line.sku ?? '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={line.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{line.recommendedBinId ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{line.quantity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{line.putawayQuantity}</TableCell>
                    <TableCell className="text-right">
                      {task.status === 'IN_PROGRESS' && line.status !== 'COMPLETED' && (
                        <div className="flex items-center justify-end gap-2">
                          <Input
                            type="number"
                            min="0"
                            placeholder="Qty"
                            value={binInputs[line.id] ?? ''}
                            onChange={(e) => setBinInputs((prev) => ({ ...prev, [line.id]: e.target.value }))}
                            className="h-8 w-20"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => binInputs[line.id] && execute.mutate({ lineId: line.id, putawayQuantity: Number(binInputs[line.id]) })}
                            disabled={!binInputs[line.id] || execute.isPending}
                          >
                            Put away
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ReasonDialog open={cancelOpen} onOpenChange={setCancelOpen} title="Cancel this task" confirmLabel="Cancel" variant="danger" pending={cancel.isPending} onSubmit={(reason) => cancel.mutate(reason, { onSuccess: () => setCancelOpen(false) })} />
      <ReasonDialog open={assignOpen} onOpenChange={setAssignOpen} title="Assign this task" label="Assignee" confirmLabel="Assign" pending={assign.isPending} onSubmit={(value) => assign.mutate(value, { onSuccess: () => setAssignOpen(false) })} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold capitalize text-foreground">{value}</p>
    </div>
  );
}
