'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { KpiCard } from '@/components/ui/kpi-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import {
  useAiJobs,
  useAiQueue,
  useAiQueues,
  useArchiveAiJob,
  useCancelQueueJob,
  useCreateAiJob,
  useJobExecutions,
  usePauseAiJob,
  usePauseAiQueue,
  useQueueJobs,
  useQueueStats,
  useResumeAiJob,
  useResumeAiQueue,
} from '@/hooks';
import { useAuthStore } from '@/stores';
import { formatDate } from '@/lib/utils';
import type { AiJobStatus, AiJobTaskType, AiJobType, AiQueueJob } from '@/types';

const JOB_TYPE_OPTIONS: { value: AiJobType; label: string }[] = [
  { value: 'ONE_TIME', label: 'One time' },
  { value: 'RECURRING', label: 'Recurring' },
  { value: 'CRON', label: 'Cron' },
  { value: 'DELAYED', label: 'Delayed' },
  { value: 'EVENT_TRIGGERED', label: 'Event triggered' },
];

const TASK_TYPE_OPTIONS: { value: AiJobTaskType; label: string }[] = [
  { value: 'WORKFLOW', label: 'Workflow' },
  { value: 'AGENT', label: 'Agent' },
  { value: 'BUSINESS_TASK', label: 'Business task' },
];

const JOB_STATUS_OPTIONS: { value: AiJobStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'QUEUED', label: 'Queued' },
  { value: 'RUNNING', label: 'Running' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'RETRYING', label: 'Retrying' },
];

