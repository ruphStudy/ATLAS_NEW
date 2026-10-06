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
import { CreateWarehouseDialog } from '@/components/inventory/create-warehouse-dialog';
import { useWarehousesFull } from '@/hooks';
import type { WarehouseFullStatus, WarehouseType } from '@/types';

const TYPE_OPTIONS: { value: WarehouseType; label: string }[] = [
  { value: 'OWN', label: 'Own' },
  { value: 'RENTED', label: 'Rented' },
  { value: 'THIRD_PARTY', label: 'Third party' },
  { value: 'MARKETPLACE', label: 'Marketplace' },
  { value: 'VIRTUAL', label: 'Virtual' },
];

const STATUS_OPTIONS: { value: WarehouseFullStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function WarehousesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<WarehouseType | ''>('');
  const [status, setStatus] = useState<WarehouseFullStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useWarehousesFull({ search: search || undefined, type: type || undefined, status: status || undefined, page, limit });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;
  const hasActiveFilters = !!search || !!type || !!status;

  return (
    <div>
      <PageHeader
        title="Warehouses"
        description="Physical and virtual warehouses across your fulfillment network."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add warehouse
          </Button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search warehouses…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => { setSearch(''); setType(''); setStatus(''); setPage(1); }}
        className="mb-4"
      >
        <Select value={type} onChange={(e) => { setType(e.target.value as WarehouseType | ''); setPage(1); }} placeholder="All types" options={TYPE_OPTIONS} className="h-9 w-36" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value as WarehouseFullStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-36" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load warehouses." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No warehouses yet" description={hasActiveFilters ? 'Try different filters.' : 'Add a warehouse to start managing inventory and fulfillment.'} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Warehouse</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((w) => (
              <TableRow key={w.id} clickable onClick={() => router.push(`/warehouses/${w.id}`)}>
                <TableCell>
                  <p className="text-sm font-medium text-foreground">{w.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.code}
                    {w.isDefault && ' · Default'}
                  </p>
                </TableCell>
                <TableCell className="text-sm capitalize text-muted-foreground">{w.type.toLowerCase().replace(/_/g, ' ')}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{[w.city, w.country].filter(Boolean).join(', ') || '—'}</TableCell>
                <TableCell>
                  <StatusBadge status={w.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={limit} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      )}

      <CreateWarehouseDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(w) => router.push(`/warehouses/${w.id}`)} />
    </div>
  );
}
