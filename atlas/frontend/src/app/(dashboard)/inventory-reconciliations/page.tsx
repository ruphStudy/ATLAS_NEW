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
import { useReconciliationRuns } from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { InventoryReconciliationSourceType, InventoryReconciliationStatus } from '@/types';

const SOURCE_OPTIONS: { value: InventoryReconciliationSourceType; label: string }[] = [
  { value: 'WAREHOUSE', label: 'Warehouse' },
  { value: 'MARKETPLACE', label: 'Marketplace' },
  { value: 'SUPPLIER', label: 'Supplier' },
  { value: 'PHYSICAL_COUNT', label: 'Physical count' },
];

const STATUS_OPTIONS: { value: InventoryReconciliationStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function ReconciliationsPage() {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<InventoryReconciliationSourceType | ''>('');
  const [status, setStatus] = useState<InventoryReconciliationStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data, isLoading, isError, error, refetch } = useReconciliationRuns({ sourceType: sourceType || undefined, status: status || undefined, page, limit });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <PageHeader title="Reconciliations" description="Compare system stock against warehouse, marketplace, supplier or physical counts." />

      <FilterBar hasActiveFilters={!!sourceType || !!status} onClearFilters={() => { setSourceType(''); setStatus(''); setPage(1); }} className="mb-4">
        <Select value={sourceType} onChange={(e) => { setSourceType(e.target.value as InventoryReconciliationSourceType | ''); setPage(1); }} placeholder="All sources" options={SOURCE_OPTIONS} className="h-9 w-40" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value as InventoryReconciliationStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-36" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load reconciliation runs." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No reconciliation runs yet" description="Reconciliation runs are typically created from a warehouse receiving or count workflow." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Lines</TableHead>
              <TableHead>Warning / Critical</TableHead>
              <TableHead>Period</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((run) => (
              <TableRow key={run.id} clickable onClick={() => router.push(`/inventory-reconciliations/${run.id}`)}>
                <TableCell className="text-sm capitalize text-foreground">{run.sourceType.toLowerCase().replace(/_/g, ' ')}</TableCell>
                <TableCell>
                  <StatusBadge status={run.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{run.matchedCount}/{run.totalLines} matched</TableCell>
                <TableCell className="text-sm text-muted-foreground">{run.warningCount} / {run.criticalCount}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(run.periodStart)} – {formatDate(run.periodEnd)}</TableCell>
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
