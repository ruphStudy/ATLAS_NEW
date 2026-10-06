'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreateTask, useTaskDashboard, useTasks } from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { CreateTaskPayload, Task, TaskFilterParams, TaskPriority, TaskStatus } from '@/types';

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'TODO', label: 'To do' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const priorityTone: Record<TaskPriority, 'success' | 'info' | 'warning' | 'danger'> = {
  LOW: 'success',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'danger',
};

export default function TasksPage() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Task Management"
        description="My tasks, team tasks, and everything overdue or coming up."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New task
          </Button>
        }
      />

      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine">My Tasks</TabsTrigger>
          <TabsTrigger value="team">Team Tasks</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value="mine">
          <TaskListTab base={{ myTasks: true }} />
        </TabsContent>
        <TabsContent value="team">
          <TeamTasksTab />
        </TabsContent>
        <TabsContent value="overdue">
          <TaskListTab base={{ overdue: true }} />
        </TabsContent>
        <TabsContent value="upcoming">
          <TaskListTab base={{ upcoming: true }} />
        </TabsContent>
        <TabsContent value="all">
          <TaskListTab base={{}} />
        </TabsContent>
      </Tabs>

      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function TaskListTab({ base }: { base: Partial<TaskFilterParams> }) {
  const router = useRouter();
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const params = useMemo<TaskFilterParams>(
    () => ({
      ...base,
      status: status || undefined,
      priority: priority || undefined,
      search: search || undefined,
      sortOrder: 'desc',
      page,
      limit,
    }),
    [base, status, priority, search, page, limit],
  );

  const tasks = useTasks(params);
  const rows = tasks.data?.data ?? [];
  const hasActiveFilters = !!(status || priority || search);

  return (
    <div>
      <FilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search tasks…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setStatus('');
          setPriority('');
          setSearch('');
          setPage(1);
        }}
        className="mb-4"
      >
        <Select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus | '')} options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]} className="h-9 w-40" />
        <Select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority | '')} options={[{ value: '', label: 'All priorities' }, ...PRIORITY_OPTIONS]} className="h-9 w-36" />
      </FilterBar>

      {tasks.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : tasks.isError ? (
        <QueryErrorState refetch={tasks.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No tasks" description="Nothing matches these filters." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t: Task) => (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/tasks/${t.id}`)}>
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.module ?? t.category ?? '—'}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={priorityTone[t.priority]} className="text-[10px] capitalize">
                      {t.priority.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="w-32">
                    <div className="flex items-center gap-2">
                      <Progress value={t.progressPercent} className="w-16" />
                      <span className="text-xs text-muted-foreground">{t.progressPercent}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.assigneeRef ?? '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.dueAt ? formatDate(t.dueAt) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={tasks.data?.page ?? page}
            limit={tasks.data?.limit ?? limit}
            total={tasks.data?.total ?? 0}
            totalPages={tasks.data?.totalPages ?? 0}
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

/** The backend only exposes "team tasks" (tasks assigned to a role/team the caller holds) as a fixed slice of the dashboard summary — there's no standalone paginated/filterable endpoint for it. */
function TeamTasksTab() {
  const router = useRouter();
  const dashboard = useTaskDashboard();

  if (dashboard.isLoading) return <Skeleton className="h-96 w-full" />;
  if (dashboard.isError) return <QueryErrorState refetch={dashboard.refetch} />;

  const rows = dashboard.data?.teamTasks ?? [];
  if (rows.length === 0) return <EmptyState title="No team tasks" description="Nothing is currently assigned to a team or role you belong to." />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Progress</TableHead>
          <TableHead>Due</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((t) => (
          <TableRow key={t.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/tasks/${t.id}`)}>
            <TableCell>
              <p className="text-sm font-medium text-foreground">{t.title}</p>
              <p className="text-xs text-muted-foreground">{t.module ?? '—'}</p>
            </TableCell>
            <TableCell>
              <Badge variant={priorityTone[t.priority]} className="text-[10px] capitalize">
                {t.priority.toLowerCase()}
              </Badge>
            </TableCell>
            <TableCell>
              <StatusBadge status={t.status} />
            </TableCell>
            <TableCell className="w-32">
              <div className="flex items-center gap-2">
                <Progress value={t.progressPercent} className="w-16" />
                <span className="text-xs text-muted-foreground">{t.progressPercent}%</span>
              </div>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">{t.dueAt ? formatDate(t.dueAt) : '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function CreateTaskDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const createTask = useCreateTask();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueAt, setDueAt] = useState('');

  function reset() {
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setDueAt('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Title" htmlFor="task-title" required>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormField>
          <FormField label="Description" htmlFor="task-description">
            <Input id="task-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Priority" htmlFor="task-priority">
              <Select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} options={PRIORITY_OPTIONS} />
            </FormField>
            <FormField label="Due date" htmlFor="task-due">
              <Input id="task-due" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const payload: CreateTaskPayload = { title, description: description || undefined, priority, dueAt: dueAt || undefined };
              createTask.mutate(payload, {
                onSuccess: () => {
                  reset();
                  onOpenChange(false);
                },
              });
            }}
            disabled={!title || createTask.isPending}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
