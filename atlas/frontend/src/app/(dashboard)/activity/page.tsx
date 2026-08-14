'use client';

import { useMemo, useState } from 'react';
import { CheckCheck, Pin, PinOff, Archive, EyeOff } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { ActionMenu } from '@/components/ui/action-menu';
import {
  useArchiveActivity,
  useDismissActivity,
  useEntityActivityFeed,
  useMarkActivityRead,
  useMarkAllActivityRead,
  usePersonalActivityFeed,
  usePinActivity,
  useUnpinActivity,
  useWorkspaceActivityFeedFiltered,
} from '@/hooks';
import { formatDistanceToNow } from '@/lib/utils';
import type { ActivityEntry, ActivityFilterParams, ActivityOutcome } from '@/types';

const OUTCOME_OPTIONS: { value: ActivityOutcome; label: string }[] = [
  { value: 'SUCCESS', label: 'Success' },
  { value: 'FAILURE', label: 'Failure' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'PENDING', label: 'Pending' },
];

const outcomeTone: Record<ActivityOutcome, 'success' | 'danger' | 'warning' | 'info'> = {
  SUCCESS: 'success',
  FAILURE: 'danger',
  PARTIAL: 'warning',
  PENDING: 'info',
};

export default function ActivityCenterPage() {
  return (
    <div>
      <PageHeader title="Activity Center" description="Personalized, workspace and entity-level activity timelines across ATLAS." />

      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal">My Feed</TabsTrigger>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="entity">By Entity</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <PersonalFeedTab />
        </TabsContent>
        <TabsContent value="workspace">
          <WorkspaceFeedTab />
        </TabsContent>
        <TabsContent value="entity">
          <EntityFeedTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function useSharedFilters() {
  const [search, setSearch] = useState('');
  const [outcome, setOutcome] = useState<ActivityOutcome | ''>('');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const params = useMemo<ActivityFilterParams>(
    () => ({
      search: search || undefined,
      outcome: outcome || undefined,
      pinned: pinnedOnly || undefined,
      sortOrder: 'desc',
      page,
      limit,
    }),
    [search, outcome, pinnedOnly, page, limit],
  );

  return { search, setSearch, outcome, setOutcome, pinnedOnly, setPinnedOnly, page, setPage, limit, setLimit, params };
}

function FilterRow({
  search,
  onSearchChange,
  outcome,
  onOutcomeChange,
  pinnedOnly,
  onPinnedToggle,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  outcome: ActivityOutcome | '';
  onOutcomeChange: (v: ActivityOutcome | '') => void;
  pinnedOnly: boolean;
  onPinnedToggle: () => void;
}) {
  return (
    <FilterBar searchValue={search} onSearchChange={onSearchChange} searchPlaceholder="Search activity…" className="mb-4">
      <Select value={outcome} onChange={(e) => onOutcomeChange(e.target.value as ActivityOutcome | '')} options={[{ value: '', label: 'All outcomes' }, ...OUTCOME_OPTIONS]} className="h-9 w-40" />
      <Button variant={pinnedOnly ? 'secondary' : 'outline'} size="sm" onClick={onPinnedToggle}>
        <Pin className="h-3.5 w-3.5" />
        Pinned only
      </Button>
    </FilterBar>
  );
}

function PersonalFeedTab() {
  const f = useSharedFilters();
  const feed = usePersonalActivityFeed(f.params);
  const markAllRead = useMarkAllActivityRead();

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
          <CheckCheck className="h-3.5 w-3.5" />
          Mark all read
        </Button>
      </div>
      <FilterRow
        search={f.search}
        onSearchChange={(v) => {
          f.setSearch(v);
          f.setPage(1);
        }}
        outcome={f.outcome}
        onOutcomeChange={(v) => {
          f.setOutcome(v);
          f.setPage(1);
        }}
        pinnedOnly={f.pinnedOnly}
        onPinnedToggle={() => {
          f.setPinnedOnly((p) => !p);
          f.setPage(1);
        }}
      />
      <ActivityList feed={feed} page={f.page} limit={f.limit} onPageChange={f.setPage} onLimitChange={f.setLimit} />
    </div>
  );
}

function WorkspaceFeedTab() {
  const f = useSharedFilters();
  const feed = useWorkspaceActivityFeedFiltered(f.params);

  return (
    <div>
      <FilterRow
        search={f.search}
        onSearchChange={(v) => {
          f.setSearch(v);
          f.setPage(1);
        }}
        outcome={f.outcome}
        onOutcomeChange={(v) => {
          f.setOutcome(v);
          f.setPage(1);
        }}
        pinnedOnly={f.pinnedOnly}
        onPinnedToggle={() => {
          f.setPinnedOnly((p) => !p);
          f.setPage(1);
        }}
      />
      <ActivityList feed={feed} page={f.page} limit={f.limit} onPageChange={f.setPage} onLimitChange={f.setLimit} />
    </div>
  );
}

function EntityFeedTab() {
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const feed = useEntityActivityFeed(entityType || undefined, entityId || undefined, { page, limit, sortOrder: 'desc' });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <FormField label="Entity type" htmlFor="ac-entity-type">
          <Input id="ac-entity-type" value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="e.g. supplier, product" className="h-9 w-48" />
        </FormField>
        <FormField label="Entity ID" htmlFor="ac-entity-id">
          <Input id="ac-entity-id" value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="Entity ID" className="h-9 w-64" />
        </FormField>
      </div>

      {!entityType || !entityId ? (
        <EmptyState title="Enter an entity type and ID" description="View the full activity timeline for a specific record." className="border-none py-10" />
      ) : (
        <ActivityList feed={feed} page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit} />
      )}
    </div>
  );
}

