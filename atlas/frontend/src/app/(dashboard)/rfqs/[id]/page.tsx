'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { Loader2, Send, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import { LandedCostDialog } from '@/components/suppliers/landed-cost-dialog';
import {
  useCancelRfq,
  useCloseRfq,
  useConfirm,
  useCreateQuotationComparison,
  useDeleteRfq,
  useLatestComparisonForRfq,
  useLatestProductCostByRfqSupplier,
  useRfq,
  useSelectComparisonSupplier,
  useSendRfq,
  useSubmitRfqSupplierResponse,
  useSuppliers,
} from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { RfqSupplierResponseStatus } from '@/types';

const RESPONSE_STATUS_OPTIONS: { value: RfqSupplierResponseStatus; label: string }[] = [
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'COUNTER_OFFERED', label: 'Counter offered' },
];

export default function RfqDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const confirm = useConfirm();
  const { data: rfq, isLoading, isError, error, refetch } = useRfq(id);
  const sendRfq = useSendRfq(id);
  const deleteRfq = useDeleteRfq();
  const cancelRfq = useCancelRfq(id);
  const closeRfq = useCloseRfq(id);
  const [cancelOpen, setCancelOpen] = useState(false);

  const isForbidden = isAxiosError(error) && error.response?.status === 403;
  const isNotFound = isAxiosError(error) && error.response?.status === 404;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description={isNotFound ? 'This RFQ could not be found.' : "We couldn't load this RFQ."} />;

  if (isLoading || !rfq) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const handleDelete = async () => {
    const ok = await confirm({ title: 'Delete this RFQ?', description: 'This cannot be undone.', confirmLabel: 'Delete', variant: 'danger' });
    if (ok) deleteRfq.mutate(rfq.id, { onSuccess: () => router.push('/rfqs') });
  };

  const handleClose = async () => {
    const ok = await confirm({ title: 'Close this RFQ?', description: 'No further supplier responses will be accepted.', confirmLabel: 'Close' });
    if (ok) closeRfq.mutate(undefined);
  };

  return (
    <div>
      <PageHeader
        title={rfq.title}
        breadcrumbs={[{ label: 'RFQs', href: '/rfqs' }, { label: rfq.title }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={rfq.status} />
            {rfq.status === 'DRAFT' && (
              <Button onClick={() => sendRfq.mutate()} disabled={sendRfq.isPending}>
                {sendRfq.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </Button>
            )}
            {(rfq.status === 'SENT' || rfq.status === 'PARTIALLY_RESPONDED' || rfq.status === 'RESPONDED') && (
              <Button variant="outline" onClick={handleClose} disabled={closeRfq.isPending}>
                Close
              </Button>
            )}
            {rfq.status !== 'CANCELLED' && rfq.status !== 'CLOSED' && (
              <Button variant="outline" onClick={() => setCancelOpen(true)}>
                <X className="h-4 w-4" />
                Cancel
              </Button>
            )}
            {rfq.status === 'DRAFT' && (
              <Button variant="danger" onClick={handleDelete} disabled={deleteRfq.isPending}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="responses">Supplier responses</TabsTrigger>
          <TabsTrigger value="comparison">Quotation comparison</TabsTrigger>
          <TabsTrigger value="landed-cost">Landed cost</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
              <Field label="RFQ number" value={rfq.rfqNumber} />
              <Field label="Quantity" value={String(rfq.quantity)} />
              <Field label="MOQ" value={rfq.moq != null ? String(rfq.moq) : '—'} />
              <Field label="Target price" value={rfq.targetPrice != null ? formatCurrency(rfq.targetPrice, rfq.currency) : '—'} />
              <Field label="Required delivery" value={rfq.requiredDeliveryDate ? formatDate(rfq.requiredDeliveryDate) : '—'} />
              <Field label="Expires" value={rfq.expiresAt ? formatDate(rfq.expiresAt) : '—'} />
              <Field label="Payment terms" value={rfq.paymentTerms ?? '—'} />
              <Field label="Shipping terms" value={rfq.shippingTerms ?? '—'} />
              {rfq.description && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</p>
                  <p className="mt-0.5 text-sm text-foreground">{rfq.description}</p>
                </div>
              )}
              {rfq.notes && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                  <p className="mt-0.5 text-sm text-foreground">{rfq.notes}</p>
                </div>
              )}
              {rfq.attachments && rfq.attachments.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Attachments</p>
                  <ul className="space-y-1">
                    {rfq.attachments.map((a, i) => (
                      <li key={i}>
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                          {a.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responses">
          <ResponsesTab rfqId={rfq.id} />
        </TabsContent>

        <TabsContent value="comparison">
          <ComparisonTab rfqId={rfq.id} />
        </TabsContent>

        <TabsContent value="landed-cost">
          <LandedCostTab rfqId={rfq.id} />
        </TabsContent>
      </Tabs>

      <ReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this RFQ"
        confirmLabel="Cancel RFQ"
        variant="danger"
        pending={cancelRfq.isPending}
        onSubmit={(reason) => cancelRfq.mutate(reason, { onSuccess: () => setCancelOpen(false) })}
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

function useSupplierNames() {
  const { data } = useSuppliers({ limit: 100 });
  const names = new Map((data?.items ?? []).map((s) => [s.id, s.name]));
  return (id: string) => names.get(id) ?? id;
}

function ResponsesTab({ rfqId }: { rfqId: string }) {
  const { data: rfq } = useRfq(rfqId);
  const submitResponse = useSubmitRfqSupplierResponse(rfqId);
  const supplierName = useSupplierNames();
  const [recordingFor, setRecordingFor] = useState<string | null>(null);
  const [status, setStatus] = useState<RfqSupplierResponseStatus>('ACCEPTED');
  const [quotedPrice, setQuotedPrice] = useState('');
  const [quotedLeadTimeDays, setQuotedLeadTimeDays] = useState('');
  const [quotedMoq, setQuotedMoq] = useState('');
  const [supplierNotes, setSupplierNotes] = useState('');

  if (!rfq) return <Skeleton className="h-40 w-full" />;
  if (!rfq.supplierResponses || rfq.supplierResponses.length === 0) {
    return <EmptyState title="No suppliers yet" description="Send this RFQ to see supplier responses here." className="border-none py-8" />;
  }

  const resetForm = () => {
    setStatus('ACCEPTED');
    setQuotedPrice('');
    setQuotedLeadTimeDays('');
    setQuotedMoq('');
    setSupplierNotes('');
  };

  const handleSubmit = () => {
    if (!recordingFor) return;
    submitResponse.mutate(
      {
        supplierId: recordingFor,
        payload: {
          status,
          quotedPrice: quotedPrice ? Number(quotedPrice) : undefined,
          quotedLeadTimeDays: quotedLeadTimeDays ? Number(quotedLeadTimeDays) : undefined,
          quotedMoq: quotedMoq ? Number(quotedMoq) : undefined,
          supplierNotes: supplierNotes || undefined,
        },
      },
      { onSuccess: () => { setRecordingFor(null); resetForm(); } },
    );
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Supplier</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Quoted price</TableHead>
            <TableHead>Lead time</TableHead>
            <TableHead>MOQ</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rfq.supplierResponses.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-sm text-foreground">{supplierName(r.supplierId)}</TableCell>
              <TableCell>
                <StatusBadge status={r.status} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{r.quotedPrice != null ? formatCurrency(r.quotedPrice, rfq.currency) : '—'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{r.quotedLeadTimeDays != null ? `${r.quotedLeadTimeDays}d` : '—'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{r.quotedMoq ?? '—'}</TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => setRecordingFor(r.supplierId)}>
                  Record response
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!recordingFor} onOpenChange={(o) => { if (!o) { setRecordingFor(null); resetForm(); } }}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Record supplier response</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Status" htmlFor="resp-status" required>
              <Select id="resp-status" value={status} onChange={(e) => setStatus(e.target.value as RfqSupplierResponseStatus)} options={RESPONSE_STATUS_OPTIONS} />
            </FormField>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Quoted price" htmlFor="resp-price">
                <Input id="resp-price" type="number" min="0" step="0.01" value={quotedPrice} onChange={(e) => setQuotedPrice(e.target.value)} />
              </FormField>
              <FormField label="Lead time (days)" htmlFor="resp-lead">
                <Input id="resp-lead" type="number" min="0" value={quotedLeadTimeDays} onChange={(e) => setQuotedLeadTimeDays(e.target.value)} />
              </FormField>
              <FormField label="MOQ" htmlFor="resp-moq">
                <Input id="resp-moq" type="number" min="0" value={quotedMoq} onChange={(e) => setQuotedMoq(e.target.value)} />
              </FormField>
            </div>
            <FormField label="Notes" htmlFor="resp-notes">
              <Input id="resp-notes" value={supplierNotes} onChange={(e) => setSupplierNotes(e.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRecordingFor(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitResponse.isPending}>
              {submitResponse.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ComparisonTab({ rfqId }: { rfqId: string }) {
  const { data: comparison, isLoading, isError } = useLatestComparisonForRfq(rfqId);
  const createComparison = useCreateQuotationComparison(rfqId);
  const selectSupplier = useSelectComparisonSupplier(comparison?.id ?? '', rfqId);
  const confirm = useConfirm();
  const supplierName = useSupplierNames();

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  if (isError || !comparison) {
    return (
      <EmptyState
        title="No comparison yet"
        description="Generate a comparison once suppliers have responded to this RFQ."
        action={{ label: 'Generate comparison', onClick: () => createComparison.mutate({ rfqId }) }}
      />
    );
  }

  const handleSelect = async (supplierId: string) => {
    const ok = await confirm({ title: 'Select this supplier as the winner?', confirmLabel: 'Select' });
    if (ok) selectSupplier.mutate({ supplierId });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusBadge status={comparison.status} />
          <span className="text-xs text-muted-foreground">Version {comparison.version}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => createComparison.mutate({ rfqId })} disabled={createComparison.isPending}>
          {createComparison.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Re-generate
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Unit price</TableHead>
            <TableHead>Lead time</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Recommendation</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {comparison.supplierBreakdowns.map((b) => (
            <TableRow key={b.supplierId}>
              <TableCell className="text-sm text-muted-foreground">#{b.rank}</TableCell>
              <TableCell className="text-sm text-foreground">
                {supplierName(b.supplierId)}
                {comparison.selectedSupplierId === b.supplierId && <StatusBadge status="SELECTED" tone="success" className="ml-2" />}
                {comparison.recommendedSupplierId === b.supplierId && comparison.selectedSupplierId !== b.supplierId && (
                  <StatusBadge status="RECOMMENDED" tone="info" className="ml-2" />
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{b.quotedUnitPrice != null ? b.quotedUnitPrice : '—'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{b.quotedLeadTimeDays != null ? `${b.quotedLeadTimeDays}d` : '—'}</TableCell>
              <TableCell className="text-sm text-foreground">{b.comparisonScore.toFixed(1)}</TableCell>
              <TableCell>
                <StatusBadge status={b.recommendation} />
              </TableCell>
              <TableCell className="text-right">
                {comparison.selectedSupplierId !== b.supplierId && (
                  <Button variant="outline" size="sm" onClick={() => handleSelect(b.supplierId)} disabled={selectSupplier.isPending}>
                    Select
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LandedCostTab({ rfqId }: { rfqId: string }) {
  const { data: rfq } = useRfq(rfqId);
  const supplierName = useSupplierNames();
  const [calculatingFor, setCalculatingFor] = useState<{ supplierId: string; rfqSupplierId: string; quotedPrice?: number | null; quotedMoq?: number | null } | null>(null);

  if (!rfq) return <Skeleton className="h-40 w-full" />;
  if (!rfq.supplierResponses || rfq.supplierResponses.length === 0) {
    return <EmptyState title="No suppliers yet" description="Send this RFQ to compare landed cost across supplier responses." className="border-none py-8" />;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Supplier</TableHead>
            <TableHead>Quoted price</TableHead>
            <TableHead>Landed cost / unit</TableHead>
            <TableHead>Total landed cost</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rfq.supplierResponses.map((r) => (
            <LandedCostRow
              key={r.id}
              rfqId={rfqId}
              rfqSupplierId={r.id}
              supplierId={r.supplierId}
              supplierLabel={supplierName(r.supplierId)}
              quotedPrice={r.quotedPrice}
              quotedMoq={r.quotedMoq}
              currency={rfq.currency}
              onCalculate={() => setCalculatingFor({ supplierId: r.supplierId, rfqSupplierId: r.id, quotedPrice: r.quotedPrice, quotedMoq: r.quotedMoq })}
            />
          ))}
        </TableBody>
      </Table>

      {calculatingFor && (
        <LandedCostDialog
          open={!!calculatingFor}
          onOpenChange={(o) => { if (!o) setCalculatingFor(null); }}
          rfqId={rfqId}
          rfqSupplierId={calculatingFor.rfqSupplierId}
          supplierId={calculatingFor.supplierId}
          productId={rfq.productId ?? undefined}
          initialUnitPrice={calculatingFor.quotedPrice ?? undefined}
          initialQuantity={rfq.quantity}
          initialMoq={calculatingFor.quotedMoq ?? undefined}
          initialCurrency={rfq.currency}
        />
      )}
    </>
  );
}

function LandedCostRow({
  rfqSupplierId,
  supplierLabel,
  quotedPrice,
  currency,
  onCalculate,
}: {
  rfqId: string;
  rfqSupplierId: string;
  supplierId: string;
  supplierLabel: string;
  quotedPrice?: number | null;
  quotedMoq?: number | null;
  currency: string;
  onCalculate: () => void;
}) {
  const { data: cost } = useLatestProductCostByRfqSupplier(rfqSupplierId);

  return (
    <TableRow>
      <TableCell className="text-sm text-foreground">{supplierLabel}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{quotedPrice != null ? formatCurrency(quotedPrice, currency) : '—'}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{cost ? formatCurrency(cost.costPerUnit, cost.targetCurrency) : '—'}</TableCell>
      <TableCell className="text-sm text-foreground">{cost ? formatCurrency(cost.totalLandedCost, cost.targetCurrency) : '—'}</TableCell>
      <TableCell className="text-right">
        <Button variant="outline" size="sm" onClick={onCalculate}>
          {cost ? 'Recalculate' : 'Calculate'}
        </Button>
      </TableCell>
    </TableRow>
  );
}
