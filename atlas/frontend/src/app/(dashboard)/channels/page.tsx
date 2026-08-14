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
import { RegisterChannelDialog } from '@/components/marketplace/register-channel-dialog';
import { useChannelRegistrations } from '@/hooks';
import type { ChannelStatus, ChannelType } from '@/types';

const TYPE_OPTIONS: { value: ChannelType; label: string }[] = [
  { value: 'MARKETPLACE', label: 'Marketplace' },
  { value: 'D2C_STORE', label: 'D2C store' },
  { value: 'B2B_PORTAL', label: 'B2B portal' },
  { value: 'RETAIL_POS', label: 'Retail / POS' },
  { value: 'SOCIAL_COMMERCE', label: 'Social commerce' },
  { value: 'CUSTOM', label: 'Custom' },
];

const STATUS_OPTIONS: { value: ChannelStatus; label: string }[] = [
  { value: 'REGISTERED', label: 'Registered' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function ChannelsPage() {
  const router = useRouter();
  const [channelType, setChannelType] = useState<ChannelType | ''>('');
  const [status, setStatus] = useState<ChannelStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useChannelRegistrations({ channelType: channelType || undefined, status: status || undefined, page, limit });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;
  const hasActiveFilters = !!channelType || !!status;

  return (
    <div>
      <PageHeader
        title="Channels"
        description="Sales channels across marketplace, D2C, B2B, retail and social."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Register channel
          </Button>
        }
      />

      <FilterBar hasActiveFilters={hasActiveFilters} onClearFilters={() => { setChannelType(''); setStatus(''); setPage(1); }} className="mb-4">
        <Select value={channelType} onChange={(e) => { setChannelType(e.target.value as ChannelType | ''); setPage(1); }} placeholder="All types" options={TYPE_OPTIONS} className="h-9 w-44" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value as ChannelStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-40" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load channels." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No channels yet" description={hasActiveFilters ? 'Try different filters.' : 'Register a channel to start selling through it.'} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((channel) => (
              <TableRow key={channel.id} clickable onClick={() => router.push(`/dashboard/channels/${channel.id}`)}>
                <TableCell>
                  <p className="text-sm font-medium text-foreground">{channel.name}</p>
                  <p className="text-xs text-muted-foreground">{channel.channelKey}</p>
                </TableCell>
                <TableCell className="text-sm capitalize text-muted-foreground">{channel.channelType.toLowerCase().replace(/_/g, ' ')}</TableCell>
                <TableCell className="text-sm capitalize text-muted-foreground">{channel.providerKey?.toLowerCase() ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {channel.priority}
                  {channel.isDefault && <span className="ml-1 text-xs text-primary">(default)</span>}
                </TableCell>
                <TableCell>
                  <StatusBadge status={channel.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={limit} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      )}

      <RegisterChannelDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(c) => router.push(`/dashboard/channels/${c.id}`)} />
    </div>
  );
}
