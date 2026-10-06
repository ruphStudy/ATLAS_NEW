'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { useDispatchTasks } from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { DispatchStatus } from '@/types';

const STATUS_OPTIONS: { value: DispatchStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REOPENED', label: 'Reopened' },
];

export default function DispatchPage() {
  const router = useRouter();
  const [status, setStatus] = useState<DispatchStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data, isLoading, isError, error, refetch } = useDispatchTasks({ status: status ? [status] : undefined, page, limit });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <PageHeader title="Dispatch" description="Carrier handover, manifests and outbound pickup." />

      <FilterBar hasActiveFilters={!!status} onClearFilters={() => { setStatus(''); setPage(1); }} className="mb-4">
        <Select value={status} onChange={(e) => { setStatus(e.target.value as DispatchStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-44" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load dispatch tasks." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No dispatch tasks yet" description="Tasks appear here once generated from a packing task." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Carrier</TableHead>
              <TableHead>Packages</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((t) => (
              <TableRow key={t.id} clickable onClick={() => router.push(`/dispatch/${t.id}`)}>
                <TableCell className="text-sm font-medium text-foreground">{t.taskNumber}</TableCell>
                <TableCell>
                  <StatusBadge status={t.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.carrierName ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.dispatchedPackages}/{t.totalPackages}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={limit} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      )}
    </div>
  );
}
