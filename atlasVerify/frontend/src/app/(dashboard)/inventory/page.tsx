'use client';

import Link from 'next/link';
import { AlertTriangle, Boxes, PackageX, ShieldAlert, Truck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import { useCycleCounts, useExpiringBatches, useInventoryAdjustments, useInventoryTransfers, useReconciliationRuns } from '@/hooks';

export default function InventoryDashboardPage() {
  const pendingAdjustments = useInventoryAdjustments({ status: 'PENDING_APPROVAL', limit: 5 });
  const pendingTransfers = useInventoryTransfers({ status: 'PENDING', limit: 5 });
  const activeCycleCounts = useCycleCounts({ status: ['SCHEDULED', 'ASSIGNED', 'IN_PROGRESS'], limit: 5 });
  const pendingReconciliations = useReconciliationRuns({ status: 'PENDING', limit: 5 });
  const expiringBatches = useExpiringBatches(30);

  const loadingKpis = pendingAdjustments.isLoading || pendingTransfers.isLoading || activeCycleCounts.isLoading || pendingReconciliations.isLoading;

  return (
    <div>
      <PageHeader title="Inventory" description="Stock health, pending approvals and count activity across your warehouses." />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Pending adjustments" value={pendingAdjustments.data?.total ?? 0} icon={ShieldAlert} loading={loadingKpis} />
        <KpiCard label="Pending transfers" value={pendingTransfers.data?.total ?? 0} icon={Truck} loading={loadingKpis} />
        <KpiCard label="Active cycle counts" value={activeCycleCounts.data?.total ?? 0} icon={Boxes} loading={loadingKpis} />
        <KpiCard label="Open reconciliations" value={pendingReconciliations.data?.total ?? 0} icon={AlertTriangle} loading={loadingKpis} />
        <KpiCard label="Expiring batches (30d)" value={expiringBatches.data?.length ?? 0} icon={PackageX} gradient="from-warning to-danger" loading={expiringBatches.isLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pending adjustments</CardTitle>
          </CardHeader>
          <CardContent>
            <ListSection isLoading={pendingAdjustments.isLoading} items={pendingAdjustments.data?.data} emptyLabel="No adjustments pending approval" viewAllHref="/dashboard/inventory-adjustments">
              {(adj) => (
                <Row key={adj.id} href={`/dashboard/inventory-adjustments/${adj.id}`} title={adj.type.replace(/_/g, ' ')} subtitle={adj.reason} status={adj.status} />
              )}
            </ListSection>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pending transfers</CardTitle>
          </CardHeader>
          <CardContent>
            <ListSection isLoading={pendingTransfers.isLoading} items={pendingTransfers.data?.data} emptyLabel="No transfers pending approval" viewAllHref="/dashboard/inventory-transfers">
              {(t) => <Row key={t.id} href={`/dashboard/inventory-transfers/${t.id}`} title={t.transferNumber} subtitle={t.reason} status={t.status} />}
            </ListSection>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Active cycle counts</CardTitle>
          </CardHeader>
          <CardContent>
            <ListSection isLoading={activeCycleCounts.isLoading} items={activeCycleCounts.data?.data} emptyLabel="No active cycle counts" viewAllHref="/dashboard/inventory-cycle-counts">
              {(c) => <Row key={c.id} href={`/dashboard/inventory-cycle-counts/${c.id}`} title={c.type} subtitle={`${c.countedLines}/${c.totalLines} lines counted`} status={c.status} />}
            </ListSection>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Expiring batches</CardTitle>
          </CardHeader>
          <CardContent>
            {expiringBatches.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !expiringBatches.data || expiringBatches.data.length === 0 ? (
              <EmptyState title="No batches expiring soon" className="border-none py-6" />
            ) : (
              <ul className="space-y-2">
                {expiringBatches.data.slice(0, 5).map((b) => (
                  <li key={b.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-2 text-sm">
                    <span className="text-foreground">{b.batchNumber}</span>
                    <span className="text-xs text-muted-foreground">{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : '—'}</span>
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

function ListSection<T>({ isLoading, items, emptyLabel, viewAllHref, children }: { isLoading: boolean; items?: T[]; emptyLabel: string; viewAllHref: string; children: (item: T) => React.ReactNode }) {
  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (!items || items.length === 0) return <EmptyState title={emptyLabel} className="border-none py-6" />;
  return (
    <div>
      <ul className="space-y-2">{items.map(children)}</ul>
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
          <p className="truncate font-medium capitalize text-foreground">{title}</p>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <StatusBadge status={status} />
      </Link>
    </li>
  );
}
