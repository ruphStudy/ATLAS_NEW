'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import { CheckCircle2, PauseCircle, PlayCircle, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  useAssignPickingTask,
  useCancelPickingTask,
  useCompletePickingTask,
  useExecutePickingLine,
  usePausePickingTask,
  usePickingExceptions,
  usePickingTask,
  useReleasePickingTask,
  useResumePickingTask,
  useStartPickingTask,
} from '@/hooks';

export default function PickingTaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: task, isLoading, isError, error, refetch } = usePickingTask(id);
  const { data: exceptions } = usePickingExceptions(id);
  const assign = useAssignPickingTask(id);
  const release = useReleasePickingTask(id);
  const start = useStartPickingTask(id);
  const pause = usePausePickingTask(id);
  const resume = useResumePickingTask(id);
  const execute = useExecutePickingLine(id);
  const complete = useCompletePickingTask(id);
  const cancel = useCancelPickingTask(id);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [pickInputs, setPickInputs] = useState<Record<string, string>>({});

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description="We couldn't load this picking task." />;
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
    actions.push({ label: 'Release', icon: PlayCircle, onSelect: () => release.mutate(undefined) });
  }
  if (task.status === 'RELEASED' || task.status === 'PAUSED') {
    actions.push({ label: 'Start', icon: PlayCircle, onSelect: () => start.mutate(undefined) });
  }
  if (task.status === 'IN_PROGRESS') {
    actions.push({ label: 'Pause', icon: PauseCircle, onSelect: () => pause.mutate(undefined) });
    actions.push({ label: 'Complete', icon: CheckCircle2, onSelect: () => complete.mutate(undefined) });
  }
  if (!['COMPLETED', 'CANCELLED', 'FAILED'].includes(task.status)) {
    actions.push({ label: 'Cancel', icon: X, onSelect: () => setCancelOpen(true), destructive: true, separatorBefore: true });
  }

  return (
    <div>
      <PageHeader
        title={task.taskNumber}
        breadcrumbs={[{ label: 'Picking', href: '/dashboard/picking' }, { label: task.taskNumber }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={task.status} />
            <ActionMenu items={actions} />
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Type" value={task.pickingType} />
        <Stat label="Strategy" value={task.strategy.replace(/_/g, ' ')} />
        <Stat label="Progress" value={`${task.pickedQuantity}/${task.totalQuantity}`} />
        <Stat label="Assigned to" value={task.assignedTo ?? '—'} />
      </div>

      <Tabs defaultValue="lines">
        <TabsList>
          <TabsTrigger value="lines">Lines</TabsTrigger>
          <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
        </TabsList>

        <TabsContent value="lines">
          {!task.lines || task.lines.length === 0 ? (
            <EmptyState title="No lines" className="border-none py-8" />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Picked</TableHead>
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
                        <TableCell className="text-sm text-muted-foreground">{line.sourceLocationId ?? line.sourceBinId ?? '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{line.requestedQuantity}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{line.pickedQuantity}</TableCell>
                        <TableCell className="text-right">
                          {task.status === 'IN_PROGRESS' && line.status !== 'COMPLETED' && (
                            <div className="flex items-center justify-end gap-2">
                              <Input
                                type="number"
                                min="0"
                                placeholder="Qty"
                                value={pickInputs[line.id] ?? ''}
                                onChange={(e) => setPickInputs((prev) => ({ ...prev, [line.id]: e.target.value }))}
                                className="h-8 w-20"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => pickInputs[line.id] && execute.mutate({ lineId: line.id, pickedQuantity: Number(pickInputs[line.id]) })}
                                disabled={!pickInputs[line.id] || execute.isPending}
                              >
                                Pick
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
        </TabsContent>

        <TabsContent value="exceptions">
          {!exceptions || exceptions.length === 0 ? (
            <EmptyState title="No exceptions" className="border-none py-8" />
          ) : (
            <ul className="space-y-2">
              {exceptions.map((ex) => (
                <li key={ex.id} className="rounded-[var(--radius)] border border-border p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={ex.exceptionType} />
                    {ex.quantity != null && <span className="text-xs text-muted-foreground">Qty: {ex.quantity}</span>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{ex.description}</p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

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
