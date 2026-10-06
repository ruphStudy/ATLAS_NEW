'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { Edit, Loader2, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AnalysisBlock } from '@/components/product-intelligence/analysis-block';
import { TierBadge } from '@/components/suppliers/tier-badge';
import { SupplierFormDialog } from '@/components/suppliers/supplier-form-dialog';
import {
  useConfirm,
  useDeleteSupplier,
  useLatestSupplierVerification,
  useProcurements,
  usePurchaseOrders,
  useQualityInspections,
  useRfqs,
  useShipments,
  useStartSupplierVerification,
  useSupplier,
  useSupplierPerformance,
  useSupplierStatusHistory,
  useUpdateSupplierStatus,
} from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { SupplierStatus } from '@/types';

const STATUS_OPTIONS: { value: SupplierStatus; label: string }[] = [
  { value: 'PROSPECT', label: 'Prospect' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PREFERRED', label: 'Preferred' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const confirm = useConfirm();
  const { data: supplier, isLoading, isError, error, refetch } = useSupplier(id);
  const deleteSupplier = useDeleteSupplier();
  const updateStatus = useUpdateSupplierStatus(id);
  const [editOpen, setEditOpen] = useState(false);

  const isForbidden = isAxiosError(error) && error.response?.status === 403;
  const isNotFound = isAxiosError(error) && error.response?.status === 404;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description={isNotFound ? 'This supplier could not be found.' : "We couldn't load this supplier."} />;

  if (isLoading || !supplier) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const handleDelete = async () => {
    const ok = await confirm({ title: 'Delete this supplier?', description: 'This cannot be undone.', confirmLabel: 'Delete', variant: 'danger' });
    if (ok) deleteSupplier.mutate(supplier.id, { onSuccess: () => router.push('/dashboard/suppliers') });
  };

  const handleStatusChange = async (next: SupplierStatus) => {
    if (next === supplier.status) return;
    const ok = await confirm({ title: `Change status to ${next.toLowerCase()}?`, confirmLabel: 'Confirm', variant: next === 'SUSPENDED' || next === 'REJECTED' ? 'danger' : 'default' });
    if (ok) updateStatus.mutate({ status: next });
  };

  return (
    <div>
      <PageHeader
        title={supplier.name}
        breadcrumbs={[{ label: 'Suppliers', href: '/dashboard/suppliers' }, { label: supplier.name }]}
        actions={
          <div className="flex items-center gap-2">
            <TierBadge tier={supplier.tier} />
            <Select
              value={supplier.status}
              onChange={(e) => handleStatusChange(e.target.value as SupplierStatus)}
              options={STATUS_OPTIONS}
              className="h-9 w-36"
              disabled={updateStatus.isPending}
            />
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleteSupplier.isPending}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Verification" value={supplier.verificationScore != null ? `${supplier.verificationScore}/100` : '—'} />
        <Stat label="Risk" value={supplier.riskScore != null ? `${supplier.riskScore}/100` : '—'} />
        <Stat label="Performance" value={supplier.performanceScore != null ? `${supplier.performanceScore}/100` : '—'} />
        <Stat label="Rating" value={supplier.overallRating != null ? `${supplier.overallRating}/5` : '—'} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="rfqs">RFQs</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="shipments">Shipments</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab supplierId={supplier.id} />
        </TabsContent>
        <TabsContent value="verification">
          <VerificationTab supplierId={supplier.id} />
        </TabsContent>
        <TabsContent value="rfqs">
          <RfqsTab supplierId={supplier.id} />
        </TabsContent>
        <TabsContent value="purchase-orders">
          <PurchaseOrdersTab supplierId={supplier.id} />
        </TabsContent>
        <TabsContent value="shipments">
          <ShipmentsTab supplierId={supplier.id} />
        </TabsContent>
        <TabsContent value="quality">
          <QualityTab supplierId={supplier.id} />
        </TabsContent>
        <TabsContent value="performance">
          <PerformanceTab supplierId={supplier.id} />
        </TabsContent>
      </Tabs>

      <SupplierFormDialog open={editOpen} onOpenChange={setEditOpen} supplier={supplier} />
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
      <p className="mt-0.5 text-sm text-foreground">{value}</p>
    </div>
  );
}

function OverviewTab({ supplierId }: { supplierId: string }) {
  const { data: supplier } = useSupplier(supplierId);
  const { data: history } = useSupplierStatusHistory(supplierId);
  if (!supplier) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
          <Field label="Legal name" value={supplier.legalName ?? '—'} />
          <Field label="Provider" value={supplier.provider} />
          <Field label="Location" value={[supplier.city, supplier.country].filter(Boolean).join(', ') || '—'} />
          <Field label="Website" value={supplier.website ?? '—'} />
          <Field label="Contact email" value={supplier.contactEmail ?? '—'} />
          <Field label="Contact phone" value={supplier.contactPhone ?? '—'} />
          <Field label="Categories" value={supplier.categories.join(', ') || '—'} />
          <Field label="MOQ" value={supplier.minOrderQuantity != null ? String(supplier.minOrderQuantity) : '—'} />
          <Field label="Avg lead time" value={supplier.avgLeadTimeDays != null ? `${supplier.avgLeadTimeDays} days` : '—'} />
          <Field label="Payment terms" value={supplier.paymentTerms ? `Net ${supplier.paymentTerms.netDays ?? '—'}` : '—'} />
          <Field label="Shipping terms" value={supplier.shippingTerms?.incoterms ?? '—'} />
          <Field label="Tags" value={supplier.tags?.join(', ') || '—'} />
          {supplier.notes && (
            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
              <p className="mt-0.5 text-sm text-foreground">{supplier.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        {supplier.certifications && supplier.certifications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Certifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {supplier.certifications.map((cert, i) => (
                <div key={i} className="rounded-[var(--radius)] border border-border p-2 text-xs">
                  <p className="font-medium text-foreground">{cert.name}</p>
                  {cert.issuingBody && <p className="text-muted-foreground">{cert.issuingBody}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status history</CardTitle>
          </CardHeader>
          <CardContent>
            {!history || history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No status changes yet.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((h) => (
                  <li key={h.id} className="text-xs">
                    <span className="text-foreground">{h.previousStatus ?? 'Created'} → {h.newStatus}</span>
                    <span className="ml-2 text-muted-foreground">{formatDate(h.createdAt)}</span>
                    {h.reason && <p className="text-muted-foreground">{h.reason}</p>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function VerificationTab({ supplierId }: { supplierId: string }) {
  const { data: verification, isLoading, isError } = useLatestSupplierVerification(supplierId);
  const startVerification = useStartSupplierVerification(supplierId);

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  if (isError || !verification) {
    return (
      <EmptyState
        title="No verification yet"
        description="Run a verification check to compute a trust score for this supplier."
        action={{ label: 'Start verification', onClick: () => startVerification.mutate({}) }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Latest verification</CardTitle>
            <div className="flex items-center gap-2">
              <StatusBadge status={verification.status} />
              <Button variant="outline" size="sm" onClick={() => startVerification.mutate({})} disabled={startVerification.isPending}>
                {startVerification.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Re-run
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
          <Field label="Score" value={verification.score != null ? `${verification.score}/100` : '—'} />
          <Field label="Threshold" value={`${verification.scoreThreshold}/100`} />
          <Field label="Completed" value={verification.completedAt ? formatDate(verification.completedAt) : 'In progress'} />
          {verification.overrideNotes && (
            <div className="sm:col-span-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Override notes</p>
              <p className="mt-0.5 text-sm text-foreground">{verification.overrideNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Check results</CardTitle>
        </CardHeader>
        <CardContent>
          {!verification.checkResults || verification.checkResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">No check results.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Check</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verification.checkResults.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm text-foreground">{c.checkName}</TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.weight}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.score}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.message ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RfqsTab({ supplierId }: { supplierId: string }) {
  const { data, isLoading } = useRfqs({ supplierId, limit: 50 });
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data || data.items.length === 0) return <EmptyState title="No RFQs" description="No RFQs have been sent to this supplier." className="border-none py-8" />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>RFQ</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Target price</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.items.map((rfq) => (
          <TableRow key={rfq.id} clickable>
            <TableCell>
              <Link href={`/dashboard/rfqs/${rfq.id}`} className="text-sm font-medium text-foreground hover:underline">
                {rfq.title}
              </Link>
              <p className="text-xs text-muted-foreground">{rfq.rfqNumber}</p>
            </TableCell>
            <TableCell>
              <StatusBadge status={rfq.status} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{rfq.quantity}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{rfq.targetPrice != null ? formatCurrency(rfq.targetPrice, rfq.currency) : '—'}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{formatDate(rfq.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PurchaseOrdersTab({ supplierId }: { supplierId: string }) {
  const { data, isLoading } = usePurchaseOrders({ supplierId, limit: 50 });
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data || data.items.length === 0) return <EmptyState title="No purchase orders" description="No purchase orders have been placed with this supplier." className="border-none py-8" />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>PO</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Expected delivery</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.items.map((po) => (
          <TableRow key={po.id} clickable>
            <TableCell>
              <Link href={`/dashboard/purchase-orders/${po.id}`} className="text-sm font-medium text-foreground hover:underline">
                {po.poNumber}
              </Link>
            </TableCell>
            <TableCell>
              <StatusBadge status={po.status} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{formatCurrency(po.totalAmount, po.currency)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ShipmentsTab({ supplierId }: { supplierId: string }) {
  const { data, isLoading } = useShipments({ supplierId, limit: 50 });
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data || data.items.length === 0) return <EmptyState title="No shipments" description="No shipments recorded for this supplier." className="border-none py-8" />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Shipment</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Carrier</TableHead>
          <TableHead>ETA</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.items.map((s) => (
          <TableRow key={s.id} clickable>
            <TableCell>
              <Link href={`/dashboard/shipments/${s.id}`} className="text-sm font-medium text-foreground hover:underline">
                {s.shipmentNumber}
              </Link>
            </TableCell>
            <TableCell>
              <StatusBadge status={s.status} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{s.carrier ?? '—'}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{s.estimatedDeliveryDate ? formatDate(s.estimatedDeliveryDate) : '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function QualityTab({ supplierId }: { supplierId: string }) {
  const { data, isLoading } = useQualityInspections({ supplierId, limit: 50 });
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data || data.data.length === 0) return <EmptyState title="No quality inspections" description="No inspections recorded for this supplier." className="border-none py-8" />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Inspection</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Quality score</TableHead>
          <TableHead>Defects</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.data.map((qi) => (
          <TableRow key={qi.id} clickable>
            <TableCell>
              <Link href={`/dashboard/quality-inspections/${qi.id}`} className="text-sm font-medium text-foreground hover:underline">
                {qi.inspectionNumber}
              </Link>
            </TableCell>
            <TableCell>
              <StatusBadge status={qi.status} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{qi.qualityScore != null ? `${qi.qualityScore}/100` : '—'}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{qi.defects.length}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PerformanceTab({ supplierId }: { supplierId: string }) {
  const { data, isLoading, isError } = useSupplierPerformance(supplierId);
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  const performance = data?.[0];
  if (isError || !performance) {
    return <EmptyState title="No performance data" description="Not enough activity in the last 90 days to compute a performance summary." className="border-none py-8" />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quotation metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalysisBlock title="Quotation metrics" data={performance.quotationMetrics as unknown as Record<string, unknown>} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Procurement metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalysisBlock title="Procurement metrics" data={performance.procurementMetrics as unknown as Record<string, unknown>} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quality metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalysisBlock title="Quality metrics" data={performance.qualityMetrics as unknown as Record<string, unknown>} />
        </CardContent>
      </Card>
    </div>
  );
}
