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
import { CreateRfqDialog } from '@/components/suppliers/create-rfq-dialog';
import { useRfqs } from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { RfqStatus } from '@/types';

const STATUS_OPTIONS: { value: RfqStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'PARTIALLY_RESPONDED', label: 'Partially responded' },
  { value: 'RESPONDED', label: 'Responded' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'CLOSED', label: 'Closed' },
];

export default function RfqsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<RfqStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useRfqs({
    search: search || undefined,
    status: status ? [status] : undefined,
    page,
    limit,
  });

  const isForbidden = isAxiosError(error) && error.response?.status === 403;
  const hasActiveFilters = !!search || !!status;

  return (
    <div>
      <PageHeader
        title="RFQs"
        description="Request for quotation flows with suppliers."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New RFQ
          </Button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search RFQs…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => { setSearch(''); setStatus(''); setPage(1); }}
        className="mb-4"
      >
        <Select value={status} onChange={(e) => { setStatus(e.target.value as RfqStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-48" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load RFQs." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No RFQs yet" description={hasActiveFilters ? 'Try different filters.' : 'Create an RFQ to request quotes from suppliers.'} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>RFQ</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Suppliers</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Target price</TableHead>
              <TableHead>Expires</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((rfq) => (
              <TableRow key={rfq.id} clickable onClick={() => router.push(`/rfqs/${rfq.id}`)}>
                <TableCell>
                  <p className="text-sm font-medium text-foreground">{rfq.title}</p>
                  <p className="text-xs text-muted-foreground">{rfq.rfqNumber}</p>
                </TableCell>
                <TableCell>
                  <StatusBadge status={rfq.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{rfq.supplierResponses?.length ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{rfq.quantity}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{rfq.targetPrice != null ? formatCurrency(rfq.targetPrice, rfq.currency) : '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{rfq.expiresAt ? formatDate(rfq.expiresAt) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={limit} total={data.total} totalPages={Math.ceil(data.total / limit)} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      )}

      <CreateRfqDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(rfq) => router.push(`/rfqs/${rfq.id}`)} />
    </div>
  );
}