export default function AiSchedulerPage() {
  return (
    <div>
      <PageHeader title="AI Scheduler & Queue" description="Job scheduling and queue dashboard with queued, active, delayed, completed and failed jobs." />
      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="queues">Queues</TabsTrigger>
        </TabsList>
        <TabsContent value="jobs">
          <JobsTab />
        </TabsContent>
        <TabsContent value="queues">
          <QueuesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function JobsTab() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const [status, setStatus] = useState<AiJobStatus | ''>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useAiJobs({ workspaceId: workspaceId ?? '', status: status || undefined, limit: 30 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!status} onClearFilters={() => setStatus('')}>
          <Select value={status} onChange={(e) => setStatus(e.target.value as AiJobStatus | '')} placeholder="All statuses" options={JOB_STATUS_OPTIONS} className="h-9 w-40" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New job
        </Button>
      </div>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load jobs." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No scheduled jobs yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Success / Failure</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((j) => (
              <TableRow key={j.id} clickable onClick={() => setSelectedId(j.id)}>
                <TableCell className="text-sm font-medium text-foreground">{j.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{j.type}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{j.taskType}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{j.priority}</TableCell>
                <TableCell>
                  <StatusBadge status={j.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{j.successCount} / {j.failureCount}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <JobRowActions id={j.id} workspaceId={workspaceId ?? ''} status={j.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CreateJobDialog open={createOpen} onOpenChange={setCreateOpen} workspaceId={workspaceId} />
      <JobDetailDialog id={selectedId} workspaceId={workspaceId ?? ''} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function JobRowActions({ id, workspaceId, status }: { id: string; workspaceId: string; status: AiJobStatus }) {
  const pause = usePauseAiJob(id, workspaceId);
  const resume = useResumeAiJob(id, workspaceId);
  const archive = useArchiveAiJob(id, workspaceId);

  const actions: ActionMenuItem[] = [];
  if (status !== 'PAUSED') actions.push({ label: 'Pause', onSelect: () => pause.mutate() });
  if (status === 'PAUSED') actions.push({ label: 'Resume', onSelect: () => resume.mutate() });
  actions.push({ label: 'Archive', onSelect: () => archive.mutate(), destructive: true, separatorBefore: true });

  return <ActionMenu items={actions} />;
}

function CreateJobDialog({ open, onOpenChange, workspaceId }: { open: boolean; onOpenChange: (o: boolean) => void; workspaceId: string | undefined }) {
  const createJob = useCreateAiJob();
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<AiJobType>('ONE_TIME');
  const [taskType, setTaskType] = useState<AiJobTaskType>('WORKFLOW');

  const reset = () => { setKey(''); setName(''); setType('ONE_TIME'); setTaskType('WORKFLOW'); };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>New job</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Key" htmlFor="job-key" required>
            <Input id="job-key" value={key} onChange={(e) => setKey(e.target.value)} />
          </FormField>
          <FormField label="Name" htmlFor="job-name" required>
            <Input id="job-name" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Type" htmlFor="job-type" required>
            <Select id="job-type" value={type} onChange={(e) => setType(e.target.value as AiJobType)} options={JOB_TYPE_OPTIONS} />
          </FormField>
          <FormField label="Task type" htmlFor="job-task" required>
            <Select id="job-task" value={taskType} onChange={(e) => setTaskType(e.target.value as AiJobTaskType)} options={TASK_TYPE_OPTIONS} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              workspaceId &&
              createJob.mutate({ workspaceId, key, name, type, taskType, taskConfig: {} }, { onSuccess: () => { onOpenChange(false); reset(); } })
            }
            disabled={!key || !name || createJob.isPending}
          >
            {createJob.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function JobDetailDialog({ id, workspaceId, onClose }: { id: string | null; workspaceId: string; onClose: () => void }) {
  const { data: executions } = useJobExecutions(id ? { workspaceId, jobId: id, limit: 20 } : { workspaceId: '' });

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Job executions</DialogTitle>
        </DialogHeader>
        {!executions || executions.data.length === 0 ? (
          <EmptyState title="No executions yet" className="border-none py-8" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Cost / Tokens</TableHead>
                <TableHead>Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.data.map((ex) => (
                <TableRow key={ex.id}>
                  <TableCell>
                    <StatusBadge status={ex.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{ex.progress != null ? `${ex.progress}%` : '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{ex.cost != null ? `$${ex.cost.toFixed(4)}` : '—'} / {ex.tokens ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{ex.startTime ? formatDate(ex.startTime) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}

function QueuesTab() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useAiQueues({ limit: 30 });

  return (
    <div>
      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load queues." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No queues configured yet" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.data.map((q) => (
            <Card key={q.id} className="cursor-pointer" onClick={() => setSelectedId(q.id)}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>{q.displayName}</span>
                  <StatusBadge status={q.status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <p>Concurrency {q.concurrency} · {q.routingStrategy}</p>
                <p>{q.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <QueueDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function QueueDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: queue } = useAiQueue(id ?? undefined);
  const { data: stats } = useQueueStats(id ?? undefined);
  const { data: jobs } = useQueueJobs(id ? { workspaceId: queue?.workspaceId ?? '', queueId: id, limit: 20 } : { workspaceId: '' });
  const pause = usePauseAiQueue(id ?? '');
  const resume = useResumeAiQueue(id ?? '');

  const actions: ActionMenuItem[] = [];
  if (queue && queue.status === 'ACTIVE') actions.push({ label: 'Pause', onSelect: () => pause.mutate() });
  if (queue && queue.status === 'PAUSED') actions.push({ label: 'Resume', onSelect: () => resume.mutate() });

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{queue?.displayName ?? 'Queue'}</span>
            {queue && (
              <div className="flex items-center gap-2">
                <StatusBadge status={queue.status} />
                <ActionMenu items={actions} />
              </div>
            )}
          </DialogTitle>
        </DialogHeader>
        {stats && (
          <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
            <KpiCard label="Waiting" value={stats.waiting} />
            <KpiCard label="Active" value={stats.active} />
            <KpiCard label="Delayed" value={stats.delayed} />
            <KpiCard label="Completed" value={stats.completed} />
            <KpiCard label="Failed" value={stats.failed} />
          </div>
        )}
        {!jobs || jobs.data.length === 0 ? (
          <EmptyState title="No jobs in this queue" className="border-none py-8" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.data.map((j) => (
                <QueueJobRow key={j.id} job={j} workspaceId={queue?.workspaceId ?? ''} />
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}

function QueueJobRow({ job, workspaceId }: { job: AiQueueJob; workspaceId: string }) {
  const cancel = useCancelQueueJob(job.id, workspaceId);
  return (
    <TableRow>
      <TableCell className="text-sm text-foreground">{job.jobType}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{job.priority}</TableCell>
      <TableCell>
        <StatusBadge status={job.status} />
      </TableCell>
      <TableCell className="text-right">
        {(job.status === 'WAITING' || job.status === 'DELAYED') && (
          <Button variant="ghost" size="sm" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
            Cancel
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
