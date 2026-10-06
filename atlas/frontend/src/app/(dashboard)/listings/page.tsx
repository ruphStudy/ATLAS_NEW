'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { CreateUniversalListingDialog } from '@/components/marketplace/create-universal-listing-dialog';
import { useUniversalListingList } from '@/hooks';
import { formatDate } from '@/lib/utils';

export default function ListingsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useUniversalListingList({ search: search || undefined, page, limit });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <PageHeader
        title="Listings"
        description="Universal listings and their marketplace-specific transformations."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create listing
          </Button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search listings…"
        hasActiveFilters={!!search}
        onClearFilters={() => { setSearch(''); setPage(1); }}
        className="mb-4"
      />

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load listings." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No listings yet" description="Create a universal listing from a catalog product to get started." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Listing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Quality score</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((listing) => (
              <TableRow key={listing.id} clickable onClick={() => router.push(`/listings/${listing.id}`)}>
                <TableCell>
                  <p className="text-sm font-medium text-foreground">{(listing.content?.['title'] as string) || listing.catalogProductId}</p>
                  <p className="text-xs text-muted-foreground">{listing.catalogProductId}</p>
                </TableCell>
                <TableCell>
                  <StatusBadge status={listing.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{listing.qualityScore != null ? `${listing.qualityScore}/100` : '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">v{listing.version}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(listing.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={limit} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      )}

      <CreateUniversalListingDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(l) => router.push(`/listings/${l.id}`)} />
    </div>
  );
}
