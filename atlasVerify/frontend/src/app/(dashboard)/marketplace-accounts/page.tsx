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
import { ConnectMarketplaceAccountDialog } from '@/components/marketplace/connect-marketplace-account-dialog';
import { useMarketplaceAccounts } from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { MarketplaceAccountStatus } from '@/types';

const STATUS_OPTIONS: { value: MarketplaceAccountStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_VALIDATION', label: 'Pending validation' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'INVALID', label: 'Invalid' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function MarketplaceAccountsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<MarketplaceAccountStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [connectOpen, setConnectOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useMarketplaceAccounts({ search: search || undefined, status: status || undefined, page, limit });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;
  const hasActiveFilters = !!search || !!status;

  return (
    <div>
      <PageHeader
        title="Marketplace Accounts"
        description="Connected marketplace seller/merchant accounts across providers."
        actions={
          <Button onClick={() => setConnectOpen(true)}>
            <Plus className="h-4 w-4" />
            Connect account
          </Button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search accounts…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => { setSearch(''); setStatus(''); setPage(1); }}
        className="mb-4"
      >
        <Select value={status} onChange={(e) => { setStatus(e.target.value as MarketplaceAccountStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-48" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load marketplace accounts." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No marketplace accounts yet" description={hasActiveFilters ? 'Try different filters.' : 'Connect a marketplace account to start syncing listings and orders.'} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Marketplace</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Last tested</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((account) => (
              <TableRow key={account.id} clickable onClick={() => router.push(`/dashboard/marketplace-accounts/${account.id}`)}>
                <TableCell>
                  <p className="text-sm font-medium text-foreground">{account.accountName}</p>
                  <p className="text-xs text-muted-foreground">{account.externalAccountId}</p>
                </TableCell>
                <TableCell className="text-sm capitalize text-muted-foreground">{account.providerKey.toLowerCase()}</TableCell>
                <TableCell className="text-sm capitalize text-muted-foreground">{account.marketplaceKey.toLowerCase()}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{account.country ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {account.priority}
                  {account.isDefault && <span className="ml-1 text-xs text-primary">(default)</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {account.lastTestedAt ? (
                    <span className={account.lastTestSuccess ? 'text-success' : 'text-danger'}>{formatDate(account.lastTestedAt)}</span>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={account.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={limit} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      )}

      <ConnectMarketplaceAccountDialog open={connectOpen} onOpenChange={setConnectOpen} onCreated={(a) => router.push(`/dashboard/marketplace-accounts/${a.id}`)} />
    </div>
  );
}
