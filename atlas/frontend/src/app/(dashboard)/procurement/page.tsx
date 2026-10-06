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
import { CreateProcurementDialog } from '@/components/suppliers/create-procurement-dialog';
import { useProcurements } from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { ProcurementStatus } from '@/types';

const STATUS_OPTIONS: { value: ProcurementStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'ORDERED', label: 'Ordered' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'PARTIALLY_RECEIVED', label: 'Partially received' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function ProcurementPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ProcurementStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useProcurements({ status: status || undefined, page, limit });

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <PageHeader
        title="Procurement"
        description="Track procurement orders from approval through fulfillment."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New procurement
          </Button>
        }
      />

      <FilterBar hasActiveFilters={!!status} onClearFilters={() => { setStatus(''); setPage(1); }} className="mb-4">
        <Select value={status} onChange={(e) => { setStatus(e.target.value as ProcurementStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-52" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load procurements." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No procurement orders yet" description="Create a procurement order from an accepted quotation." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Procurement</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Total cost</TableHead>
              <TableHead>Expected delivery</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((p) => (
              <TableRow key={p.id} clickable onClick={() => router.push(`/procurement/${p.id}`)}>
                <TableCell className="text-sm font-medium text-foreground">{p.procurementNumber}</TableCell>
                <TableCell>
                  <StatusBadge status={p.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.quantity}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatCurrency(p.totalCost, p.currency)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.expectedDeliveryDate ? formatDate(p.expectedDeliveryDate) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={limit} total={data.total} totalPages={Math.ceil(data.total / limit)} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      )}

      <CreateProcurementDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(p) => router.push(`/procurement/${p.id}`)} />
    </div>
  );
}
