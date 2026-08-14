'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { LayoutGrid, List, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { ProductFormDialog } from '@/components/product-intelligence/product-form-dialog';
import { useProducts } from '@/hooks';
import { formatCurrency } from '@/lib/utils';
import type { CatalogStatus, ProductType } from '@/types';

const STATUS_OPTIONS: { value: CatalogStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'READY_FOR_AI', label: 'Ready for AI' },
  { value: 'AI_GENERATED', label: 'AI generated' },
  { value: 'READY_FOR_APPROVAL', label: 'Ready for approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: 'PHYSICAL', label: 'Physical' },
  { value: 'DIGITAL', label: 'Digital' },
  { value: 'BUNDLE', label: 'Bundle' },
  { value: 'SUBSCRIPTION', label: 'Subscription' },
];

export default function ProductsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CatalogStatus | ''>('');
  const [productType, setProductType] = useState<ProductType | ''>('');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useProducts({
    search: search || undefined,
    status: status ? [status] : undefined,
    productType: productType || undefined,
    page,
    limit,
  });

  const isForbidden = isAxiosError(error) && error.response?.status === 403;
  const hasActiveFilters = !!search || !!status || !!productType;

  return (
    <div>
      <PageHeader
        title="Product Catalog"
        description="Manage products sourced into ATLAS."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-[var(--radius)] border border-border p-0.5">
              <button onClick={() => setView('list')} className={`rounded-[calc(var(--radius)-4px)] p-1.5 ${view === 'list' ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`} aria-label="List view">
                <List className="h-4 w-4" />
              </button>
              <button onClick={() => setView('grid')} className={`rounded-[calc(var(--radius)-4px)] p-1.5 ${view === 'grid' ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`} aria-label="Grid view">
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Add product
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
        searchPlaceholder="Search products…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setSearch('');
          setStatus('');
          setProductType('');
          setPage(1);
        }}
        className="mb-4"
      >
        <Select value={status} onChange={(e) => { setStatus(e.target.value as CatalogStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-48" />
        <Select value={productType} onChange={(e) => { setProductType(e.target.value as ProductType | ''); setPage(1); }} placeholder="All types" options={TYPE_OPTIONS} className="h-9 w-36" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load products." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No products yet" description={hasActiveFilters ? 'Try different filters.' : 'Add your first product to the catalog.'} />
      ) : view === 'list' ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((product) => (
              <TableRow key={product.id} clickable onClick={() => router.push(`/dashboard/products/${product.id}`)}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {product.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.images[0]} alt="" className="h-9 w-9 shrink-0 rounded-[calc(var(--radius)-4px)] object-cover" />
                    ) : (
                      <div className="h-9 w-9 shrink-0 rounded-[calc(var(--radius)-4px)] bg-muted" />
                    )}
                    <span className="truncate text-sm font-medium text-foreground">{product.productName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{product.catalogSku}</TableCell>
                <TableCell className="text-sm capitalize text-muted-foreground">{product.productType.toLowerCase()}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{product.brand ?? '—'}</TableCell>
                <TableCell className="text-sm text-foreground">{product.suggestedSellingPrice != null ? formatCurrency(product.suggestedSellingPrice, product.currency ?? 'USD') : '—'}</TableCell>
                <TableCell>
                  <StatusBadge status={product.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.data.map((product) => (
            <Card key={product.id} hover className="cursor-pointer" onClick={() => router.push(`/dashboard/products/${product.id}`)}>
              {product.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[0]} alt="" className="aspect-square w-full rounded-t-[var(--radius)] object-cover" />
              ) : (
                <div className="aspect-square w-full rounded-t-[var(--radius)] bg-muted" />
              )}
              <CardContent className="p-3">
                <p className="truncate text-sm font-medium text-foreground">{product.productName}</p>
                <p className="truncate text-xs text-muted-foreground">{product.catalogSku}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{product.suggestedSellingPrice != null ? formatCurrency(product.suggestedSellingPrice, product.currency ?? 'USD') : '—'}</span>
                  <StatusBadge status={product.status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data && data.total > 0 && (
        <Pagination
          page={page}
          limit={limit}
          total={data.total}
          totalPages={data.totalPages}
          onPageChange={setPage}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
        />
      )}

      <ProductFormDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(p) => router.push(`/dashboard/products/${p.id}`)} />
    </div>
  );
}
