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
import { CreateInspectionDialog } from '@/components/suppliers/create-inspection-dialog';
import { useQualityInspections } from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { QualityInspectionStatus } from '@/types';

const STATUS_OPTIONS: { value: QualityInspectionStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'PASSED', label: 'Passed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CONDITIONAL_APPROVAL', label: 'Conditional approval' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CLOSED', label: 'Closed' },
];

export default function QualityInspectionsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<QualityInspectionStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQualityInspections({ status: status ? [status] : undefined, page, limit });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <PageHeader
        title="Quality Inspections"
        description="Track inbound and pre-shipment quality inspections."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New inspection
          </Button>
        }
      />

      <FilterBar hasActiveFilters={!!status} onClearFilters={() => { setStatus(''); setPage(1); }} className="mb-4">
        <Select value={status} onChange={(e) => { setStatus(e.target.value as QualityInspectionStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-52" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load quality inspections." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No inspections yet" description="Create an inspection for an incoming shipment or purchase order." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Inspection</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Quality score</TableHead>
              <TableHead>Pass / Fail</TableHead>
              <TableHead>Scheduled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((qi) => (
              <TableRow key={qi.id} clickable onClick={() => router.push(`/dashboard/quality-inspections/${qi.id}`)}>
                <TableCell className="text-sm font-medium text-foreground">{qi.inspectionNumber}</TableCell>
                <TableCell className="text-sm capitalize text-muted-foreground">{qi.inspectionType.toLowerCase().replace(/_/g, ' ')}</TableCell>
                <TableCell>
                  <StatusBadge status={qi.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{qi.qualityScore != null ? `${qi.qualityScore}/100` : '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{qi.quantityPassed} / {qi.quantityFailed}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{qi.scheduledDate ? formatDate(qi.scheduledDate) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={limit} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      )}

      <CreateInspectionDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(qi) => router.push(`/dashboard/quality-inspections/${qi.id}`)} />
    </div>
  );
}
