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
import { CreateMovementDialog } from '@/components/inventory/create-movement-dialog';
import { useInventoryMovements } from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { InventoryMovementStatus } from '@/types';

const STATUS_OPTIONS: { value: InventoryMovementStatus; label: string }[] = [
  { value: 'PENDING_APPROVAL', label: 'Pending approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'EXECUTED', label: 'Executed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REVERSED', label: 'Reversed' },
];

export default function InventoryMovementsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<InventoryMovementStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useInventoryMovements({ status: status || undefined, page, limit });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <PageHeader
        title="Stock Movements"
        description="Move stock between locations or statuses within a warehouse."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New movement
          </Button>
        }
      />

      <FilterBar hasActiveFilters={!!status} onClearFilters={() => { setStatus(''); setPage(1); }} className="mb-4">
        <Select value={status} onChange={(e) => { setStatus(e.target.value as InventoryMovementStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-48" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load movements." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No movements yet" description="Create a movement to relocate or re-status stock." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>From → To</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((m) => (
              <TableRow key={m.id} clickable onClick={() => router.push(`/inventory-movements/${m.id}`)}>
                <TableCell>
                  <StatusBadge status={m.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{m.fromStatus} → {m.toStatus}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{m.quantity}</TableCell>
                <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">{m.reason}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(m.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={limit} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      )}

      <CreateMovementDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(m) => router.push(`/inventory-movements/${m.id}`)} />
    </div>
  );
}
