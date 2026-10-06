'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { CheckCircle2, PackageCheck, Send, Trash2, Truck, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import { AttachmentsList } from '@/components/suppliers/attachments-list';
import {
  useApproveProcurement,
  useCancelProcurement,
  useCompleteProcurement,
  useConfirm,
  useDeleteProcurement,
  useMarkProcurementInProgress,
  useMarkProcurementOrdered,
  useMarkProcurementPartiallyReceived,
  useProcurement,
  useProcurementHistory,
  usePurchaseOrders,
  useSubmitProcurementForApproval,
} from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ROUTES } from '@/constants';

export default function ProcurementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const confirm = useConfirm();
  const { data: procurement, isLoading, isError, error, refetch } = useProcurement(id);
  const { data: history } = useProcurementHistory(id);
  const submit = useSubmitProcurementForApproval(id);
  const approve = useApproveProcurement(id);
  const markOrdered = useMarkProcurementOrdered(id);
  const markInProgress = useMarkProcurementInProgress(id);
  const markPartiallyReceived = useMarkProcurementPartiallyReceived(id);
  const complete = useCompleteProcurement(id);
  const cancel = useCancelProcurement(id);
  const deleteProcurement = useDeleteProcurement();
  const [cancelOpen, setCancelOpen] = useState(false);

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description="We couldn't load this procurement." />;
  if (isLoading || !procurement) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const handleDelete = async () => {
    const ok = await confirm({ title: 'Delete this procurement?', description: 'This cannot be undone.', confirmLabel: 'Delete', variant: 'danger' });
    if (ok) deleteProcurement.mutate(procurement.id, { onSuccess: () => router.push('/procurement') });
  };

  const actions: ActionMenuItem[] = [];
  if (procurement.status === 'DRAFT') {
    actions.push({ label: 'Submit for approval', icon: Send, onSelect: () => submit.mutate() });
    actions.push({ label: 'Delete', icon: Trash2, onSelect: handleDelete, destructive: true, separatorBefore: true });
  }
  if (procurement.status === 'PENDING_APPROVAL') {
    actions.push({ label: 'Approve', icon: CheckCircle2, onSelect: () => approve.mutate(undefined) });
  }
  if (procurement.status === 'APPROVED') {
    actions.push({ label: 'Mark as ordered', icon: PackageCheck, onSelect: () => markOrdered.mutate() });
  }
  if (procurement.status === 'ORDERED') {
    actions.push({ label: 'Mark in progress', icon: Truck, onSelect: () => markInProgress.mutate() });
  }
  if (procurement.status === 'IN_PROGRESS') {
    actions.push({ label: 'Mark partially received', icon: PackageCheck, onSelect: () => markPartiallyReceived.mutate() });
    actions.push({ label: 'Mark completed', icon: CheckCircle2, onSelect: () => complete.mutate() });
  }
  if (procurement.status === 'PARTIALLY_RECEIVED') {
    actions.push({ label: 'Mark completed', icon: CheckCircle2, onSelect: () => complete.mutate() });
  }
  if (!['COMPLETED', 'CANCELLED'].includes(procurement.status)) {
    actions.push({ label: 'Cancel', icon: X, onSelect: () => setCancelOpen(true), destructive: true, separatorBefore: true });
  }

  return (
    <div>
      <PageHeader
        title={procurement.procurementNumber}
        breadcrumbs={[{ label: 'Procurement', href: '/procurement' }, { label: procurement.procurementNumber }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={procurement.status} />
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
            <Field label="Quantity" value={String(procurement.quantity)} />
            <Field label="Agreed unit cost" value={formatCurrency(procurement.agreedUnitCost, procurement.currency)} />
            <Field label="Total cost" value={formatCurrency(procurement.totalCost, procurement.currency)} />
            <Field label="Expected delivery" value={procurement.expectedDeliveryDate ? formatDate(procurement.expectedDeliveryDate) : '—'} />
            <Field label="Payment terms" value={procurement.paymentTerms ?? '—'} />
            <Field label="Delivery terms" value={procurement.deliveryTerms ?? '—'} />
            <Field label="Procurement owner" value={procurement.procurementOwner ?? '—'} />
            <Field label="Approved" value={procurement.approvedAt ? formatDate(procurement.approvedAt) : '—'} />
            {procurement.rfqId && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source RFQ</p>
                <Link href={`/rfqs/${procurement.rfqId}`} className="mt-0.5 inline-block text-sm text-primary hover:underline">
                  View RFQ
                </Link>
              </div>
            )}
            {procurement.supplierId && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Supplier</p>
                <Link href={`${ROUTES.SUPPLIERS}/${procurement.supplierId}`} className="mt-0.5 inline-block text-sm text-primary hover:underline">
                  View supplier
                </Link>
              </div>
            )}
            {procurement.notes && (
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                <p className="mt-0.5 text-sm text-foreground">{procurement.notes}</p>
              </div>
            )}
            {procurement.cancelReason && (
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cancel reason</p>
                <p className="mt-0.5 text-sm text-foreground">{procurement.cancelReason}</p>
              </div>
            )}
            <AttachmentsList attachments={procurement.attachments} />
          </CardContent>
        </Card>

        <div className="space-y-6">
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
                      <span className="text-foreground">{h.fromStatus} → {h.toStatus}</span>
                      <span className="ml-2 text-muted-foreground">{formatDate(h.createdAt)}</span>
                      {h.reason && <p className="text-muted-foreground">{h.reason}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Purchase orders</CardTitle>
            </CardHeader>
            <CardContent>
              <LinkedPurchaseOrders procurementId={procurement.id} />
            </CardContent>
          </Card>
        </div>
      </div>

      <ReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this procurement"
        confirmLabel="Cancel procurement"
        variant="danger"
        pending={cancel.isPending}
        onSubmit={(reason) => cancel.mutate(reason, { onSuccess: () => setCancelOpen(false) })}
      />
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

function LinkedPurchaseOrders({ procurementId }: { procurementId: string }) {
  const { data } = usePurchaseOrders({ procurementId, limit: 20 });
  if (!data || data.items.length === 0) {
    return <EmptyState title="No purchase orders" description="No POs have been issued from this procurement yet." className="border-none py-6" />;
  }
  return (
    <ul className="space-y-2">
      {data.items.map((po) => (
        <li key={po.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-2 text-sm">
          <Link href={`/purchase-orders/${po.id}`} className="font-medium text-foreground hover:underline">
            {po.poNumber}
          </Link>
          <StatusBadge status={po.status} />
        </li>
      ))}
    </ul>
  );
}
