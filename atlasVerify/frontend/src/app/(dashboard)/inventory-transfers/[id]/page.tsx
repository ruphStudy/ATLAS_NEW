'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import { CheckCircle2, Loader2, PackageCheck, RotateCcw, Send, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useApproveInventoryTransfer,
  useCancelInventoryTransfer,
  useDispatchInventoryTransfer,
  useInventoryTransfer,
  useInventoryTransferHistory,
  useReceiveInventoryTransfer,
  useReverseInventoryTransfer,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { ReceiveTransferLineInput } from '@/types';

export default function InventoryTransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: transfer, isLoading, isError, error, refetch } = useInventoryTransfer(id);
  const { data: history } = useInventoryTransferHistory(id);
  const approve = useApproveInventoryTransfer(id);
  const dispatch = useDispatchInventoryTransfer(id);
  const receive = useReceiveInventoryTransfer(id);
  const cancel = useCancelInventoryTransfer(id);
  const reverse = useReverseInventoryTransfer(id);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reverseOpen, setReverseOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, string>>({});

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description="We couldn't load this transfer." />;
  if (isLoading || !transfer) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const handleReceive = () => {
    const lines: ReceiveTransferLineInput[] = Object.entries(receiveQuantities)
      .filter(([, v]) => v)
      .map(([lineId, v]) => ({ lineId, receivedQuantity: Number(v) }));
    if (lines.length === 0) return;
    receive.mutate({ lines }, { onSuccess: () => { setReceiveOpen(false); setReceiveQuantities({}); } });
  };

  const actions: ActionMenuItem[] = [];
  if (transfer.status === 'PENDING') {
    actions.push({ label: 'Approve', icon: CheckCircle2, onSelect: () => approve.mutate(undefined) });
  }
  if (transfer.status === 'APPROVED') {
    actions.push({ label: 'Dispatch', icon: Send, onSelect: () => dispatch.mutate(undefined) });
  }
  if (transfer.status === 'DISPATCHED' || transfer.status === 'IN_TRANSIT' || transfer.status === 'PARTIALLY_RECEIVED') {
    actions.push({ label: 'Receive', icon: PackageCheck, onSelect: () => setReceiveOpen(true) });
  }
  if (transfer.status === 'RECEIVED') {
    actions.push({ label: 'Reverse', icon: RotateCcw, onSelect: () => setReverseOpen(true), destructive: true });
  }
  if (!['RECEIVED', 'CANCELLED', 'REVERSED'].includes(transfer.status)) {
    actions.push({ label: 'Cancel', icon: X, onSelect: () => setCancelOpen(true), destructive: true, separatorBefore: true });
  }

  return (
    <div>
      <PageHeader
        title={transfer.transferNumber}
        breadcrumbs={[{ label: 'Transfers', href: '/dashboard/inventory-transfers' }, { label: transfer.transferNumber }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={transfer.status} />
            <ActionMenu items={actions} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
              <Field label="Source warehouse" value={transfer.sourceWarehouseId} />
              <Field label="Destination warehouse" value={transfer.destinationWarehouseId} />
              <Field label="Shipment reference" value={transfer.shipmentReference ?? '—'} />
              <Field label="Dispatched" value={transfer.dispatchedAt ? formatDate(transfer.dispatchedAt) : '—'} />
              <Field label="Received" value={transfer.receivedAt ? formatDate(transfer.receivedAt) : '—'} />
              <div className="sm:col-span-2"><Field label="Reason" value={transfer.reason} /></div>
              {transfer.notes && <div className="sm:col-span-2"><Field label="Notes" value={transfer.notes} /></div>}
            </CardContent>
          </Card>

          {transfer.lines && transfer.lines.length > 0 && (
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
                      <TableHead>Requested</TableHead>
                      <TableHead>Dispatched</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Damaged</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfer.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="text-sm text-foreground">{line.sku ?? line.inventoryItemId}</TableCell>
                        <TableCell>
                          <StatusBadge status={line.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{line.requestedQuantity}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{line.dispatchedQuantity}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{line.receivedQuantity}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{line.damagedQuantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">History</CardTitle>
          </CardHeader>
          <CardContent>
            {!history || history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history yet.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((h) => (
                  <li key={h.id} className="text-xs">
                    <span className="text-foreground">{h.fromStatus ?? 'Created'} → {h.toStatus}</span>
                    <span className="ml-2 text-muted-foreground">{formatDate(h.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Receive transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(transfer.lines ?? []).map((line) => (
              <div key={line.id} className="flex items-center justify-between gap-2">
                <span className="text-sm text-foreground">{line.sku ?? line.inventoryItemId}</span>
                <Input
                  type="number"
                  min="0"
                  placeholder={String(line.requestedQuantity)}
                  value={receiveQuantities[line.id] ?? ''}
                  onChange={(e) => setReceiveQuantities((prev) => ({ ...prev, [line.id]: e.target.value }))}
                  className="h-9 w-28"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReceive} disabled={receive.isPending}>
              {receive.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReasonDialog open={cancelOpen} onOpenChange={setCancelOpen} title="Cancel this transfer" confirmLabel="Cancel" variant="danger" pending={cancel.isPending} onSubmit={(reason) => cancel.mutate(reason, { onSuccess: () => setCancelOpen(false) })} />
      <ReasonDialog open={reverseOpen} onOpenChange={setReverseOpen} title="Reverse this transfer" confirmLabel="Reverse" variant="danger" pending={reverse.isPending} onSubmit={(reason) => reverse.mutate(reason, { onSuccess: () => setReverseOpen(false) })} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{value}</p>
    </div>
  );
}
