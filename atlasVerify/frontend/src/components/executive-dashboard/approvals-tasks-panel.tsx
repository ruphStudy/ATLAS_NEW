'use client';

import Link from 'next/link';
import { CheckSquare, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import type { ApprovalRequestSummary, TaskSummary } from '@/types';

const PRIORITY_TONE: Record<string, string> = { URGENT: 'text-danger', HIGH: 'text-warning', MEDIUM: 'text-info', LOW: 'text-muted-foreground' };

export function ApprovalsTasksPanel({
  approvals,
  overdueTasks,
  loadingApprovals,
  loadingTasks,
}: {
  approvals: ApprovalRequestSummary[];
  overdueTasks: TaskSummary[];
  loadingApprovals?: boolean;
  loadingTasks?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            Pending your approval
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {loadingApprovals ? (
            <Skeleton className="h-24 w-full" />
          ) : approvals.length === 0 ? (
            <EmptyState title="Nothing pending" description="You're all caught up." className="border-none py-6" />
          ) : (
            <Link href="/dashboard/approval-workflow" className="block space-y-1">
              {approvals.map((req) => (
                <div key={req.id} className="flex items-center justify-between gap-2 rounded-[calc(var(--radius)-4px)] px-2 py-2 hover:bg-secondary">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{req.title}</p>
                    <p className="text-xs text-muted-foreground">{req.module}</p>
                  </div>
                  {req.slaDueAt && <span className="shrink-0 text-xs text-muted-foreground">{formatDate(req.slaDueAt)}</span>}
                </div>
              ))}
            </Link>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-danger" />
            Overdue tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {loadingTasks ? (
            <Skeleton className="h-24 w-full" />
          ) : overdueTasks.length === 0 ? (
            <EmptyState title="No overdue tasks" description="You're on track." className="border-none py-6" />
          ) : (
            overdueTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-2 rounded-[calc(var(--radius)-4px)] px-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{task.title}</p>
                  {task.dueAt && <p className="text-xs text-danger">Due {formatDate(task.dueAt)}</p>}
                </div>
                <Badge variant="outline" className={`shrink-0 ${PRIORITY_TONE[task.priority] ?? ''}`}>
                  {task.priority.toLowerCase()}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
