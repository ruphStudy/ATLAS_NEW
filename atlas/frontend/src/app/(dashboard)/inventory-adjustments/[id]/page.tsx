'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import { CheckCircle2, RotateCcw, Send, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useAdjustmentHistory,
  useApproveAdjustment,
  useCancelAdjustment,
  useInventoryAdjustment,
  usePostAdjustment,
  useRejectAdjustment,
  useReverseAdjustment,
} from '@/hooks';
import { formatDate } from '@/lib/utils';

export default function InventoryAdjustmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: adjustment, isLoading, isError, error, refetch } = useInventoryAdjustment(id);
  const { data: history } = useAdjustmentHistory(id);
  const approve = useApproveAdjustment(id);
  const reject = useRejectAdjustment(id);
  const post = usePostAdjustment(id);
  const cancel = useCancelAdjustment(id);
  const reverse = useReverseAdjustment(id);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reverseOpen, setReverseOpen] = useState(false);

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description="We couldn't load this adjustment." />;
  if (isLoading || !adjustment) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const actions: ActionMenuItem[] = [];
  if (adjustment.status === 'PENDING_APPROVAL') {
    actions.push({ label: 'Approve', icon: CheckCircle2, onSelect: () => approve.mutate(undefined) });
    actions.push({ label: 'Reject', icon: X, onSelect: () => setRejectOpen(true), destructive: true });
  }
  if (adjustment.status === 'APPROVED') {
    actions.push({ label: 'Post', icon: Send, onSelect: () => post.mutate(undefined) });
  }
  if (adjustment.status === 'POSTED') {
    actions.push({ label: 'Reverse', icon: RotateCcw, onSelect: () => setReverseOpen(true), destructive: true });
  }
  if (!['POSTED', 'REJECTED', 'CANCELLED', 'REVERSED'].includes(adjustment.status)) {
    actions.push({ label: 'Cancel', icon: X, onSelect: () => setCancelOpen(true), destructive: true, separatorBefore: true });
  }

  return (
    <div>
      <PageHeader
        title={`Adjustment · ${adjustment.type.replace(/_/g, ' ')}`}
        breadcrumbs={[{ label: 'Adjustments', href: '/dashboard/inventory-adjustments' }, { label: adjustment.id }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={adjustment.status} />
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
            <Field label="Warehouse" value={adjustment.warehouseId} />
            <Field label="From status" value={adjustment.fromStatus ?? '—'} />
            <Field label="To status" value={adjustment.toStatus ?? '—'} />
            <Field label="Quantity" value={adjustment.quantity != null ? String(adjustment.quantity) : '—'} />
            <Field label="Quantity delta" value={adjustment.quantityDelta != null ? String(adjustment.quantityDelta) : '—'} />
            <Field label="Unit cost" value={adjustment.unitCost != null ? String(adjustment.unitCost) : '—'} />
            <Field label="Quantity before → after" value={adjustment.quantityBefore != null ? `${adjustment.quantityBefore} → ${adjustment.quantityAfter}` : '—'} />
            <Field label="Value before → after" value={adjustment.valueBefore != null ? `${adjustment.valueBefore} → ${adjustment.valueAfter}` : '—'} />
            <div className="sm:col-span-2"><Field label="Reason" value={adjustment.reason} /></div>
            {adjustment.notes && <div className="sm:col-span-2"><Field label="Notes" value={adjustment.notes} /></div>}
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

      <ReasonDialog open={rejectOpen} onOpenChange={setRejectOpen} title="Reject this adjustment" confirmLabel="Reject" variant="danger" pending={reject.isPending} onSubmit={(reason) => reject.mutate(reason, { onSuccess: () => setRejectOpen(false) })} />
      <ReasonDialog open={cancelOpen} onOpenChange={setCancelOpen} title="Cancel this adjustment" confirmLabel="Cancel" variant="danger" pending={cancel.isPending} onSubmit={(reason) => cancel.mutate(reason, { onSuccess: () => setCancelOpen(false) })} />
      <ReasonDialog open={reverseOpen} onOpenChange={setReverseOpen} title="Reverse this adjustment" confirmLabel="Reverse" variant="danger" pending={reverse.isPending} onSubmit={(reason) => reverse.mutate(reason, { onSuccess: () => setReverseOpen(false) })} />
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
