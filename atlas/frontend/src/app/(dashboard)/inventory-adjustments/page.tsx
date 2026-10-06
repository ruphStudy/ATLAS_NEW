'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { CreateAdjustmentDialog } from '@/components/inventory/create-adjustment-dialog';
import { useInventoryAdjustments } from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { InventoryAdjustmentStatus, InventoryAdjustmentType } from '@/types';

const TYPE_OPTIONS: { value: InventoryAdjustmentType; label: string }[] = [
  { value: 'INCREASE', label: 'Increase' },
  { value: 'DECREASE', label: 'Decrease' },
  { value: 'DAMAGE', label: 'Damage' },
  { value: 'LOSS', label: 'Loss' },
  { value: 'EXPIRY', label: 'Expiry' },
  { value: 'COUNT_VARIANCE', label: 'Count variance' },
  { value: 'STATUS_CORRECTION', label: 'Status correction' },
];

const STATUS_OPTIONS: { value: InventoryAdjustmentStatus; label: string }[] = [
  { value: 'PENDING_APPROVAL', label: 'Pending approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'POSTED', label: 'Posted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REVERSED', label: 'Reversed' },
];

export default function InventoryAdjustmentsPage() {
  const router = useRouter();
  const [type, setType] = useState<InventoryAdjustmentType | ''>('');
  const [status, setStatus] = useState<InventoryAdjustmentStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useInventoryAdjustments({ type: type || undefined, status: status || undefined, page, limit });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;
  const hasActiveFilters = !!type || !!status;

  return (
    <div>
      <PageHeader
        title="Inventory Adjustments"
        description="Quantity increases, decreases, damage, loss, expiry and status corrections."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New adjustment
          </Button>
        }
      />

      <FilterBar hasActiveFilters={hasActiveFilters} onClearFilters={() => { setType(''); setStatus(''); setPage(1); }} className="mb-4">
        <Select value={type} onChange={(e) => { setType(e.target.value as InventoryAdjustmentType | ''); setPage(1); }} placeholder="All types" options={TYPE_OPTIONS} className="h-9 w-44" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value as InventoryAdjustmentStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-48" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load adjustments." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No adjustments yet" description={hasActiveFilters ? 'Try different filters.' : 'Create an adjustment to correct stock quantities or status.'} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((adj) => (
              <TableRow key={adj.id} clickable onClick={() => router.push(`/inventory-adjustments/${adj.id}`)}>
                <TableCell className="text-sm capitalize text-foreground">{adj.type.toLowerCase().replace(/_/g, ' ')}</TableCell>
                <TableCell>
                  <StatusBadge status={adj.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{adj.quantityDelta ?? adj.quantity ?? '—'}</TableCell>
                <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">{adj.reason}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(adj.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={limit} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      )}

      <CreateAdjustmentDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(a) => router.push(`/inventory-adjustments/${a.id}`)} />
    </div>
  );
}
