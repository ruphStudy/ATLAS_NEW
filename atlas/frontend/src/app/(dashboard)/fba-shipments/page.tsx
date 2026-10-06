'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { useFBAShipments } from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { FBAShipmentStatus } from '@/types';
import { CreateFBAShipmentDialog } from '@/components/inventory/create-fba-shipment-dialog';

const STATUS_OPTIONS: { value: FBAShipmentStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PLANNED', label: 'Planned' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PREPARING', label: 'Preparing' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'IN_TRANSIT', label: 'In transit' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CHECKED_IN', label: 'Checked in' },
  { value: 'RECEIVING', label: 'Receiving' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'PROBLEM', label: 'Problem' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function FBAShipmentsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<FBAShipmentStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useFBAShipments({ status: status ? [status] : undefined, page, limit });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <PageHeader
        title="FBA Shipments"
        description="Plan, prep, dispatch and track inbound shipments to fulfillment centers."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New shipment
          </Button>
        }
      />

      <FilterBar hasActiveFilters={!!status} onClearFilters={() => { setStatus(''); setPage(1); }} className="mb-4">
        <Select value={status} onChange={(e) => { setStatus(e.target.value as FBAShipmentStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-44" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load FBA shipments." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No FBA shipments yet" description="Create a shipment to begin planning an inbound to a fulfillment center." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shipment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Destination FC</TableHead>
              <TableHead>Units</TableHead>
              <TableHead>Boxes</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((s) => (
              <TableRow key={s.id} clickable onClick={() => router.push(`/fba-shipments/${s.id}`)}>
                <TableCell className="text-sm font-medium text-foreground">{s.shipmentNumber}</TableCell>
                <TableCell>
                  <StatusBadge status={s.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.destinationFCName ?? s.destinationFCId ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.shippedUnits}/{s.totalUnits}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.shippedBoxes}/{s.totalBoxes}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(s.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={limit} total={data.total} totalPages={Math.ceil(data.total / limit)} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      )}

      <CreateFBAShipmentDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
