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
import { usePickingTasks } from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { PickingStatus, PickingType } from '@/types';

const TYPE_OPTIONS: { value: PickingType; label: string }[] = [
  { value: 'SINGLE', label: 'Single' },
  { value: 'BATCH', label: 'Batch' },
  { value: 'WAVE', label: 'Wave' },
  { value: 'ZONE', label: 'Zone' },
  { value: 'PRIORITY', label: 'Priority' },
];

const STATUS_OPTIONS: { value: PickingStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'RELEASED', label: 'Released' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'FAILED', label: 'Failed' },
];

export default function PickingPage() {
  const router = useRouter();
  const [pickingType, setPickingType] = useState<PickingType | ''>('');
  const [status, setStatus] = useState<PickingStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data, isLoading, isError, error, refetch } = usePickingTasks({ pickingType: pickingType || undefined, status: status ? [status] : undefined, page, limit });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <PageHeader title="Picking" description="Single, batch, wave and zone picking tasks." />

      <FilterBar hasActiveFilters={!!pickingType || !!status} onClearFilters={() => { setPickingType(''); setStatus(''); setPage(1); }} className="mb-4">
        <Select value={pickingType} onChange={(e) => { setPickingType(e.target.value as PickingType | ''); setPage(1); }} placeholder="All types" options={TYPE_OPTIONS} className="h-9 w-36" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value as PickingStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-44" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load picking tasks." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No picking tasks yet" description="Tasks appear here once generated from an order or transfer." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Assigned to</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((t) => (
              <TableRow key={t.id} clickable onClick={() => router.push(`/dashboard/picking/${t.id}`)}>
                <TableCell className="text-sm font-medium text-foreground">{t.taskNumber}</TableCell>
                <TableCell className="text-sm capitalize text-muted-foreground">{t.pickingType.toLowerCase()}</TableCell>
                <TableCell>
                  <StatusBadge status={t.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.pickedQuantity}/{t.totalQuantity}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.assignedTo ?? '—'}</TableCell>
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
