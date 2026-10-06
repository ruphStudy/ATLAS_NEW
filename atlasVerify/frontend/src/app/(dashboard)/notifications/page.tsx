'use client';

import { useMemo, useState } from 'react';
import { CheckCheck, Archive, ArchiveRestore, EyeOff, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { ActionMenu } from '@/components/ui/action-menu';
import {
  useArchiveNotification,
  useDeleteNotification,
  useDismissNotification,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
  useRestoreNotification,
} from '@/hooks';
import { formatDistanceToNow } from '@/lib/utils';
import type { Notification, NotificationPriority, NotificationStatus, NotificationType } from '@/types';

const STATUS_OPTIONS: { value: NotificationStatus; label: string }[] = [
  { value: 'UNREAD', label: 'Unread' },
  { value: 'READ', label: 'Read' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: 'DISMISSED', label: 'Dismissed' },
  { value: 'EXPIRED', label: 'Expired' },
];

const TYPE_OPTIONS: { value: NotificationType; label: string }[] = [
  { value: 'INFO', label: 'Info' },
  { value: 'SUCCESS', label: 'Success' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'ERROR', label: 'Error' },
];

const PRIORITY_OPTIONS: { value: NotificationPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const typeTone: Record<NotificationType, 'info' | 'success' | 'warning' | 'danger'> = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'danger',
};

export default function NotificationsPage() {
  const [status, setStatus] = useState<NotificationStatus | ''>('');
  const [type, setType] = useState<NotificationType | ''>('');
  const [priority, setPriority] = useState<NotificationPriority | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const params = useMemo(
    () => ({
      status: status || undefined,
      type: type || undefined,
      priority: priority || undefined,
      search: search || undefined,
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
      page,
      limit,
    }),
    [status, type, priority, search, page, limit],
  );

  const notifications = useNotifications(params);
  const markAllRead = useMarkAllNotificationsAsRead();
  const markRead = useMarkNotificationAsRead();
  const archive = useArchiveNotification();
  const restore = useRestoreNotification();
  const dismiss = useDismissNotification();
  const remove = useDeleteNotification();

  const rows = notifications.data?.data ?? [];
  const allSelected = rows.length > 0 && rows.every((n) => selected.has(n.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((n) => n.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bulkArchive() {
    selected.forEach((id) => archive.mutate(id));
    setSelected(new Set());
  }

  function bulkDismiss() {
    selected.forEach((id) => dismiss.mutate(id));
    setSelected(new Set());
  }

  const hasActiveFilters = !!(status || type || priority || search);

  return (
    <div>
      <PageHeader
        title="Notification Center"
        description="All notifications across ATLAS — filter, triage and manage in one place."
        actions={
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search notifications…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setStatus('');
          setType('');
          setPriority('');
          setSearch('');
          setPage(1);
        }}
        className="mb-4"
      >
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as NotificationStatus | '');
            setPage(1);
          }}
          options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]}
          className="h-9 w-40"
        />
        <Select
          value={type}
          onChange={(e) => {
            setType(e.target.value as NotificationType | '');
            setPage(1);
          }}
          options={[{ value: '', label: 'All types' }, ...TYPE_OPTIONS]}
          className="h-9 w-36"
        />
        <Select
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value as NotificationPriority | '');
            setPage(1);
          }}
          options={[{ value: '', label: 'All priorities' }, ...PRIORITY_OPTIONS]}
          className="h-9 w-40"
        />
      </FilterBar>

      {selected.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-[var(--radius)] border border-border bg-secondary px-3 py-2">
          <p className="text-sm text-foreground">{selected.size} selected</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={bulkDismiss}>
              <EyeOff className="h-3.5 w-3.5" />
              Dismiss
            </Button>
            <Button variant="outline" size="sm" onClick={bulkArchive}>
              <Archive className="h-3.5 w-3.5" />
              Archive
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {notifications.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : notifications.isError ? (
        <QueryErrorState refetch={notifications.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No notifications" description="Nothing matches these filters." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                </TableHead>
                <TableHead>Notification</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  selected={selected.has(n.id)}
                  onToggle={() => toggleOne(n.id)}
                  onMarkRead={() => markRead.mutate(n.id)}
                  onArchive={() => archive.mutate(n.id)}
                  onRestore={() => restore.mutate(n.id)}
                  onDismiss={() => dismiss.mutate(n.id)}
                  onDelete={() => remove.mutate(n.id)}
                />
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={notifications.data?.page ?? page}
            limit={notifications.data?.limit ?? limit}
            total={notifications.data?.total ?? 0}
            totalPages={notifications.data?.totalPages ?? 0}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </>
      )}
    </div>
  );
}

function NotificationRow({
  notification: n,
  selected,
  onToggle,
  onMarkRead,
  onArchive,
  onRestore,
  onDismiss,
  onDelete,
}: {
  notification: Notification;
  selected: boolean;
  onToggle: () => void;
  onMarkRead: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDismiss: () => void;
  onDelete: () => void;
}) {
  return (
    <TableRow>
      <TableCell>
        <Checkbox checked={selected} onChange={onToggle} aria-label={`Select ${n.title}`} />
      </TableCell>
      <TableCell>
        <div className="flex items-start gap-2">
          <Badge variant={typeTone[n.type]} className="mt-0.5 shrink-0 text-[9px]">
            {n.type.toLowerCase()}
          </Badge>
          <div className="min-w-0">
            <p className={n.status === 'UNREAD' ? 'text-sm font-semibold text-foreground' : 'text-sm text-foreground'}>{n.title}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{n.category ?? n.sourceModule ?? '—'}</TableCell>
      <TableCell>
        {n.priority === 'URGENT' || n.priority === 'HIGH' ? (
          <Badge variant={n.priority === 'URGENT' ? 'danger' : 'warning'} className="text-[10px]">
            {n.priority.toLowerCase()}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">{n.priority.toLowerCase()}</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={n.status === 'UNREAD' ? 'info' : n.status === 'ARCHIVED' || n.status === 'DISMISSED' ? 'secondary' : 'success'} className="text-[10px] capitalize">
          {n.status.toLowerCase()}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(n.createdAt)}</TableCell>
      <TableCell>
        <ActionMenu
          items={[
            ...(n.status === 'UNREAD' ? [{ label: 'Mark read', icon: CheckCheck, onSelect: onMarkRead }] : []),
            ...(n.status === 'ARCHIVED' ? [{ label: 'Restore', icon: ArchiveRestore, onSelect: onRestore }] : [{ label: 'Archive', icon: Archive, onSelect: onArchive }]),
            ...(n.status !== 'DISMISSED' ? [{ label: 'Dismiss', icon: EyeOff, onSelect: onDismiss }] : []),
            { label: 'Delete', icon: Trash2, onSelect: onDelete, destructive: true, separatorBefore: true },
          ]}
        />
      </TableCell>
    </TableRow>
  );
}
