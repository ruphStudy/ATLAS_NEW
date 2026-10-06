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
import { CreateInventoryItemDialog } from '@/components/inventory/create-inventory-item-dialog';
import { useInventoryItems } from '@/hooks';
import type { InventoryItemStatus, InventoryTrackingType } from '@/types';

const STATUS_OPTIONS: { value: InventoryItemStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'DISCONTINUED', label: 'Discontinued' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const TRACKING_OPTIONS: { value: InventoryTrackingType; label: string }[] = [
  { value: 'NONE', label: 'None' },
  { value: 'BATCH', label: 'Batch' },
  { value: 'SERIAL', label: 'Serial' },
];

export default function InventoryItemsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<InventoryItemStatus | ''>('');
  const [trackingType, setTrackingType] = useState<InventoryTrackingType | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useInventoryItems({ search: search || undefined, status: status ? [status] : undefined, trackingType: trackingType || undefined, page, limit });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;
  const hasActiveFilters = !!search || !!status || !!trackingType;

  return (
    <div>
      <PageHeader
        title="Inventory Items"
        description="Trackable SKUs with reorder rules and unit configuration."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add item
          </Button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search by SKU or name…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => { setSearch(''); setStatus(''); setTrackingType(''); setPage(1); }}
        className="mb-4"
      >
        <Select value={status} onChange={(e) => { setStatus(e.target.value as InventoryItemStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-40" />
        <Select value={trackingType} onChange={(e) => { setTrackingType(e.target.value as InventoryTrackingType | ''); setPage(1); }} placeholder="All tracking" options={TRACKING_OPTIONS} className="h-9 w-36" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load inventory items." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No inventory items yet" description={hasActiveFilters ? 'Try different filters.' : 'Add an inventory item to start tracking stock.'} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Tracking</TableHead>
              <TableHead>Reorder point</TableHead>
              <TableHead>Safety stock</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((item) => (
              <TableRow key={item.id} clickable onClick={() => router.push(`/inventory-items/${item.id}`)}>
                <TableCell className="text-sm font-medium text-foreground">{item.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{item.sku}</TableCell>
                <TableCell className="text-sm capitalize text-muted-foreground">{item.trackingType.toLowerCase()}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{item.reorderPoint}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{item.safetyStock}</TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={limit} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      )}

      <CreateInventoryItemDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(item) => router.push(`/inventory-items/${item.id}`)} />
    </div>
  );
}
