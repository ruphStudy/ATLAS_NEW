'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { useProducts } from '@/hooks';
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

export default function AiContentStudioPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CatalogStatus | ''>('');
  const [productType, setProductType] = useState<ProductType | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data, isLoading, isError, refetch } = useProducts({
    search: search || undefined,
    status: status ? [status] : undefined,
    productType: productType || undefined,
    page,
    limit,
  });

  const hasActiveFilters = !!search || !!status || !!productType;

  return (
    <div>
      <PageHeader title="AI Content Studio" description="Generate, review and apply AI-written descriptions, SEO optimization and product images." />

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search products…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => { setSearch(''); setStatus(''); setProductType(''); setPage(1); }}
        className="mb-4"
      >
        <Select value={status} onChange={(e) => { setStatus(e.target.value as CatalogStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-44" />
        <Select value={productType} onChange={(e) => { setProductType(e.target.value as ProductType | ''); setPage(1); }} placeholder="All types" options={TYPE_OPTIONS} className="h-9 w-36" />
      </FilterBar>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load products." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No products found" icon={Sparkles} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((p) => (
                <TableRow key={p.id} clickable onClick={() => router.push(`/dashboard/ai-content-studio/${p.id}`)}>
                  <TableCell className="text-sm font-medium text-foreground">{p.productName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.catalogSku}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.brand ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{p.productType.toLowerCase()}</Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={limit} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />}
        </>
      )}
    </div>
  );
}
