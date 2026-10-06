'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import { CheckCircle2, PauseCircle, PlayCircle, Plus, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useAssignPackingTask,
  useCancelPackingTask,
  useCompletePackingTask,
  useCreatePackingPackage,
  useExecutePackingLine,
  usePackingExceptions,
  usePackingTask,
  usePackingTaskPackages,
  usePausePackingTask,
  useResumePackingTask,
  useStartPackingTask,
} from '@/hooks';
import type { PackageType } from '@/types';

const PACKAGE_TYPE_OPTIONS: { value: PackageType; label: string }[] = [
  { value: 'BOX', label: 'Box' },
  { value: 'ENVELOPE', label: 'Envelope' },
  { value: 'TUBE', label: 'Tube' },
  { value: 'PALLET', label: 'Pallet' },
  { value: 'CRATE', label: 'Crate' },
  { value: 'POLYBAG', label: 'Polybag' },
  { value: 'CUSTOM', label: 'Custom' },
];

export default function PackingTaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: task, isLoading, isError, error, refetch } = usePackingTask(id);
  const { data: packages } = usePackingTaskPackages(id);
  const { data: exceptions } = usePackingExceptions(id);
  const assign = useAssignPackingTask(id);
  const start = useStartPackingTask(id);
  const pause = usePausePackingTask(id);
  const resume = useResumePackingTask(id);
  const execute = useExecutePackingLine(id);
  const createPackage = useCreatePackingPackage(id);
  const complete = useCompletePackingTask(id);
  const cancel = useCancelPackingTask(id);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  const [packageType, setPackageType] = useState<PackageType>('BOX');
  const [weight, setWeight] = useState('');
  const [packInputs, setPackInputs] = useState<Record<string, string>>({});

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description="We couldn't load this packing task." />;
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
    actions.push({ label: 'Pause', icon: PauseCircle, onSelect: () => pause.mutate(undefined) });
    actions.push({ label: 'Complete', icon: CheckCircle2, onSelect: () => complete.mutate(undefined) });
  }
  if (task.status === 'PAUSED') {
    actions.push({ label: 'Resume', icon: PlayCircle, onSelect: () => resume.mutate(undefined) });
  }
  if (!['COMPLETED', 'CANCELLED'].includes(task.status)) {
    actions.push({ label: 'Cancel', icon: X, onSelect: () => setCancelOpen(true), destructive: true, separatorBefore: true });
  }

  return (
    <div>
      <PageHeader
        title={task.taskNumber}
        breadcrumbs={[{ label: 'Packing', href: '/packing' }, { label: task.taskNumber }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={task.status} />
            <ActionMenu items={actions} />
          </div>
        }
      />

      <Tabs defaultValue="packages">
        <TabsList>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
        </TabsList>

        <TabsContent value="packages">
          <div className="mb-3 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setPackageOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add package
            </Button>
          </div>
          {!packages || packages.length === 0 ? (
            <EmptyState title="No packages yet" className="border-none py-8" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {packages.map((p) => (
                <Card key={p.id}>
                  <CardHeader>
                    <CardTitle className="text-sm">{p.packageNumber}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 text-sm">
                    <Field label="Type" value={p.packageType} />
                    <Field label="Weight" value={p.weight != null ? `${p.weight} ${p.weightUnit}` : '—'} />
                    <Field label="Shipment ready" value={p.shipmentReady ? 'Yes' : 'No'} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {task.lines && task.lines.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm">Lines</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Picked</TableHead>
                      <TableHead>Packed</TableHead>
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
                        <TableCell className="text-sm text-muted-foreground">{line.pickedQuantity}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{line.packedQuantity}</TableCell>
                        <TableCell className="text-right">
                          {task.status === 'IN_PROGRESS' && line.status !== 'COMPLETED' && (
                            <div className="flex items-center justify-end gap-2">
                              <Input
                                type="number"
                                min="0"
                                placeholder="Qty"
                                value={packInputs[line.id] ?? ''}
                                onChange={(e) => setPackInputs((prev) => ({ ...prev, [line.id]: e.target.value }))}
                                className="h-8 w-20"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => packInputs[line.id] && execute.mutate({ lineId: line.id, packedQuantity: Number(packInputs[line.id]) })}
                                disabled={!packInputs[line.id] || execute.isPending}
                              >
                                Pack
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
                  <StatusBadge status={ex.exceptionType} />
                  <p className="mt-1 text-xs text-muted-foreground">{ex.description}</p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={packageOpen} onOpenChange={setPackageOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Add package</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Package type" htmlFor="pkg-type" required>
              <Select id="pkg-type" value={packageType} onChange={(e) => setPackageType(e.target.value as PackageType)} options={PACKAGE_TYPE_OPTIONS} />
            </FormField>
            <FormField label="Weight" htmlFor="pkg-weight">
              <Input id="pkg-weight" type="number" min="0" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPackageOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createPackage.mutate({ packageType, weight: weight ? Number(weight) : undefined }, { onSuccess: () => { setPackageOpen(false); setWeight(''); } })}
              disabled={createPackage.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReasonDialog open={cancelOpen} onOpenChange={setCancelOpen} title="Cancel this task" confirmLabel="Cancel" variant="danger" pending={cancel.isPending} onSubmit={(reason) => cancel.mutate(reason, { onSuccess: () => setCancelOpen(false) })} />
      <ReasonDialog open={assignOpen} onOpenChange={setAssignOpen} title="Assign this task" label="Assignee" confirmLabel="Assign" pending={assign.isPending} onSubmit={(value) => assign.mutate(value, { onSuccess: () => setAssignOpen(false) })} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-foreground capitalize">{value}</p>
    </div>
  );
}
