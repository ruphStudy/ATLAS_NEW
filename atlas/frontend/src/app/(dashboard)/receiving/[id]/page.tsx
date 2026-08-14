'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import { CheckCircle2, Loader2, PlayCircle, RotateCcw, X } from 'lucide-react';
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
import { useCancelReceiving, useCompleteReceiving, useReceiveLines, useReceiving, useReopenReceiving, useStartReceiving } from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { ReceiveLinePayload } from '@/types';

export default function ReceivingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: receiving, isLoading, isError, error, refetch } = useReceiving(id);
  const start = useStartReceiving(id);
  const receiveLinesMutation = useReceiveLines(id);
  const complete = useCompleteReceiving(id);
  const cancel = useCancelReceiving(id);
  const reopen = useReopenReceiving(id);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [lineEdits, setLineEdits] = useState<Record<string, { receivedQuantity: string; acceptedQuantity: string; rejectedQuantity: string; damagedQuantity: string }>>({});

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description="We couldn't load this receiving record." />;
  if (isLoading || !receiving) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const getEdit = (lineId: string) => lineEdits[lineId] ?? { receivedQuantity: '', acceptedQuantity: '', rejectedQuantity: '', damagedQuantity: '' };
  const setEdit = (lineId: string, patch: Partial<ReturnType<typeof getEdit>>) => {
    setLineEdits((prev) => ({ ...prev, [lineId]: { ...getEdit(lineId), ...patch } }));
  };

  const handleReceiveLines = () => {
    const lines: ReceiveLinePayload[] = Object.entries(lineEdits)
      .filter(([, v]) => v.receivedQuantity !== '')
      .map(([lineId, v]) => ({
        lineId,
        receivedQuantity: Number(v.receivedQuantity),
        acceptedQuantity: v.acceptedQuantity ? Number(v.acceptedQuantity) : undefined,
        rejectedQuantity: v.rejectedQuantity ? Number(v.rejectedQuantity) : undefined,
        damagedQuantity: v.damagedQuantity ? Number(v.damagedQuantity) : undefined,
      }));
    if (lines.length === 0) return;
    receiveLinesMutation.mutate({ lines }, { onSuccess: () => setLineEdits({}) });
  };

  const actions: ActionMenuItem[] = [];
  if (receiving.status === 'SCHEDULED') {
    actions.push({ label: 'Start receiving', icon: PlayCircle, onSelect: () => start.mutate({}) });
  }
  if (receiving.status === 'IN_PROGRESS' || receiving.status === 'PARTIALLY_RECEIVED') {
    actions.push({ label: 'Mark complete', icon: CheckCircle2, onSelect: () => complete.mutate(undefined) });
  }
  if (receiving.status === 'COMPLETED' || receiving.status === 'CANCELLED') {
    actions.push({ label: 'Reopen', icon: RotateCcw, onSelect: () => reopen.mutate(undefined) });
  }
  if (!['CANCELLED', 'COMPLETED'].includes(receiving.status)) {
    actions.push({ label: 'Cancel', icon: X, onSelect: () => setCancelOpen(true), destructive: true, separatorBefore: true });
  }

  return (
    <div>
      <PageHeader
        title={receiving.receivingNumber}
        breadcrumbs={[{ label: 'Receiving', href: '/dashboard/receiving' }, { label: receiving.receivingNumber }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={receiving.status} />
            <ActionMenu items={actions} />
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Received" value={String(receiving.receivedQuantity)} />
        <Stat label="Accepted" value={String(receiving.acceptedQuantity)} />
        <Stat label="Rejected" value={String(receiving.rejectedQuantity)} />
        <Stat label="Damaged" value={String(receiving.damagedQuantity)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            <Field label="Type" value={receiving.type.replace(/_/g, ' ')} />
            <Field label="Warehouse" value={receiving.warehouseId} />
            <Field label="Scheduled" value={receiving.scheduledDate ? formatDate(receiving.scheduledDate) : '—'} />
            <Field label="Started" value={receiving.startedAt ? formatDate(receiving.startedAt) : '—'} />
            <Field label="Completed" value={receiving.completedAt ? formatDate(receiving.completedAt) : '—'} />
            <Field label="Received by" value={receiving.receivedBy ?? '—'} />
            {receiving.purchaseOrderId && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Purchase order</p>
                <Link href={`/dashboard/purchase-orders/${receiving.purchaseOrderId}`} className="mt-0.5 inline-block text-sm text-primary hover:underline">
                  View PO
                </Link>
              </div>
            )}
            {receiving.shipmentId && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Shipment</p>
                <Link href={`/dashboard/shipments/${receiving.shipmentId}`} className="mt-0.5 inline-block text-sm text-primary hover:underline">
                  View shipment
                </Link>
              </div>
            )}
            {receiving.notes && <div className="sm:col-span-2"><Field label="Notes" value={receiving.notes} /></div>}
            {receiving.cancelReason && <div className="sm:col-span-2"><Field label="Cancel reason" value={receiving.cancelReason} /></div>}
          </CardContent>
        </Card>
      </div>

      {receiving.lines && receiving.lines.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Accepted</TableHead>
                  <TableHead>Rejected</TableHead>
                  <TableHead>Damaged</TableHead>
                  <TableHead>Discrepancy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receiving.lines.map((line) => {
                  const canEdit = receiving.status === 'IN_PROGRESS' || receiving.status === 'PARTIALLY_RECEIVED';
                  const edit = getEdit(line.id);
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="text-sm text-foreground">
                        {line.productName ?? line.sku ?? '—'}
                        {line.status !== 'PENDING' && <StatusBadge status={line.status} className="ml-2" />}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{line.expectedQuantity}</TableCell>
                      <TableCell>
                        {canEdit ? (
                          <Input type="number" min="0" value={edit.receivedQuantity} onChange={(e) => setEdit(line.id, { receivedQuantity: e.target.value })} className="h-8 w-20" />
                        ) : (
                          <span className="text-sm text-muted-foreground">{line.receivedQuantity}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {canEdit ? (
                          <Input type="number" min="0" value={edit.acceptedQuantity} onChange={(e) => setEdit(line.id, { acceptedQuantity: e.target.value })} className="h-8 w-20" />
                        ) : (
                          <span className="text-sm text-muted-foreground">{line.acceptedQuantity}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {canEdit ? (
                          <Input type="number" min="0" value={edit.rejectedQuantity} onChange={(e) => setEdit(line.id, { rejectedQuantity: e.target.value })} className="h-8 w-20" />
                        ) : (
                          <span className="text-sm text-muted-foreground">{line.rejectedQuantity}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {canEdit ? (
                          <Input type="number" min="0" value={edit.damagedQuantity} onChange={(e) => setEdit(line.id, { damagedQuantity: e.target.value })} className="h-8 w-20" />
                        ) : (
                          <span className="text-sm text-muted-foreground">{line.damagedQuantity}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{line.discrepancyType ? line.discrepancyType.replace(/_/g, ' ') : '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {(receiving.status === 'IN_PROGRESS' || receiving.status === 'PARTIALLY_RECEIVED') && (
              <div className="mt-4 flex justify-end">
                <Button onClick={handleReceiveLines} disabled={receiveLinesMutation.isPending}>
                  {receiveLinesMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save received quantities
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this receiving record"
        confirmLabel="Cancel receiving"
        variant="danger"
        pending={cancel.isPending}
        onSubmit={(reason) => cancel.mutate(reason, { onSuccess: () => setCancelOpen(false) })}
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm capitalize text-foreground">{value}</p>
    </div>
  );
}
