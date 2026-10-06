'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { CheckCircle2, PackageCheck, Send, Trash2, Truck, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import { AttachmentsList } from '@/components/suppliers/attachments-list';
import { LinkedReceivings } from '@/components/suppliers/linked-receivings';
import {
  useAcknowledgePurchaseOrder,
  useApprovePurchaseOrder,
  useCancelPurchaseOrder,
  useClosePurchaseOrder,
  useConfirm,
  useDeletePurchaseOrder,
  useIssuePurchaseOrder,
  useMarkPurchaseOrderFulfilled,
  useMarkPurchaseOrderPartiallyFulfilled,
  usePurchaseOrder,
  usePurchaseOrderHistory,
  useSubmitPurchaseOrderForApproval,
} from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const confirm = useConfirm();
  const { data: po, isLoading, isError, error, refetch } = usePurchaseOrder(id);
  const { data: history } = usePurchaseOrderHistory(id);
  const submit = useSubmitPurchaseOrderForApproval(id);
  const approve = useApprovePurchaseOrder(id);
  const issue = useIssuePurchaseOrder(id);
  const acknowledge = useAcknowledgePurchaseOrder(id);
  const markPartiallyFulfilled = useMarkPurchaseOrderPartiallyFulfilled(id);
  const markFulfilled = useMarkPurchaseOrderFulfilled(id);
  const close = useClosePurchaseOrder(id);
  const cancel = useCancelPurchaseOrder(id);
  const deletePO = useDeletePurchaseOrder();
  const [cancelOpen, setCancelOpen] = useState(false);

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description="We couldn't load this purchase order." />;
  if (isLoading || !po) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const handleDelete = async () => {
    const ok = await confirm({ title: 'Delete this purchase order?', description: 'This cannot be undone.', confirmLabel: 'Delete', variant: 'danger' });
    if (ok) deletePO.mutate(po.id, { onSuccess: () => router.push('/dashboard/purchase-orders') });
  };

  const actions: ActionMenuItem[] = [];
  if (po.status === 'DRAFT') {
    actions.push({ label: 'Submit for approval', icon: Send, onSelect: () => submit.mutate() });
    actions.push({ label: 'Delete', icon: Trash2, onSelect: handleDelete, destructive: true, separatorBefore: true });
  }
  if (po.status === 'PENDING_APPROVAL') {
    actions.push({ label: 'Approve', icon: CheckCircle2, onSelect: () => approve.mutate(undefined) });
  }
  if (po.status === 'APPROVED') {
    actions.push({ label: 'Issue to supplier', icon: Send, onSelect: () => issue.mutate() });
  }
  if (po.status === 'ISSUED') {
    actions.push({ label: 'Acknowledge', icon: CheckCircle2, onSelect: () => acknowledge.mutate(undefined) });
  }
  if (po.status === 'ACKNOWLEDGED') {
    actions.push({ label: 'Mark partially fulfilled', icon: PackageCheck, onSelect: () => markPartiallyFulfilled.mutate() });
    actions.push({ label: 'Mark fulfilled', icon: Truck, onSelect: () => markFulfilled.mutate() });
  }
  if (po.status === 'PARTIALLY_FULFILLED') {
    actions.push({ label: 'Mark fulfilled', icon: Truck, onSelect: () => markFulfilled.mutate() });
  }
  if (po.status === 'FULFILLED') {
    actions.push({ label: 'Close', icon: CheckCircle2, onSelect: () => close.mutate() });
  }
  if (!['CLOSED', 'CANCELLED'].includes(po.status)) {
    actions.push({ label: 'Cancel', icon: X, onSelect: () => setCancelOpen(true), destructive: true, separatorBefore: true });
  }

  return (
    <div>
      <PageHeader
        title={po.poNumber}
        breadcrumbs={[{ label: 'Purchase Orders', href: '/dashboard/purchase-orders' }, { label: po.poNumber }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={po.status} />
            <ActionMenu items={actions} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Line items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit price</TableHead>
                    <TableHead>Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {po.lineItems.map((li, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm text-foreground">{li.description}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{li.sku ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{li.quantity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatCurrency(li.unitPrice, po.currency)}</TableCell>
                      <TableCell className="text-sm text-foreground">{formatCurrency(li.quantity * li.unitPrice, po.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-end">
                <p className="text-sm font-semibold text-foreground">Total: {formatCurrency(po.totalAmount, po.currency)}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            {po.billingAddress && <AddressCard title="Billing address" address={po.billingAddress} />}
            {po.shippingAddress && <AddressCard title="Shipping address" address={po.shippingAddress} />}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Field label="Version" value={String(po.version)} />
              <Field label="Incoterms" value={po.incoterms ?? '—'} />
              <Field label="Payment terms" value={po.paymentTerms ?? '—'} />
              <Field label="Shipping terms" value={po.shippingTerms ?? '—'} />
              <Field label="Expected dispatch" value={po.expectedDispatchDate ? formatDate(po.expectedDispatchDate) : '—'} />
              <Field label="Expected delivery" value={po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : '—'} />
              <Field label="Issued" value={po.issuedAt ? formatDate(po.issuedAt) : '—'} />
              <Field label="Acknowledged" value={po.acknowledgedAt ? formatDate(po.acknowledgedAt) : '—'} />
              {po.notes && <Field label="Notes" value={po.notes} />}
              {po.cancelReason && <Field label="Cancel reason" value={po.cancelReason} />}
              <AttachmentsList attachments={po.attachments} />
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
                      <span className="text-foreground">{h.fromStatus} → {h.toStatus}</span>
                      <span className="ml-2 text-muted-foreground">{formatDate(h.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Receiving</CardTitle>
            </CardHeader>
            <CardContent>
              <LinkedReceivings purchaseOrderId={po.id} supplierId={po.supplierId ?? undefined} />
            </CardContent>
          </Card>
        </div>
      </div>

      <ReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this purchase order"
        confirmLabel="Cancel PO"
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

function AddressCard({ title, address }: { title: string; address: NonNullable<ReturnType<typeof usePurchaseOrder>['data']>['billingAddress'] }) {
  if (!address) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-foreground">
        {address.companyName && <p className="font-medium">{address.companyName}</p>}
        <p>{address.street}</p>
        <p>{[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}</p>
        <p>{address.country}</p>
        {address.contactName && <p className="text-muted-foreground">{address.contactName}</p>}
        {address.contactPhone && <p className="text-muted-foreground">{address.contactPhone}</p>}
      </CardContent>
    </Card>
  );
}
