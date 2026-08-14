'use client';

import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { cn, formatDistanceToNow } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarkAllNotificationsAsRead, useMarkNotificationAsRead, useNotifications, useUnreadNotificationCount } from '@/hooks';
import type { Notification } from '@/types';

const dotColorByType: Record<Notification['type'], string> = {
  INFO: 'bg-info',
  SUCCESS: 'bg-success',
  WARNING: 'bg-warning',
  ERROR: 'bg-danger',
};

export function NotificationsMenu() {
  const { data: unreadCount } = useUnreadNotificationCount();
  const { data, isLoading } = useNotifications({ limit: 10, sortBy: 'createdAt', sortOrder: 'desc' });
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <Bell className="h-4 w-4" />
          {!!unreadCount && unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {!!unreadCount && unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead.mutate()}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto p-1.5">
          {isLoading && (
            <div className="space-y-2 p-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          )}

          {!isLoading && (data?.data.length ?? 0) === 0 && <EmptyState title="You're all caught up" description="No notifications yet." className="border-none py-8" />}

          {data?.data.map((n) => (
            <button
              key={n.id}
              onClick={() => n.status === 'UNREAD' && markAsRead.mutate(n.id)}
              className={cn('flex w-full items-start gap-2.5 rounded-[calc(var(--radius)-4px)] px-2.5 py-2.5 text-left transition-colors hover:bg-secondary', n.status === 'UNREAD' && 'bg-primary/5')}
            >
              <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', n.status === 'UNREAD' ? dotColorByType[n.type] : 'bg-transparent')} />
              <div className="min-w-0 flex-1">
                <p className={cn('truncate text-sm', n.status === 'UNREAD' ? 'font-semibold text-foreground' : 'text-foreground')}>{n.title}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{formatDistanceToNow(n.createdAt)}</p>
              </div>
              {n.priority === 'URGENT' && (
                <Badge variant="danger" className="shrink-0 text-[9px]">
                  Urgent
                </Badge>
              )}
            </button>
          ))}
        </div>

        <Link
          href="/dashboard/notifications"
          className="block border-t border-border px-3 py-2.5 text-center text-xs font-medium text-primary hover:bg-secondary"
        >
          View all notifications
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
