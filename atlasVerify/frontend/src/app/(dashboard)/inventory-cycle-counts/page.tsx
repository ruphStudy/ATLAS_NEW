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
import { CreateCycleCountDialog } from '@/components/inventory/create-cycle-count-dialog';
import { useCycleCounts } from '@/hooks';
import type { InventoryCycleCountStatus, InventoryCycleCountType } from '@/types';

const TYPE_OPTIONS: { value: InventoryCycleCountType; label: string }[] = [
  { value: 'FULL', label: 'Full' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'BLIND', label: 'Blind' },
  { value: 'SPOT', label: 'Spot' },
  { value: 'ABC', label: 'ABC' },
];

const STATUS_OPTIONS: { value: InventoryCycleCountStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function CycleCountsPage() {
  const router = useRouter();
  const [type, setType] = useState<InventoryCycleCountType | ''>('');
  const [status, setStatus] = useState<InventoryCycleCountStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useCycleCounts({ type: type || undefined, status: status ? [status] : undefined, page, limit });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <PageHeader
        title="Cycle Counts"
        description="Plan, assign and execute physical inventory counts."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New cycle count
          </Button>
        }
      />

      <FilterBar hasActiveFilters={!!type || !!status} onClearFilters={() => { setType(''); setStatus(''); setPage(1); }} className="mb-4">
        <Select value={type} onChange={(e) => { setType(e.target.value as InventoryCycleCountType | ''); setPage(1); }} placeholder="All types" options={TYPE_OPTIONS} className="h-9 w-36" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value as InventoryCycleCountStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-44" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load cycle counts." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No cycle counts yet" description="Create a cycle count to schedule a physical inventory check." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Variance lines</TableHead>
              <TableHead>Scheduled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((c) => (
              <TableRow key={c.id} clickable onClick={() => router.push(`/dashboard/inventory-cycle-counts/${c.id}`)}>
                <TableCell className="text-sm capitalize text-foreground">{c.type.toLowerCase()}</TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.countedLines}/{c.totalLines}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.varianceLines}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.scheduledAt ? new Date(c.scheduledAt).toLocaleDateString() : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={limit} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      )}

      <CreateCycleCountDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(c) => router.push(`/dashboard/inventory-cycle-counts/${c.id}`)} />
    </div>
  );
}
