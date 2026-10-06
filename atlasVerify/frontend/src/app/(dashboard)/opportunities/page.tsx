'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { GitCompareArrows, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScoreBadge } from '@/components/product-intelligence/score-badge';
import { DiscoverProductsDialog } from '@/components/product-intelligence/discover-products-dialog';
import { CreateOpportunityDialog } from '@/components/product-intelligence/create-opportunity-dialog';
import { useOpportunities } from '@/hooks';
import type { Opportunity, OpportunityStatus } from '@/types';

const STATUS_OPTIONS: { value: OpportunityStatus; label: string }[] = [
  { value: 'DISCOVERED', label: 'Discovered' },
  { value: 'ANALYZING', label: 'Analyzing' },
  { value: 'VALIDATED', label: 'Validated' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function OpportunitiesPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<OpportunityStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState<string[]>([]);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useOpportunities({
    keyword: keyword || undefined,
    status: status || undefined,
    page,
    limit,
  });

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  const toggleSelected = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const hasActiveFilters = !!keyword || !!status;

  return (
    <div>
      <PageHeader
        title="Product Opportunities"
        description="Discover, score and evaluate new products before you source them."
        actions={
          <div className="flex items-center gap-2">
            {selected.length >= 2 && (
              <Button variant="outline" onClick={() => router.push(`/dashboard/opportunities/compare?ids=${selected.join(',')}`)}>
                <GitCompareArrows className="h-4 w-4" />
                Compare ({selected.length})
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setDiscoverOpen(true)}>
                  <Search className="h-4 w-4" />
                  Discover products
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add manually
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <FilterBar
        searchValue={keyword}
        onSearchChange={(v) => {
          setKeyword(v);
          setPage(1);
        }}
        searchPlaceholder="Search by keyword…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setKeyword('');
          setStatus('');
          setPage(1);
        }}
        className="mb-4"
      >
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OpportunityStatus | '');
            setPage(1);
          }}
          placeholder="All statuses"
          options={STATUS_OPTIONS}
          className="h-9 w-44"
        />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load opportunities." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No opportunities yet" description="Discover products or add one manually to get started." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Keyword</TableHead>
                <TableHead>Marketplace</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Final score</TableHead>
                <TableHead>Demand</TableHead>
                <TableHead>Competition</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((opp: Opportunity) => (
                <TableRow key={opp.id} clickable onClick={() => router.push(`/dashboard/opportunities/${opp.id}`)}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selected.includes(opp.id)} onChange={() => toggleSelected(opp.id)} />
                  </TableCell>
                  <TableCell className="text-sm font-medium text-foreground">{opp.keyword}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {opp.marketplace}
                    <span className="ml-1">{opp.country}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{opp.category ?? '—'}</TableCell>
                  <TableCell>
                    <ScoreBadge score={opp.finalScore} />
                  </TableCell>
                  <TableCell>
                    <ScoreBadge score={opp.demandScore} />
                  </TableCell>
                  <TableCell>
                    <ScoreBadge score={opp.competitionScore} />
                  </TableCell>
                  <TableCell>
                    <ScoreBadge score={opp.profitScore} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={opp.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

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
        </>
      )}

      <DiscoverProductsDialog open={discoverOpen} onOpenChange={setDiscoverOpen} />
      <CreateOpportunityDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
