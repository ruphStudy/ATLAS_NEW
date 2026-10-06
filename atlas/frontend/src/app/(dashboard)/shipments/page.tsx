'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { CreateShipmentDialog } from '@/components/suppliers/create-shipment-dialog';
import { useScheduleTrackingSync, useShipments } from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { ShipmentStatus } from '@/types';

const STATUS_OPTIONS: { value: ShipmentStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'READY', label: 'Ready' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'IN_TRANSIT', label: 'In transit' },
  { value: 'CUSTOMS_CLEARANCE', label: 'Customs clearance' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'DELAYED', label: 'Delayed' },
  { value: 'LOST', label: 'Lost' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function ShipmentsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ShipmentStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);
  const syncTracking = useScheduleTrackingSync();

  const { data, isLoading, isError, error, refetch } = useShipments({ status: status || undefined, page, limit });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <PageHeader
        title="Shipments"
        description="Track shipment dispatch and delivery from suppliers."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => syncTracking.mutate()} disabled={syncTracking.isPending}>
              {syncTracking.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync tracking
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New shipment
            </Button>
          </div>
        }
      />

      <FilterBar hasActiveFilters={!!status} onClearFilters={() => { setStatus(''); setPage(1); }} className="mb-4">
        <Select value={status} onChange={(e) => { setStatus(e.target.value as ShipmentStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-52" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load shipments." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No shipments yet" description="Create a shipment once a purchase order is ready to dispatch." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shipment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Carrier</TableHead>
              <TableHead>Tracking #</TableHead>
              <TableHead>ETA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((s) => (
              <TableRow key={s.id} clickable onClick={() => router.push(`/shipments/${s.id}`)}>
                <TableCell>
                  <p className="text-sm font-medium text-foreground">{s.shipmentNumber}</p>
                  {s.isPartial && <p className="text-xs text-muted-foreground">Partial shipment</p>}
                </TableCell>
                <TableCell>
                  <StatusBadge status={s.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.carrier ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.trackingNumber ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.estimatedDeliveryDate ? formatDate(s.estimatedDeliveryDate) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={limit} total={data.total} totalPages={Math.ceil(data.total / limit)} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      )}

      <CreateShipmentDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(s) => router.push(`/shipments/${s.id}`)} />
    </div>
  );
}