function ActivityList({
  feed,
  page,
  limit,
  onPageChange,
  onLimitChange,
}: {
  feed: ReturnType<typeof usePersonalActivityFeed>;
  page: number;
  limit: number;
  onPageChange: (p: number) => void;
  onLimitChange: (l: number) => void;
}) {
  const markRead = useMarkActivityRead();
  const pin = usePinActivity();
  const unpin = useUnpinActivity();
  const archive = useArchiveActivity();
  const dismiss = useDismissActivity();

  const rows = feed.data?.data ?? [];

  if (feed.isLoading) return <Skeleton className="h-96 w-full" />;
  if (feed.isError) return <QueryErrorState refetch={feed.refetch} />;
  if (rows.length === 0) return <EmptyState title="No activity" description="Nothing matches these filters." />;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Activity</TableHead>
            <TableHead>Module</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>Outcome</TableHead>
            <TableHead>When</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((entry) => (
            <ActivityRow
              key={entry.id}
              entry={entry}
              onMarkRead={() => markRead.mutate(entry.id)}
              onPin={() => pin.mutate(entry.id)}
              onUnpin={() => unpin.mutate(entry.id)}
              onArchive={() => archive.mutate(entry.id)}
              onDismiss={() => dismiss.mutate(entry.id)}
            />
          ))}
        </TableBody>
      </Table>
      <Pagination
        page={feed.data?.page ?? page}
        limit={feed.data?.limit ?? limit}
        total={feed.data?.total ?? 0}
        totalPages={feed.data?.totalPages ?? 0}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
      />
    </>
  );
}

function ActivityRow({
  entry,
  onMarkRead,
  onPin,
  onUnpin,
  onArchive,
  onDismiss,
}: {
  entry: ActivityEntry;
  onMarkRead: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onArchive: () => void;
  onDismiss: () => void;
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-start gap-2">
          {entry.pinned && <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />}
          <div className="min-w-0">
            <p className={entry.status === 'UNREAD' ? 'text-sm font-semibold text-foreground' : 'text-sm text-foreground'}>{entry.title}</p>
            {entry.description && <p className="line-clamp-2 text-xs text-muted-foreground">{entry.description}</p>}
            <p className="text-xs text-muted-foreground">{entry.actorName ?? entry.actorType ?? 'System'}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{entry.sourceModule}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{entry.entityType ? `${entry.entityType} · ${entry.entityId}` : '—'}</TableCell>
      <TableCell>{entry.outcome && <Badge variant={outcomeTone[entry.outcome]} className="text-[10px] capitalize">{entry.outcome.toLowerCase()}</Badge>}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(entry.createdAt)}</TableCell>
      <TableCell>
        <ActionMenu
          items={[
            ...(entry.status === 'UNREAD' ? [{ label: 'Mark read', icon: CheckCheck, onSelect: onMarkRead }] : []),
            entry.pinned ? { label: 'Unpin', icon: PinOff, onSelect: onUnpin } : { label: 'Pin', icon: Pin, onSelect: onPin },
            { label: 'Archive', icon: Archive, onSelect: onArchive, separatorBefore: true },
            { label: 'Dismiss', icon: EyeOff, onSelect: onDismiss },
          ]}
        />
      </TableCell>
    </TableRow>
  );
}
