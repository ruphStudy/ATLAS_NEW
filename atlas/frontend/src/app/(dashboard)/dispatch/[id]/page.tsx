'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import { CheckCircle2, PlayCircle, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useAssignDispatchTask,
  useCancelDispatchTask,
  useCompleteDispatchTask,
  useDispatchExceptions,
  useDispatchPackages,
  useDispatchTask,
  useExecuteDispatchPackage,
  useStartDispatchTask,
  useUpdateDispatchTask,
} from '@/hooks';

export default function DispatchTaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: task, isLoading, isError, error, refetch } = useDispatchTask(id);
  const { data: packages } = useDispatchPackages(id);
  const { data: exceptions } = useDispatchExceptions(id);
  const assign = useAssignDispatchTask(id);
  const start = useStartDispatchTask(id);
  const executePackage = useExecuteDispatchPackage(id);
  const updateTask = useUpdateDispatchTask(id);
  const complete = useCompleteDispatchTask(id);
  const cancel = useCancelDispatchTask(id);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [carrierOpen, setCarrierOpen] = useState(false);
  const [carrierName, setCarrierName] = useState('');
  const [pickupReference, setPickupReference] = useState('');

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description="We couldn't load this dispatch task." />;
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
    actions.push({ label: 'Start', icon: PlayCircle, onSelect: () => start.mutate(undefined) });
  }
  if (task.status === 'IN_PROGRESS') {
    actions.push({ label: 'Set carrier / pickup', icon: CheckCircle2, onSelect: () => setCarrierOpen(true) });
    actions.push({ label: 'Complete', icon: CheckCircle2, onSelect: () => complete.mutate(undefined) });
  }
  if (!['COMPLETED', 'CANCELLED'].includes(task.status)) {
    actions.push({ label: 'Cancel', icon: X, onSelect: () => setCancelOpen(true), destructive: true, separatorBefore: true });
  }

  return (
    <div>
      <PageHeader
        title={task.taskNumber}
        breadcrumbs={[{ label: 'Dispatch', href: '/dashboard/dispatch' }, { label: task.taskNumber }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={task.status} />
            <ActionMenu items={actions} />
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Carrier" value={task.carrierName ?? '—'} />
        <Stat label="Service type" value={task.serviceType ?? '—'} />
        <Stat label="Pickup reference" value={task.pickupReference ?? '—'} />
        <Stat label="Progress" value={`${task.dispatchedPackages}/${task.totalPackages}`} />
      </div>

      <Tabs defaultValue="packages">
        <TabsList>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
        </TabsList>

        <TabsContent value="packages">
          {!packages || packages.length === 0 ? (
            <EmptyState title="No packages yet" className="border-none py-8" />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Packages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {packages.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-2 text-sm">
                    <div>
                      <p className="text-foreground">{p.packageId}</p>
                      <p className="text-xs text-muted-foreground">{p.trackingNumber ?? 'No tracking number'}</p>
                    </div>
                    {p.dispatched ? (
                      <StatusBadge status="DISPATCHED" tone="success" />
                    ) : task.status === 'IN_PROGRESS' ? (
                      <Button variant="outline" size="sm" onClick={() => executePackage.mutate(p.id)} disabled={executePackage.isPending}>
                        Mark dispatched
                      </Button>
                    ) : (
                      <StatusBadge status="PENDING" />
                    )}
                  </div>
                ))}
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
                  <StatusBadge status={ex.exceptionType} />
                  <p className="mt-1 text-xs text-muted-foreground">{ex.description}</p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={carrierOpen} onOpenChange={setCarrierOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Set carrier & pickup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Carrier name" htmlFor="disp-carrier">
              <Input id="disp-carrier" value={carrierName} onChange={(e) => setCarrierName(e.target.value)} />
            </FormField>
            <FormField label="Pickup reference" htmlFor="disp-pickup">
              <Input id="disp-pickup" value={pickupReference} onChange={(e) => setPickupReference(e.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCarrierOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                updateTask.mutate(
                  { carrierName: carrierName || undefined, pickupReference: pickupReference || undefined },
                  { onSuccess: () => { setCarrierOpen(false); setCarrierName(''); setPickupReference(''); } },
                )
              }
              disabled={updateTask.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReasonDialog open={cancelOpen} onOpenChange={setCancelOpen} title="Cancel this task" confirmLabel="Cancel" variant="danger" pending={cancel.isPending} onSubmit={(reason) => cancel.mutate(reason, { onSuccess: () => setCancelOpen(false) })} />
      <ReasonDialog open={assignOpen} onOpenChange={setAssignOpen} title="Assign this task" label="Assignee" confirmLabel="Assign" pending={assign.isPending} onSubmit={(value) => assign.mutate(value, { onSuccess: () => setAssignOpen(false) })} />
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
