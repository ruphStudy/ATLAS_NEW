'use client';

import Link from 'next/link';
import { AlertTriangle, FileSearch, PackageSearch, ShieldCheck, ShoppingCart, Truck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import { useProcurements, usePurchaseOrders, useQualityInspections, useRfqs, useShipments } from '@/hooks';

export default function PurchaseOperationsDashboardPage() {
  const pendingRfqs = useRfqs({ status: ['SENT', 'PARTIALLY_RESPONDED'], limit: 5 });
  const readyForComparison = useRfqs({ status: ['RESPONDED'], limit: 5 });
  const pendingProcurementApprovals = useProcurements({ status: 'PENDING_APPROVAL', limit: 5 });
  const pendingPoApprovals = usePurchaseOrders({ status: 'PENDING_APPROVAL', limit: 5 });
  const posInFlight = usePurchaseOrders({ status: ['ISSUED', 'ACKNOWLEDGED', 'PARTIALLY_FULFILLED'], limit: 100 });
  const shipmentExceptions = useShipments({ status: ['DELAYED', 'LOST'], limit: 5 });
  const shipmentsInTransit = useShipments({ status: ['IN_TRANSIT', 'CUSTOMS_CLEARANCE', 'OUT_FOR_DELIVERY'], limit: 100 });
  const qualityExceptions = useQualityInspections({ status: ['FAILED', 'REJECTED'], limit: 5 });

  const pendingApprovalsTotal = (pendingProcurementApprovals.data?.total ?? 0) + (pendingPoApprovals.data?.total ?? 0);
  const loadingKpis =
    pendingRfqs.isLoading || readyForComparison.isLoading || pendingProcurementApprovals.isLoading || pendingPoApprovals.isLoading || posInFlight.isLoading || shipmentsInTransit.isLoading;

  return (
    <div>
      <PageHeader title="Purchase Operations" description="Everything that needs attention across sourcing, approvals, orders and shipments." />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Pending RFQs" value={pendingRfqs.data?.total ?? 0} icon={FileSearch} loading={loadingKpis} description="Awaiting supplier response" />
        <KpiCard label="Ready to compare" value={readyForComparison.data?.total ?? 0} icon={PackageSearch} loading={loadingKpis} description="Quotations received" />
        <KpiCard label="Pending approvals" value={pendingApprovalsTotal} icon={ShieldCheck} loading={loadingKpis} description="Procurement + PO" />
        <KpiCard label="POs in flight" value={posInFlight.data?.total ?? 0} icon={ShoppingCart} loading={loadingKpis} description="Issued to fulfilled" />
        <KpiCard label="Shipments in transit" value={shipmentsInTransit.data?.total ?? 0} icon={Truck} loading={loadingKpis} description="Dispatched, not delivered" />
        <KpiCard
          label="Exceptions"
          value={(shipmentExceptions.data?.total ?? 0) + (qualityExceptions.data?.total ?? 0)}
          icon={AlertTriangle}
          gradient="from-danger to-warning"
          loading={loadingKpis}
          description="Delayed, lost, failed, rejected"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pending RFQs</CardTitle>
          </CardHeader>
          <CardContent>
            <ListSection
              isLoading={pendingRfqs.isLoading}
              items={pendingRfqs.data?.items}
              emptyLabel="No RFQs awaiting response"
              renderItem={(rfq: NonNullable<typeof pendingRfqs.data>['items'][number]) => (
                <Row key={rfq.id} href={`/dashboard/rfqs/${rfq.id}`} title={rfq.title} subtitle={rfq.rfqNumber} status={rfq.status} />
              )}
              viewAllHref="/dashboard/rfqs"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pending approvals</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingProcurementApprovals.isLoading || pendingPoApprovals.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : pendingApprovalsTotal === 0 ? (
              <EmptyState title="Nothing pending" description="No procurement or purchase orders need approval." className="border-none py-6" />
            ) : (
              <ul className="space-y-2">
                {(pendingProcurementApprovals.data?.items ?? []).map((p) => (
                  <Row key={p.id} href={`/dashboard/procurement/${p.id}`} title={p.procurementNumber} subtitle="Procurement" status={p.status} />
                ))}
                {(pendingPoApprovals.data?.items ?? []).map((po) => (
                  <Row key={po.id} href={`/dashboard/purchase-orders/${po.id}`} title={po.poNumber} subtitle="Purchase order" status={po.status} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Shipment exceptions</CardTitle>
          </CardHeader>
          <CardContent>
            <ListSection
              isLoading={shipmentExceptions.isLoading}
              items={shipmentExceptions.data?.items}
              emptyLabel="No delayed or lost shipments"
              renderItem={(s: NonNullable<typeof shipmentExceptions.data>['items'][number]) => (
                <Row key={s.id} href={`/dashboard/shipments/${s.id}`} title={s.shipmentNumber} subtitle={s.carrier ?? undefined} status={s.status} />
              )}
              viewAllHref="/dashboard/shipments"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quality exceptions</CardTitle>
          </CardHeader>
          <CardContent>
            <ListSection
              isLoading={qualityExceptions.isLoading}
              items={qualityExceptions.data?.data}
              emptyLabel="No failed or rejected inspections"
              renderItem={(qi: NonNullable<typeof qualityExceptions.data>['data'][number]) => (
                <Row key={qi.id} href={`/dashboard/quality-inspections/${qi.id}`} title={qi.inspectionNumber} subtitle={qi.inspectionType.replace(/_/g, ' ')} status={qi.status} />
              )}
              viewAllHref="/dashboard/quality-inspections"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ListSection<T>({
  isLoading,
  items,
  emptyLabel,
  renderItem,
  viewAllHref,
}: {
  isLoading: boolean;
  items?: T[];
  emptyLabel: string;
  renderItem: (item: T) => React.ReactNode;
  viewAllHref: string;
}) {
  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (!items || items.length === 0) {
    return <EmptyState title={emptyLabel} className="border-none py-6" />;
  }
  return (
    <div>
      <ul className="space-y-2">{items.map(renderItem)}</ul>
      <Link href={viewAllHref} className="mt-3 inline-block text-xs font-medium text-primary hover:underline">
        View all →
      </Link>
    </div>
  );
}

function Row({ href, title, subtitle, status }: { href: string; title: string; subtitle?: string; status: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-2 text-sm hover:bg-secondary">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{title}</p>
          {subtitle && <p className="truncate text-xs capitalize text-muted-foreground">{subtitle}</p>}
        </div>
        <StatusBadge status={status} />
      </Link>
    </li>
  );
}
