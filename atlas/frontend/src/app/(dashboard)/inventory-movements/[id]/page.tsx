'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import { CheckCircle2, PlayCircle, RotateCcw, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import { useApproveMovement, useCancelMovement, useExecuteMovement, useInventoryMovement, useMovementHistory, useReverseMovement } from '@/hooks';
import { formatDate } from '@/lib/utils';

export default function InventoryMovementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: movement, isLoading, isError, error, refetch } = useInventoryMovement(id);
  const { data: history } = useMovementHistory(id);
  const approve = useApproveMovement(id);
  const execute = useExecuteMovement(id);
  const cancel = useCancelMovement(id);
  const reverse = useReverseMovement(id);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reverseOpen, setReverseOpen] = useState(false);

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description="We couldn't load this movement." />;
  if (isLoading || !movement) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const actions: ActionMenuItem[] = [];
  if (movement.status === 'PENDING_APPROVAL') {
    actions.push({ label: 'Approve', icon: CheckCircle2, onSelect: () => approve.mutate(undefined) });
  }
  if (movement.status === 'APPROVED') {
    actions.push({ label: 'Execute', icon: PlayCircle, onSelect: () => execute.mutate(undefined) });
  }
  if (movement.status === 'EXECUTED') {
    actions.push({ label: 'Reverse', icon: RotateCcw, onSelect: () => setReverseOpen(true), destructive: true });
  }
  if (!['EXECUTED', 'CANCELLED', 'REVERSED'].includes(movement.status)) {
    actions.push({ label: 'Cancel', icon: X, onSelect: () => setCancelOpen(true), destructive: true, separatorBefore: true });
  }

  return (
    <div>
      <PageHeader
        title={`Movement · ${movement.fromStatus} → ${movement.toStatus}`}
        breadcrumbs={[{ label: 'Movements', href: '/dashboard/inventory-movements' }, { label: movement.id }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={movement.status} />
            <ActionMenu items={actions} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            <Field label="Warehouse" value={movement.warehouseId} />
            <Field label="Quantity" value={String(movement.quantity)} />
            <Field label="From location" value={movement.fromLocationId ?? '—'} />
            <Field label="To location" value={movement.toLocationId ?? '—'} />
            <Field label="Executed" value={movement.executedAt ? formatDate(movement.executedAt) : '—'} />
            <Field label="Approved" value={movement.approvedAt ? formatDate(movement.approvedAt) : '—'} />
            <div className="sm:col-span-2"><Field label="Reason" value={movement.reason} /></div>
            {movement.notes && <div className="sm:col-span-2"><Field label="Notes" value={movement.notes} /></div>}
          </CardContent>
        </Card>

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

      <ReasonDialog open={cancelOpen} onOpenChange={setCancelOpen} title="Cancel this movement" confirmLabel="Cancel" variant="danger" pending={cancel.isPending} onSubmit={(reason) => cancel.mutate(reason, { onSuccess: () => setCancelOpen(false) })} />
      <ReasonDialog open={reverseOpen} onOpenChange={setReverseOpen} title="Reverse this movement" confirmLabel="Reverse" variant="danger" pending={reverse.isPending} onSubmit={(reason) => reverse.mutate(reason, { onSuccess: () => setReverseOpen(false) })} />
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
