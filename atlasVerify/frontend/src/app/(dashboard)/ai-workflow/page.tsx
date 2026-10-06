'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import {
  useAiWorkflow,
  useAiWorkflows,
  useArchiveAiWorkflow,
  useCreateAiWorkflow,
  usePauseAiWorkflow,
  usePublishAiWorkflow,
  useResumeAiWorkflow,
  useWorkflowExecution,
  useWorkflowExecutions,
} from '@/hooks';
import { useAuthStore } from '@/stores';
import { formatDate } from '@/lib/utils';
import type { AiWorkflowStatus, AiWorkflowTriggerType } from '@/types';

const TRIGGER_OPTIONS: { value: AiWorkflowTriggerType; label: string }[] = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'EVENT', label: 'Event' },
  { value: 'API', label: 'API' },
];

const STATUS_OPTIONS: { value: AiWorkflowStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'DEPRECATED', label: 'Deprecated' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function AiWorkflowsPage() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const [status, setStatus] = useState<AiWorkflowStatus | ''>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useAiWorkflows({ workspaceId, status: status || undefined, limit: 30 });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <PageHeader title="AI Workflows" description="Steps, dependencies, conditions, branches and execution timelines." />

      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!status} onClearFilters={() => setStatus('')}>
          <Select value={status} onChange={(e) => setStatus(e.target.value as AiWorkflowStatus | '')} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-40" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New workflow
        </Button>
      </div>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load workflows." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No workflows yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workflow</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Steps</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((w) => (
              <TableRow key={w.id} clickable onClick={() => setSelectedId(w.id)}>
                <TableCell className="text-sm font-medium text-foreground">{w.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{w.triggerType}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{w.steps.length}</TableCell>
                <TableCell>
                  <StatusBadge status={w.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">v{w.version}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CreateWorkflowDialog open={createOpen} onOpenChange={setCreateOpen} workspaceId={workspaceId} />
      <WorkflowDetailDialog id={selectedId} workspaceId={workspaceId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreateWorkflowDialog({ open, onOpenChange, workspaceId }: { open: boolean; onOpenChange: (o: boolean) => void; workspaceId: string | undefined }) {
  const createWorkflow = useCreateAiWorkflow();
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<AiWorkflowTriggerType>('MANUAL');
  const [stepName, setStepName] = useState('');

  const reset = () => { setKey(''); setName(''); setTriggerType('MANUAL'); setStepName(''); };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New workflow</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Key" htmlFor="wf-key" required>
              <Input id="wf-key" value={key} onChange={(e) => setKey(e.target.value)} />
            </FormField>
            <FormField label="Name" htmlFor="wf-name" required>
              <Input id="wf-name" value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Trigger type" htmlFor="wf-trigger" required>
            <Select id="wf-trigger" value={triggerType} onChange={(e) => setTriggerType(e.target.value as AiWorkflowTriggerType)} options={TRIGGER_OPTIONS} />
          </FormField>
          <FormField label="First step name" htmlFor="wf-step" required hint="A single ORCHESTRATOR step is created to start; add more steps via edit later.">
            <Input id="wf-step" value={stepName} onChange={(e) => setStepName(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              workspaceId &&
              createWorkflow.mutate(
                {
                  workspaceId,
                  key,
                  name,
                  triggerType,
                  steps: [{ id: 'step_1', type: 'ORCHESTRATOR', name: stepName, config: {} }],
                },
                { onSuccess: () => { onOpenChange(false); reset(); } },
              )
            }
            disabled={!key || !name || !stepName || createWorkflow.isPending}
          >
            {createWorkflow.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WorkflowDetailDialog({ id, workspaceId, onClose }: { id: string | null; workspaceId: string | undefined; onClose: () => void }) {
  const { data: workflow, isLoading } = useAiWorkflow(id ?? undefined, workspaceId);
  const { data: executions } = useWorkflowExecutions(id ? { workspaceId, workflowId: id, limit: 20 } : {});
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const publish = usePublishAiWorkflow(id ?? '', workspaceId ?? '');
  const pause = usePauseAiWorkflow(id ?? '');
  const resume = useResumeAiWorkflow(id ?? '');
  const archive = useArchiveAiWorkflow(id ?? '');

  const actions: ActionMenuItem[] = [];
  if (workflow && workflow.status !== 'ACTIVE') actions.push({ label: 'Publish', onSelect: () => publish.mutate(undefined) });
  if (workflow && workflow.status === 'ACTIVE') actions.push({ label: 'Pause', onSelect: () => pause.mutate() });
  if (workflow && workflow.status === 'PAUSED') actions.push({ label: 'Resume', onSelect: () => resume.mutate() });
  if (workflow && workflow.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => archive.mutate(), destructive: true, separatorBefore: true });

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{workflow?.name ?? 'Workflow'}</span>
            {workflow && (
              <div className="flex items-center gap-2">
                <StatusBadge status={workflow.status} />
                <ActionMenu items={actions} />
              </div>
            )}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !workflow ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Tabs defaultValue="steps">
            <TabsList>
              <TabsTrigger value="steps">Steps</TabsTrigger>
              <TabsTrigger value="executions">Executions</TabsTrigger>
            </TabsList>
            <TabsContent value="steps">
              {workflow.steps.length === 0 ? (
                <EmptyState title="No steps defined" className="border-none py-8" />
              ) : (
                <div className="space-y-2">
                  {workflow.steps.map((step, i) => (
                    <Card key={step.id}>
                      <CardContent className="flex items-start justify-between gap-3 pt-4 text-sm">
                        <div>
                          <p className="text-foreground">
                            <span className="mr-2 text-xs text-muted-foreground">#{i + 1}</span>
                            {step.name}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {step.type}
                            {step.condition ? ` · condition: ${step.condition}` : ''}
                          </p>
                          {(step.onSuccess?.length || step.onFailure?.length) && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {step.onSuccess?.length ? `On success → ${step.onSuccess.join(', ')}` : ''}
                              {step.onFailure?.length ? ` · On failure → ${step.onFailure.join(', ')}` : ''}
                            </p>
                          )}
                        </div>
                        <StatusBadge status={step.type} tone="info" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="executions">
              {!executions || executions.data.length === 0 ? (
                <EmptyState title="No executions yet" className="border-none py-8" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cost / Tokens</TableHead>
                      <TableHead>Started</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executions.data.map((ex) => (
                      <TableRow key={ex.id} clickable onClick={() => setSelectedExecutionId(ex.id)}>
                        <TableCell className="text-sm text-foreground">{ex.triggerType}</TableCell>
                        <TableCell>
                          <StatusBadge status={ex.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{ex.totalCost != null ? `$${ex.totalCost.toFixed(4)}` : '—'} / {ex.totalTokens ?? '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(ex.startTime)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
      <ExecutionTimelineDialog id={selectedExecutionId} workspaceId={workspaceId} onClose={() => setSelectedExecutionId(null)} />
    </Dialog>
  );
}

function ExecutionTimelineDialog({ id, workspaceId, onClose }: { id: string | null; workspaceId: string | undefined; onClose: () => void }) {
  const { data: execution, isLoading } = useWorkflowExecution(id ?? undefined, workspaceId);

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Execution timeline</DialogTitle>
        </DialogHeader>
        {isLoading || !execution ? (
          <Skeleton className="h-48 w-full" />
        ) : !execution.stepExecutions || execution.stepExecutions.length === 0 ? (
          <EmptyState title="No step executions recorded" className="border-none py-8" />
        ) : (
          <div className="space-y-2">
            {execution.stepExecutions.map((se) => (
              <div key={se.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-3 text-sm">
                <div>
                  <p className="text-foreground">
                    <span className="mr-2 text-xs text-muted-foreground">#{se.stepIndex + 1}</span>
                    {se.stepType}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(se.startTime)}{se.endTime ? ` – ${formatDate(se.endTime)}` : ''}</p>
                  {se.errorMessage && <p className="text-xs text-danger">{se.errorMessage}</p>}
                </div>
                <StatusBadge status={se.status} />
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
