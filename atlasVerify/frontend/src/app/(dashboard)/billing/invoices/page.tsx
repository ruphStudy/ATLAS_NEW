'use client';

import { useMemo, useState } from 'react';
import { Ban, Download, RotateCcw, Send, ShieldCheck, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  useCancelInvoice,
  useConfirm,
  useDownloadInvoice,
  useInvoice,
  useInvoiceHistory,
  useInvoices,
  useIssueInvoice,
  useSendInvoice,
  useVoidInvoice,
} from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { InvoiceFilterParams, InvoiceStatus, InvoiceType } from '@/types';

const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PARTIALLY_PAID', label: 'Partially paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'VOIDED', label: 'Voided' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
];

const TYPE_OPTIONS: { value: InvoiceType; label: string }[] = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'PROFORMA', label: 'Proforma' },
  { value: 'CREDIT_NOTE', label: 'Credit note' },
  { value: 'ONE_TIME', label: 'One-time' },
];

export default function InvoicesPage() {
  const [status, setStatus] = useState<InvoiceStatus | ''>('');
  const [type, setType] = useState<InvoiceType | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const params = useMemo<InvoiceFilterParams>(
    () => ({ status: status || undefined, type: type || undefined, search: search || undefined, page, limit }),
    [status, type, search, page, limit],
  );

  const invoices = useInvoices(params);
  const rows = invoices.data?.data ?? [];
  const hasActiveFilters = !!(status || type || search);

  return (
    <div>
      <PageHeader title="Invoices" description="Invoice history, status, due dates, tax breakdown and payment references." />

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search invoice number…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setStatus('');
          setType('');
          setSearch('');
          setPage(1);
        }}
        className="mb-4"
      >
        <Select value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus | '')} options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]} className="h-9 w-44" />
        <Select value={type} onChange={(e) => setType(e.target.value as InvoiceType | '')} options={[{ value: '', label: 'All types' }, ...TYPE_OPTIONS]} className="h-9 w-40" />
      </FilterBar>

      {invoices.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : invoices.isError ? (
        <QueryErrorState refetch={invoices.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No invoices yet" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Balance due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((inv) => (
                <TableRow key={inv.id} className="cursor-pointer" onClick={() => setSelectedId(inv.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{inv.invoiceNumber}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {inv.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatCurrency(inv.total, inv.currency)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatCurrency(inv.balanceDue, inv.currency)}</TableCell>
                  <TableCell>
                    <StatusBadge status={inv.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(inv.dueDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={invoices.data?.page ?? page}
            limit={invoices.data?.limit ?? limit}
            total={invoices.data?.total ?? 0}
            totalPages={invoices.data?.totalPages ?? 0}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </>
      )}

      <InvoiceDetailDrawer id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function InvoiceDetailDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: invoice, isLoading } = useInvoice(id ?? undefined);
  const history = useInvoiceHistory(id ?? undefined);
  const confirm = useConfirm();
  const issue = useIssueInvoice(id ?? '');
  const send = useSendInvoice(id ?? '');
  const download = useDownloadInvoice(id ?? '', invoice?.documentId, invoice?.invoiceNumber ?? '');
  const voidInvoice = useVoidInvoice(id ?? '');
  const cancelInvoice = useCancelInvoice(id ?? '');

  if (!id) return null;

  const handleVoid = async () => {
    const ok = await confirm({ title: 'Void this invoice?', description: 'This cannot be undone.', confirmLabel: 'Void invoice', variant: 'danger' });
    if (ok) voidInvoice.mutate({ reason: 'Voided from billing dashboard' });
  };

  const handleCancel = async () => {
    const ok = await confirm({ title: 'Cancel this invoice?', description: 'This cannot be undone.', confirmLabel: 'Cancel invoice', variant: 'danger' });
    if (ok) cancelInvoice.mutate({ reason: 'Cancelled from billing dashboard' });
  };

  const actions: ActionMenuItem[] = invoice
    ? [
        ...(invoice.status === 'DRAFT' ? [{ label: 'Issue', icon: ShieldCheck, onSelect: () => issue.mutate() }] : []),
        ...(invoice.status !== 'DRAFT' ? [{ label: 'Send', icon: Send, onSelect: () => send.mutate({}) }] : []),
        { label: 'Download', icon: Download, onSelect: () => download.mutate() },
        ...(invoice.status !== 'VOIDED' && invoice.status !== 'CANCELLED' ? [{ label: 'Void', icon: XCircle, onSelect: handleVoid, destructive: true, separatorBefore: true }] : []),
        ...(invoice.status !== 'CANCELLED' && invoice.status !== 'VOIDED' ? [{ label: 'Cancel', icon: Ban, onSelect: handleCancel, destructive: true }] : []),
      ]
    : [];

  return (
    <Drawer open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent size="lg">
        <DrawerHeader>
          <DrawerTitle className="flex items-center justify-between">
            <span>{invoice?.invoiceNumber ?? 'Invoice'}</span>
            <ActionMenu items={actions} />
          </DrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          {isLoading || !invoice ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <StatusBadge status={invoice.status} />
                <Badge variant="secondary" className="text-[10px]">
                  {invoice.type}
                </Badge>
                <StatusBadge status={invoice.deliveryStatus} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Issue date" value={invoice.issueDate ? formatDate(invoice.issueDate) : '—'} />
                <Field label="Due date" value={formatDate(invoice.dueDate)} />
                <Field label="Downloads" value={String(invoice.downloadCount)} />
                <Field label="Send attempts" value={String(invoice.sendAttempts)} />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Line items</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.lineItems.map((li, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm text-foreground">{li.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{li.quantity ?? '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatCurrency(li.amount, invoice.currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {invoice.taxBreakdown.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tax breakdown</p>
                  <div className="space-y-1 text-sm">
                    {invoice.taxBreakdown.map((t, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t.label} ({t.ratePercent}%)
                        </span>
                        <span className="text-foreground">{formatCurrency(t.amount, invoice.currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1 border-t border-border pt-3 text-sm">
                <Row label="Subtotal" value={formatCurrency(invoice.subtotal, invoice.currency)} />
                <Row label="Discount" value={`-${formatCurrency(invoice.discountTotal, invoice.currency)}`} />
                <Row label="Credit" value={`-${formatCurrency(invoice.creditTotal, invoice.currency)}`} />
                <Row label="Tax" value={formatCurrency(invoice.taxTotal, invoice.currency)} />
                <Row label="Total" value={formatCurrency(invoice.total, invoice.currency)} bold />
                <Row label="Amount paid" value={formatCurrency(invoice.amountPaid, invoice.currency)} />
                <Row label="Balance due" value={formatCurrency(invoice.balanceDue, invoice.currency)} bold />
              </div>

              {(invoice.paymentReference || invoice.refundReference || invoice.creditNoteReference) && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">References</p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {invoice.paymentReference && <p>Payment: {JSON.stringify(invoice.paymentReference)}</p>}
                    {invoice.refundReference && <p>Refund: {JSON.stringify(invoice.refundReference)}</p>}
                    {invoice.creditNoteReference && <p>Credit note: {JSON.stringify(invoice.creditNoteReference)}</p>}
                  </div>
                </div>
              )}

              {history.data && history.data.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</p>
                  <div className="space-y-2">
                    {history.data.map((h) => (
                      <div key={h.id} className="flex items-start gap-2 text-sm">
                        <RotateCcw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div>
                          <p className="text-foreground">{h.changeType.replace(/_/g, ' ').toLowerCase()}</p>
                          {h.reason && <p className="text-xs text-muted-foreground">{h.reason}</p>}
                          <p className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
      <span>{label}</span>
      <span className={bold ? 'text-foreground' : ''}>{value}</span>
    </div>
  );
}
