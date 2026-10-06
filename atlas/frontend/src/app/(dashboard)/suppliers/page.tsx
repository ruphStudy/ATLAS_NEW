'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { TierBadge } from '@/components/suppliers/tier-badge';
import { DiscoverSuppliersDialog } from '@/components/suppliers/discover-suppliers-dialog';
import { SupplierFormDialog } from '@/components/suppliers/supplier-form-dialog';
import { useSuppliers } from '@/hooks';
import { ROUTES } from '@/constants';
import type { SupplierStatus } from '@/types';

const STATUS_OPTIONS: { value: SupplierStatus; label: string }[] = [
  { value: 'PROSPECT', label: 'Prospect' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PREFERRED', label: 'Preferred' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function SuppliersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SupplierStatus | ''>('');
  const [country, setCountry] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState<string[]>([]);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useSuppliers({
    search: search || undefined,
    status: status ? [status] : undefined,
    country: country || undefined,
    page,
    limit,
  });

  const isForbidden = isAxiosError(error) && error.response?.status === 403;
  const hasActiveFilters = !!search || !!status || !!country;

  const toggleSelected = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Discover, verify, and manage suppliers sourcing your catalog."
        actions={
          <div className="flex items-center gap-2">
            {selected.length >= 2 && (
              <Button variant="outline" onClick={() => router.push(`${ROUTES.SUPPLIERS_COMPARE}?ids=${selected.join(',')}`)}>
                Compare ({selected.length})
              </Button>
            )}
            <Button variant="outline" onClick={() => setDiscoverOpen(true)}>
              <Search className="h-4 w-4" />
              Discover
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Add supplier
            </Button>
          </div>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search suppliers…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setSearch('');
          setStatus('');
          setCountry('');
          setPage(1);
        }}
        className="mb-4"
      >
        <Select value={status} onChange={(e) => { setStatus(e.target.value as SupplierStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-40" />
        <input
          value={country}
          onChange={(e) => { setCountry(e.target.value.toUpperCase()); setPage(1); }}
          placeholder="Country"
          maxLength={5}
          className="h-9 w-24 rounded-[var(--radius)] border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load suppliers." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No suppliers yet" description={hasActiveFilters ? 'Try different filters.' : 'Add a supplier or run a discovery search.'} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Supplier</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead>Lead time</TableHead>
              <TableHead>MOQ</TableHead>
              <TableHead>Verification</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((supplier) => (
              <TableRow key={supplier.id} clickable onClick={() => router.push(`${ROUTES.SUPPLIERS}/${supplier.id}`)}>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={selected.includes(supplier.id)} onChange={() => toggleSelected(supplier.id)} />
                </TableCell>
                <TableCell>
                  <p className="text-sm font-medium text-foreground">{supplier.name}</p>
                  {supplier.contactEmail && <p className="text-xs text-muted-foreground">{supplier.contactEmail}</p>}
                </TableCell>
                <TableCell>
                  <TierBadge tier={supplier.tier} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {[supplier.city, supplier.country].filter(Boolean).join(', ') || '—'}
                </TableCell>
                <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground">{supplier.categories.join(', ') || '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{supplier.avgLeadTimeDays != null ? `${supplier.avgLeadTimeDays}d` : '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{supplier.minOrderQuantity ?? '—'}</TableCell>
                <TableCell className="text-sm text-foreground">{supplier.verificationScore != null ? `${supplier.verificationScore}/100` : '—'}</TableCell>
                <TableCell className="text-sm text-foreground">{supplier.riskScore != null ? `${supplier.riskScore}/100` : '—'}</TableCell>
                <TableCell>
                  <StatusBadge status={supplier.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination
          page={page}
          limit={limit}
          total={data.total}
          totalPages={Math.ceil(data.total / limit)}
          onPageChange={setPage}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
        />
      )}

      <DiscoverSuppliersDialog open={discoverOpen} onOpenChange={setDiscoverOpen} />
      <SupplierFormDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(s) => router.push(`${ROUTES.SUPPLIERS}/${s.id}`)} />
    </div>
  );
}
