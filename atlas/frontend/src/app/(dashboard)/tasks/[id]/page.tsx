'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { Play, Pause, Check, Ban, Archive, Plus, Trash2, Eye, UserPlus, UserCog } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Select } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { ActionMenu } from '@/components/ui/action-menu';
import {
  useAddChecklistItem,
  useAddTaskComment,
  useAddTaskWatcher,
  useArchiveTask,
  useAssignTask,
  useCancelTask,
  useCompleteTask,
  usePauseTask,
  useRemoveChecklistItem,
  useRemoveTaskWatcher,
  useResumeTask,
  useStartTask,
  useSubtasks,
  useTask,
  useTaskAttachments,
  useTaskChecklist,
  useTaskComments,
  useTaskWatchers,
  useUpdateChecklistItem,
  useUsers,
} from '@/hooks';
import { formatDate, formatDistanceToNow } from '@/lib/utils';
import type { TaskAssigneeType, TaskPriority } from '@/types';

const priorityTone: Record<TaskPriority, 'success' | 'info' | 'warning' | 'danger'> = {
  LOW: 'success',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'danger',
};

const ASSIGNEE_TYPE_OPTIONS: { value: TaskAssigneeType; label: string }[] = [
  { value: 'USER', label: 'User' },
  { value: 'ROLE', label: 'Role' },
  { value: 'TEAM', label: 'Team' },
  { value: 'WORKSPACE', label: 'Workspace' },
];

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: task, isLoading, isError, error, refetch } = useTask(id);

  const start = useStartTask(id);
  const pause = usePauseTask(id);
  const resume = useResumeTask(id);
  const complete = useCompleteTask(id);
  const cancel = useCancelTask(id);
  const archive = useArchiveTask(id);

  const isForbidden = isAxiosError(error) && error.response?.status === 403;
  const isNotFound = isAxiosError(error) && error.response?.status === 404;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description={isNotFound ? 'This task could not be found.' : "We couldn't load this task."} />;
  if (isLoading || !task) return <Skeleton className="h-96 w-full" />;

  const canStart = task.status === 'TODO';
  const canPause = task.status === 'IN_PROGRESS';
  const canResume = task.status === 'PAUSED';
  const canComplete = task.status === 'IN_PROGRESS' || task.status === 'PAUSED';
  const canCancel = task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && task.status !== 'ARCHIVED';
  const canArchive = task.status === 'COMPLETED' || task.status === 'CANCELLED';

  return (
    <div>
      <PageHeader
        title={task.title}
        breadcrumbs={[{ label: 'Tasks', href: '/tasks' }, { label: task.title }]}
        actions={
          <>
            <Badge variant={priorityTone[task.priority]} className="capitalize">
              {task.priority.toLowerCase()}
            </Badge>
            <StatusBadge status={task.status} />
            <ActionMenu
              items={[
                ...(canStart ? [{ label: 'Start', icon: Play, onSelect: () => start.mutate() }] : []),
                ...(canPause ? [{ label: 'Pause', icon: Pause, onSelect: () => pause.mutate() }] : []),
                ...(canResume ? [{ label: 'Resume', icon: Play, onSelect: () => resume.mutate() }] : []),
                ...(canComplete ? [{ label: 'Complete', icon: Check, onSelect: () => complete.mutate() }] : []),
                ...(canCancel ? [{ label: 'Cancel', icon: Ban, onSelect: () => cancel.mutate({}), destructive: true, separatorBefore: true }] : []),
                ...(canArchive ? [{ label: 'Archive', icon: Archive, onSelect: () => archive.mutate({}) }] : []),
              ]}
            />
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="Module" value={task.module ?? '—'} />
        <Field label="Entity" value={task.entityType ? `${task.entityType} · ${task.entityId}` : '—'} />
        <Field label="Created by" value={task.createdBy ?? '—'} />
        <Field label="Due" value={task.dueAt ? formatDate(task.dueAt) : '—'} />
        <Field label="Effort estimate" value={task.effortEstimateHours != null ? `${task.effortEstimateHours}h` : '—'} />
        <Field label="Time spent" value={`${Math.round(task.timeSpentMinutes / 60)}h ${task.timeSpentMinutes % 60}m`} />
        <Field label="Created" value={formatDate(task.createdAt)} />
        <Field label="Completed" value={task.completedAt ? formatDate(task.completedAt) : '—'} />
      </div>

      {task.description && (
        <Card className="mb-6">
          <CardContent className="pt-6 text-sm text-foreground">{task.description}</CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Progress value={task.progressPercent} className="flex-1" />
            <span className="text-sm text-muted-foreground">{task.progressPercent}%</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <AssigneeCard taskId={id} assigneeType={task.assigneeType} assigneeRef={task.assigneeRef} />
        <SubtasksCard taskId={id} onOpenSubtask={(subId) => router.push(`/tasks/${subId}`)} />
        <ChecklistCard taskId={id} />
        <WatchersCard taskId={id} />
        <CommentsCard taskId={id} />
        <AttachmentsCard taskId={id} />
      </div>
    </div>
  );
}

function AssigneeCard({ taskId, assigneeType, assigneeRef }: { taskId: string; assigneeType?: TaskAssigneeType | null; assigneeRef?: string | null }) {
  const assign = useAssignTask(taskId);
  const users = useUsers({ limit: 100 });
  const userOptions = (users.data?.items ?? []).map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }));

  const [type, setType] = useState<TaskAssigneeType>('USER');
  const [ref, setRef] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Assignee</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Currently: {assigneeType ? `${assigneeType.toLowerCase()} · ${assigneeRef}` : 'Unassigned'}
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <Select value={type} onChange={(e) => setType(e.target.value as TaskAssigneeType)} options={ASSIGNEE_TYPE_OPTIONS} className="h-9 w-32" />
          {type === 'USER' ? (
            <Select value={ref} onChange={(e) => setRef(e.target.value)} options={userOptions} placeholder="Select user" className="h-9 w-48" />
          ) : (
            <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder={`${type.toLowerCase()} reference`} className="h-9 w-48" />
          )}
          <Button size="sm" variant="outline" onClick={() => assign.mutate({ assigneeType: type, assigneeRef: ref })} disabled={!ref || assign.isPending}>
            <UserCog className="h-3.5 w-3.5" />
            Assign
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SubtasksCard({ taskId, onOpenSubtask }: { taskId: string; onOpenSubtask: (id: string) => void }) {
  const subtasks = useSubtasks(taskId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Subtasks</CardTitle>
      </CardHeader>
      <CardContent>
        {subtasks.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : !subtasks.data || subtasks.data.length === 0 ? (
          <EmptyState title="No subtasks" className="border-none py-6" />
        ) : (
          <div className="space-y-2">
            {subtasks.data.map((s) => (
              <button key={s.id} onClick={() => onOpenSubtask(s.id)} className="flex w-full items-center justify-between rounded-[var(--radius)] border border-border p-2.5 text-left text-sm hover:bg-secondary">
                <span className="text-foreground">{s.title}</span>
                <StatusBadge status={s.status} />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChecklistCard({ taskId }: { taskId: string }) {
  const checklist = useTaskChecklist(taskId);
  const addItem = useAddChecklistItem(taskId);
  const updateItem = useUpdateChecklistItem(taskId);
  const removeItem = useRemoveChecklistItem(taskId);
  const [text, setText] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Checklist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {checklist.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : !checklist.data || checklist.data.length === 0 ? (
          <EmptyState title="No checklist items" className="border-none py-4" />
        ) : (
          <div className="space-y-1.5">
            {checklist.data.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={item.isDone} onChange={() => updateItem.mutate({ itemId: item.id, payload: { isDone: !item.isDone } })} />
                  <span className={item.isDone ? 'text-muted-foreground line-through' : 'text-foreground'}>{item.text}</span>
                </label>
                <button onClick={() => removeItem.mutate(item.id)} aria-label="Remove item" className="text-muted-foreground hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add an item…" className="h-9" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              addItem.mutate({ text }, { onSuccess: () => setText('') });
            }}
            disabled={!text || addItem.isPending}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function WatchersCard({ taskId }: { taskId: string }) {
  const watchers = useTaskWatchers(taskId);
  const addWatcher = useAddTaskWatcher(taskId);
  const removeWatcher = useRemoveTaskWatcher(taskId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Watchers
          </span>
          <Button variant="ghost" size="sm" onClick={() => addWatcher.mutate(undefined)} disabled={addWatcher.isPending}>
            <UserPlus className="h-3.5 w-3.5" />
            Watch
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {watchers.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : !watchers.data || watchers.data.length === 0 ? (
          <EmptyState title="No watchers" className="border-none py-4" />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {watchers.data.map((w) => (
              <Badge key={w.id} variant="secondary" className="gap-1 text-[10px]">
                {w.userId}
                <button onClick={() => removeWatcher.mutate(w.id)} aria-label="Remove watcher">
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CommentsCard({ taskId }: { taskId: string }) {
  const comments = useTaskComments(taskId);
  const addComment = useAddTaskComment(taskId);
  const [comment, setComment] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Comments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {comments.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : !comments.data || comments.data.length === 0 ? (
          <EmptyState title="No comments yet" className="border-none py-4" />
        ) : (
          <div className="space-y-2">
            {comments.data.map((c) => (
              <div key={c.id} className="rounded-[var(--radius)] border border-border p-2.5 text-sm">
                <p className="text-foreground">{c.comment}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.authorId ?? 'Unknown'} · {formatDistanceToNow(c.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" rows={2} className="min-h-0" />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => addComment.mutate(comment, { onSuccess: () => setComment('') })}
          disabled={!comment || addComment.isPending}
        >
          Post comment
        </Button>
      </CardContent>
    </Card>
  );
}

function AttachmentsCard({ taskId }: { taskId: string }) {
  const attachments = useTaskAttachments(taskId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Attachments</CardTitle>
      </CardHeader>
      <CardContent>
        {attachments.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : !attachments.data || attachments.data.length === 0 ? (
          <EmptyState title="No attachments" description="Attach files from File Management to this task." className="border-none py-4" />
        ) : (
          <div className="space-y-1.5">
            {attachments.data.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-2 text-sm">
                <span className="text-foreground">{a.fileId}</span>
                <span className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  );
}
