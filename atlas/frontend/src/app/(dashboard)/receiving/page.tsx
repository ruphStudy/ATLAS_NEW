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
import { useReceivings } from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { ReceiptType, ReceivingStatus } from '@/types';

const STATUS_OPTIONS: { value: ReceivingStatus; label: string }[] = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PARTIALLY_RECEIVED', label: 'Partially received' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REOPENED', label: 'Reopened' },
];

const TYPE_OPTIONS: { value: ReceiptType; label: string }[] = [
  { value: 'PURCHASE_ORDER', label: 'Purchase order' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'RETURN', label: 'Return' },
  { value: 'MANUAL', label: 'Manual' },
];

export default function ReceivingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ReceivingStatus | ''>('');
  const [type, setType] = useState<ReceiptType | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data, isLoading, isError, error, refetch } = useReceivings({ status: status || undefined, type: type || undefined, page, limit });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <PageHeader title="Receiving" description="Warehouse receiving records linked to purchase orders and shipments." />

      <FilterBar hasActiveFilters={!!status || !!type} onClearFilters={() => { setStatus(''); setType(''); setPage(1); }} className="mb-4">
        <Select value={status} onChange={(e) => { setStatus(e.target.value as ReceivingStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-48" />
        <Select value={type} onChange={(e) => { setType(e.target.value as ReceiptType | ''); setPage(1); }} placeholder="All types" options={TYPE_OPTIONS} className="h-9 w-44" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load receiving records." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No receiving records yet" description="Receiving records appear once goods are checked in against a purchase order or shipment." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receiving</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Accepted / Rejected / Damaged</TableHead>
              <TableHead>Scheduled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((r) => (
              <TableRow key={r.id} clickable onClick={() => router.push(`/receiving/${r.id}`)}>
                <TableCell className="text-sm font-medium text-foreground">{r.receivingNumber}</TableCell>
                <TableCell className="text-sm capitalize text-muted-foreground">{r.type.toLowerCase().replace(/_/g, ' ')}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.receivedQuantity}{r.expectedQuantity != null && ` / ${r.expectedQuantity}`}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.acceptedQuantity} / {r.rejectedQuantity} / {r.damagedQuantity}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.scheduledDate ? formatDate(r.scheduledDate) : '—'}</TableCell>
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
