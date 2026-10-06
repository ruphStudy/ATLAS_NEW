'use client';

import { useState } from 'react';
import { Loader2, Plus, Trash2, Play, Pause, RotateCcw, UserCog } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useArchiveWorkflowDefinition,
  useCancelEnterpriseWorkflowExecution,
  useCreateWorkflowDefinition,
  useEnterpriseWorkflowExecution,
  useEnterpriseWorkflowExecutions,
  useExecuteWorkflow,
  usePauseEnterpriseWorkflowExecution,
  usePauseWorkflowDefinition,
  usePublishWorkflowDefinition,
  useReassignWorkflowStep,
  useResumeEnterpriseWorkflowExecution,
  useResumeWorkflowDefinition,
  useResumeWorkflowStepExecution,
  useRestoreWorkflowDefinition,
  useUpdateWorkflowDefinition,
  useWorkflowDefinition,
  useWorkflowDefinitionHistory,
  useWorkflowDefinitions,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type {
  CreateEnterpriseWorkflowDefinitionPayload,
  EnterpriseWorkflowDefinitionStatus,
  EnterpriseWorkflowExecutionStatus,
  EnterpriseWorkflowKind,
  EnterpriseWorkflowStageDefinition,
  EnterpriseWorkflowStepDefinition,
  EnterpriseWorkflowTriggerType,
} from '@/types';

const STATUS_OPTIONS: { value: EnterpriseWorkflowDefinitionStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'DEPRECATED', label: 'Deprecated' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const KIND_OPTIONS: { value: EnterpriseWorkflowKind; label: string }[] = [
  { value: 'SEQUENTIAL', label: 'Sequential' },
  { value: 'PARALLEL', label: 'Parallel' },
  { value: 'CONDITIONAL', label: 'Conditional' },
  { value: 'EVENT_DRIVEN', label: 'Event-driven' },
  { value: 'HUMAN_IN_THE_LOOP', label: 'Human-in-the-loop' },
];

const TRIGGER_OPTIONS: { value: EnterpriseWorkflowTriggerType; label: string }[] = [
  { value: 'API', label: 'API' },
  { value: 'EVENT', label: 'Event' },
  { value: 'SCHEDULE', label: 'Schedule' },
  { value: 'APPROVAL', label: 'Approval' },
  { value: 'RULE', label: 'Rule' },
  { value: 'AI_DECISION', label: 'AI decision' },
  { value: 'MANUAL', label: 'Manual' },
];

const STEP_TYPE_OPTIONS = [
  'TASK',
  'APPROVAL',
  'NOTIFICATION',
  'RULE_EVALUATION',
  'AI_WORKFLOW',
  'BUSINESS_ACTION',
  'EXTERNAL_INTEGRATION',
  'CONDITION',
  'PARALLEL',
  'LOOP',
  'TIMER',
  'SUB_WORKFLOW',
].map((v) => ({ value: v, label: v.replace('_', ' ') }));

const EXECUTION_STATUS_OPTIONS: { value: EnterpriseWorkflowExecutionStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'RUNNING', label: 'Running' },
  { value: 'WAITING', label: 'Waiting' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPENSATING', label: 'Compensating' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'TIMEOUT', label: 'Timeout' },
];

const EXECUTION_STATUS_TONE: Record<EnterpriseWorkflowExecutionStatus, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
  PENDING: 'neutral',
  RUNNING: 'info',
  WAITING: 'warning',
  PAUSED: 'warning',
  COMPENSATING: 'warning',
  COMPLETED: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral',
  TIMEOUT: 'danger',
};

function emptyStage(): EnterpriseWorkflowStageDefinition {
  return { id: `stage-${Date.now()}`, name: '', steps: [] };
}

function emptyStep(): EnterpriseWorkflowStepDefinition {
  return { id: `step-${Date.now()}`, type: 'TASK', name: '', config: {} };
}

export default function EnterpriseWorkflowEnginePage() {
  return (
    <div>
      <PageHeader title="Enterprise Workflow Engine" description="Configuration-driven workflows: stages, steps, branches, conditions, timers, SLAs and execution timelines." />
      <Tabs defaultValue="definitions">
        <TabsList>
          <TabsTrigger value="definitions">Definitions</TabsTrigger>
          <TabsTrigger value="executions">Executions</TabsTrigger>
        </TabsList>
        <TabsContent value="definitions">
          <DefinitionsTab />
        </TabsContent>
        <TabsContent value="executions">
          <ExecutionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DefinitionsTab() {
  const [status, setStatus] = useState<EnterpriseWorkflowDefinitionStatus | ''>('');
  const [workflowKind, setWorkflowKind] = useState<EnterpriseWorkflowKind | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useWorkflowDefinitions({ status: status || undefined, workflowKind: workflowKind || undefined, search: search || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar
          hasActiveFilters={!!status || !!workflowKind || !!search}
          onClearFilters={() => { setStatus(''); setWorkflowKind(''); setSearch(''); setPage(1); }}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
        >
          <Select value={status} onChange={(e) => { setStatus(e.target.value as EnterpriseWorkflowDefinitionStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-40" />
          <Select value={workflowKind} onChange={(e) => { setWorkflowKind(e.target.value as EnterpriseWorkflowKind | ''); setPage(1); }} placeholder="All kinds" options={KIND_OPTIONS} className="h-9 w-48" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create workflow
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No workflow definitions found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Stages</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((d) => (
                <TableRow key={d.id} clickable onClick={() => setSelectedId(d.id)}>
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.key}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.workflowKind}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.triggerType}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.stages.length}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">v{d.version}</TableCell>
                  <TableCell>
                    <StatusBadge status={d.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={Math.ceil(data.total / 20)} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <CreateDefinitionDialog open={createOpen} onOpenChange={setCreateOpen} />
      <DefinitionDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreateDefinitionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateWorkflowDefinition();
  const [form, setForm] = useState<CreateEnterpriseWorkflowDefinitionPayload>({ key: '', name: '', stages: [] });
  const reset = () => setForm({ key: '', name: '', stages: [] });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Create workflow definition</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Key" htmlFor="w-key" required>
              <Input id="w-key" value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} />
            </FormField>
            <FormField label="Name" htmlFor="w-name" required>
              <Input id="w-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </FormField>
            <FormField label="Workflow kind" htmlFor="w-kind">
              <Select id="w-kind" value={form.workflowKind ?? ''} onChange={(e) => setForm((f) => ({ ...f, workflowKind: (e.target.value || undefined) as EnterpriseWorkflowKind | undefined }))} placeholder="Sequential" options={KIND_OPTIONS} />
            </FormField>
            <FormField label="Trigger type" htmlFor="w-trigger">
              <Select id="w-trigger" value={form.triggerType ?? ''} onChange={(e) => setForm((f) => ({ ...f, triggerType: (e.target.value || undefined) as EnterpriseWorkflowTriggerType | undefined }))} placeholder="Manual" options={TRIGGER_OPTIONS} />
            </FormField>
            <FormField label="SLA (ms)" htmlFor="w-sla">
              <Input id="w-sla" type="number" value={form.slaMs ?? ''} onChange={(e) => setForm((f) => ({ ...f, slaMs: e.target.value ? Number(e.target.value) : undefined }))} />
            </FormField>
            <FormField label="Max retries" htmlFor="w-retries">
              <Input id="w-retries" type="number" value={form.maxRetries ?? ''} onChange={(e) => setForm((f) => ({ ...f, maxRetries: e.target.value ? Number(e.target.value) : undefined }))} />
            </FormField>
          </div>
          <FormField label="Description" htmlFor="w-desc">
            <Textarea id="w-desc" rows={2} value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </FormField>
          <StageBuilder stages={form.stages} onChange={(stages) => setForm((f) => ({ ...f, stages }))} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.key || !form.name || form.stages.length === 0 || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StageBuilder({ stages, onChange }: { stages: EnterpriseWorkflowStageDefinition[]; onChange: (stages: EnterpriseWorkflowStageDefinition[]) => void }) {
  const addStage = () => onChange([...stages, emptyStage()]);
  const updateStage = (index: number, patch: Partial<EnterpriseWorkflowStageDefinition>) => {
    const next = [...stages];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };
  const removeStage = (index: number) => onChange(stages.filter((_, i) => i !== index));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Stages</p>
        <Button size="sm" variant="outline" onClick={addStage}>
          <Plus className="h-3.5 w-3.5" />
          Add stage
        </Button>
      </div>
      {stages.length === 0 ? (
        <p className="text-sm text-muted-foreground">No stages yet. Add at least one stage with steps.</p>
      ) : (
        <div className="space-y-3">
          {stages.map((stage, i) => (
            <Card key={stage.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Input value={stage.name} onChange={(e) => updateStage(i, { name: e.target.value })} placeholder={`Stage ${i + 1} name`} className="h-8 flex-1" />
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Checkbox checked={!!stage.parallel} onChange={(e) => updateStage(i, { parallel: e.target.checked })} />
                    Parallel
                  </label>
                  <Button variant="ghost" size="sm" onClick={() => removeStage(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StepBuilder steps={stage.steps} onChange={(steps) => updateStage(i, { steps })} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StepBuilder({ steps, onChange }: { steps: EnterpriseWorkflowStepDefinition[]; onChange: (steps: EnterpriseWorkflowStepDefinition[]) => void }) {
  const addStep = () => onChange([...steps, emptyStep()]);
  const updateStep = (index: number, patch: Partial<EnterpriseWorkflowStepDefinition>) => {
    const next = [...steps];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };
  const removeStep = (index: number) => onChange(steps.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <div key={step.id} className="rounded-[var(--radius)] border border-border p-2.5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Input value={step.name} onChange={(e) => updateStep(i, { name: e.target.value })} placeholder="Step name" className="h-8" />
            <Select value={step.type} onChange={(e) => updateStep(i, { type: e.target.value })} options={STEP_TYPE_OPTIONS} className="h-8" />
            <Input type="number" value={step.retries ?? ''} onChange={(e) => updateStep(i, { retries: e.target.value ? Number(e.target.value) : undefined })} placeholder="Retries" className="h-8" />
            <Input type="number" value={step.slaMs ?? ''} onChange={(e) => updateStep(i, { slaMs: e.target.value ? Number(e.target.value) : undefined })} placeholder="SLA (ms)" className="h-8" />
            <Input type="number" value={step.timeoutMs ?? ''} onChange={(e) => updateStep(i, { timeoutMs: e.target.value ? Number(e.target.value) : undefined })} placeholder="Timeout (ms)" className="h-8" />
            <Input value={step.assigneeRef ?? ''} onChange={(e) => updateStep(i, { assigneeRef: e.target.value || undefined })} placeholder="Assignee ref" className="h-8" />
            <Input
              value={(step.onSuccess ?? []).join(',')}
              onChange={(e) => updateStep(i, { onSuccess: e.target.value ? e.target.value.split(',').map((s) => s.trim()) : undefined })}
              placeholder="On success → step ids"
              className="h-8"
            />
            <Input
              value={(step.onFailure ?? []).join(',')}
              onChange={(e) => updateStep(i, { onFailure: e.target.value ? e.target.value.split(',').map((s) => s.trim()) : undefined })}
              placeholder="On failure → step ids"
              className="h-8"
            />
          </div>
          <div className="mt-2 flex items-start justify-between gap-2">
            <Textarea
              value={JSON.stringify(step.config ?? {})}
              onChange={(e) => {
                try {
                  updateStep(i, { config: JSON.parse(e.target.value || '{}') });
                } catch {
                  // ignore invalid JSON while typing
                }
              }}
              rows={2}
              placeholder='Step config (JSON) — e.g. {"taskType":"..."}'
              className="flex-1 font-mono text-xs"
            />
            <Button variant="ghost" size="sm" onClick={() => removeStep(i)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={addStep}>
        <Plus className="h-3.5 w-3.5" />
        Add step
      </Button>
    </div>
  );
}

function DefinitionDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: def, isLoading } = useWorkflowDefinition(id ?? undefined);
  const { data: history } = useWorkflowDefinitionHistory(id ?? undefined);
  const update = useUpdateWorkflowDefinition(id ?? '');
  const publish = usePublishWorkflowDefinition(id ?? '');
  const pause = usePauseWorkflowDefinition(id ?? '');
  const resume = useResumeWorkflowDefinition(id ?? '');
  const archive = useArchiveWorkflowDefinition(id ?? '');
  const restore = useRestoreWorkflowDefinition(id ?? '');
  const execute = useExecuteWorkflow();
  const [stages, setStages] = useState<EnterpriseWorkflowStageDefinition[] | null>(null);

  const actions: ActionMenuItem[] = [];
  if (def) {
    if (def.status === 'DRAFT') actions.push({ label: 'Publish', onSelect: () => publish.mutate() });
    if (def.status === 'PUBLISHED') actions.push({ label: 'Pause', onSelect: () => pause.mutate() });
    if (def.status === 'PAUSED') actions.push({ label: 'Resume', onSelect: () => resume.mutate() });
    if (def.status === 'PUBLISHED' || def.status === 'PAUSED') actions.push({ label: 'Run now', onSelect: () => execute.mutate({ definitionId: def.id, triggerType: 'MANUAL' }) });
    if (def.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => archive.mutate(), destructive: true, separatorBefore: true });
    if (def.status === 'ARCHIVED') actions.push({ label: 'Restore', onSelect: () => restore.mutate() });
  }

  const activeStages = stages ?? def?.stages ?? [];

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{def?.name ?? 'Workflow'}</span>
            {def && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !def ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="builder">Builder</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <Field label="Key" value={def.key} />
                <Field label="Kind" value={def.workflowKind} />
                <Field label="Trigger" value={def.triggerType} />
                <Field label="Status" value={def.status} />
                <Field label="Version" value={String(def.version)} />
                <Field label="Stages" value={String(def.stages.length)} />
                <Field label="SLA" value={def.slaMs ? `${def.slaMs} ms` : '—'} />
                <Field label="Max retries" value={String(def.maxRetries)} />
                <Field label="Timeout" value={def.timeoutMs ? `${def.timeoutMs} ms` : '—'} />
                <Field label="Template" value={def.isTemplate ? 'Yes' : 'No'} />
                <Field label="Published" value={def.publishedAt ? formatDate(def.publishedAt) : '—'} />
              </div>
              {def.description && <p className="mt-4 text-sm text-muted-foreground">{def.description}</p>}
              {def.tags.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tags</p>
                  <p className="text-sm text-foreground">{def.tags.join(', ')}</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="builder">
              <StageBuilder stages={activeStages} onChange={setStages} />
              {stages && (
                <div className="mt-3 flex justify-end">
                  <Button size="sm" onClick={() => update.mutate({ stages }, { onSuccess: () => setStages(null) })} disabled={update.isPending}>
                    {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save stages
                  </Button>
                </div>
              )}
            </TabsContent>
            <TabsContent value="history">
              {!history || history.length === 0 ? (
                <EmptyState title="No history yet" className="border-none py-8" />
              ) : (
                <ul className="space-y-2">
                  {history.map((h) => (
                    <li key={h.id} className="rounded-[var(--radius)] border border-border p-2 text-sm">
                      <span className="font-medium text-foreground">v{h.version} · {h.status}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
                      {h.changeReason && <p className="mt-1 text-muted-foreground">{h.changeReason}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ExecutionsTab() {
  const [status, setStatus] = useState<EnterpriseWorkflowExecutionStatus | ''>('');
  const [definitionId, setDefinitionId] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading } = useEnterpriseWorkflowExecutions({ status: status || undefined, definitionId: definitionId || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4">
        <FilterBar hasActiveFilters={!!status || !!definitionId} onClearFilters={() => { setStatus(''); setDefinitionId(''); setPage(1); }}>
          <Select value={status} onChange={(e) => { setStatus(e.target.value as EnterpriseWorkflowExecutionStatus | ''); setPage(1); }} placeholder="All statuses" options={EXECUTION_STATUS_OPTIONS} className="h-9 w-40" />
          <Input value={definitionId} onChange={(e) => { setDefinitionId(e.target.value); setPage(1); }} placeholder="Definition ID" className="h-9 w-56" />
        </FilterBar>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No workflow executions found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Execution</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Current step</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((e) => (
                <TableRow key={e.id} clickable onClick={() => setSelectedId(e.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{e.id}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.triggerType}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.currentStepId ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(e.startTime)}</TableCell>
                  <TableCell>
                    <StatusBadge status={e.status} tone={EXECUTION_STATUS_TONE[e.status]} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={Math.ceil(data.total / 20)} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <ExecutionDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

const TERMINAL_EXECUTION_STATUSES = new Set<EnterpriseWorkflowExecutionStatus>(['COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT']);

function ExecutionDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: execution, isLoading } = useEnterpriseWorkflowExecution(id ?? undefined);
  const pause = usePauseEnterpriseWorkflowExecution(id ?? '');
  const resume = useResumeEnterpriseWorkflowExecution(id ?? '');
  const cancel = useCancelEnterpriseWorkflowExecution(id ?? '');
  const [cancelOpen, setCancelOpen] = useState(false);

  const isTerminal = execution ? TERMINAL_EXECUTION_STATUSES.has(execution.status) : false;

  const actions: ActionMenuItem[] = [];
  if (execution && !isTerminal) {
    if (execution.status === 'RUNNING' || execution.status === 'WAITING') actions.push({ label: 'Pause', icon: Pause, onSelect: () => pause.mutate() });
    if (execution.status === 'PAUSED') actions.push({ label: 'Resume', icon: Play, onSelect: () => resume.mutate() });
    actions.push({ label: 'Cancel', icon: RotateCcw, onSelect: () => setCancelOpen(true), destructive: true, separatorBefore: true });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Execution</span>
            {execution && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !execution ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Status" value={execution.status} />
              <Field label="Trigger" value={execution.triggerType} />
              <Field label="Definition version" value={String(execution.definitionVersion)} />
              <Field label="Attempt" value={String(execution.attemptNumber)} />
              <Field label="Started" value={formatDate(execution.startTime)} />
              <Field label="Ended" value={execution.endTime ? formatDate(execution.endTime) : '—'} />
              <Field label="Compensation executed" value={execution.compensationExecuted ? 'Yes' : 'No'} />
              <Field label="Current step" value={execution.currentStepId ?? '—'} />
            </div>
            {execution.errorMessage && (
              <div className="rounded-[var(--radius)] border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
                {execution.errorCode ? `${execution.errorCode}: ` : ''}
                {execution.errorMessage}
              </div>
            )}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step timeline</p>
              {!execution.stepExecutions || execution.stepExecutions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No step executions recorded.</p>
              ) : (
                <div className="space-y-2">
                  {[...execution.stepExecutions]
                    .sort((a, b) => a.stepIndex - b.stepIndex)
                    .map((step) => (
                      <StepExecutionRow key={step.id} executionId={execution.id} step={step} />
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
      <ReasonDialog open={cancelOpen} onOpenChange={setCancelOpen} title="Cancel this execution" confirmLabel="Cancel execution" variant="danger" pending={cancel.isPending} onSubmit={(reason) => cancel.mutate(reason, { onSuccess: () => setCancelOpen(false) })} />
    </Dialog>
  );
}

function StepExecutionRow({
  executionId,
  step,
}: {
  executionId: string;
  step: { id: string; stepId: string; stepIndex: number; stepType: string; status: string; startTime: string; endTime?: string | null; attemptNumber: number; dueAt?: string | null; escalatedAt?: string | null; assignedTo?: string | null; errorMessage?: string | null };
}) {
  const resumeStep = useResumeWorkflowStepExecution(executionId);
  const reassignStep = useReassignWorkflowStep(executionId);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [assignee, setAssignee] = useState('');

  const isWaiting = step.status === 'WAITING' || step.status === 'RUNNING';

  return (
    <div className="rounded-[var(--radius)] border border-border p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">
          Step {step.stepIndex + 1} · {step.stepType}
        </span>
        <StatusBadge status={step.status} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatDate(step.startTime)}
        {step.endTime && ` → ${formatDate(step.endTime)}`}
        {step.attemptNumber > 1 && ` · attempt ${step.attemptNumber}`}
        {step.dueAt && ` · due ${formatDate(step.dueAt)}`}
        {step.escalatedAt && ` · escalated ${formatDate(step.escalatedAt)}`}
        {step.assignedTo && ` · assigned to ${step.assignedTo}`}
      </p>
      {step.errorMessage && <p className="mt-1 text-xs text-danger">{step.errorMessage}</p>}
      {isWaiting && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => resumeStep.mutate({ stepExecutionId: step.id, payload: { status: 'COMPLETED' } })} disabled={resumeStep.isPending}>
            Mark completed
          </Button>
          <Button size="sm" variant="outline" onClick={() => resumeStep.mutate({ stepExecutionId: step.id, payload: { status: 'FAILED', errorMessage: 'Manually failed' } })} disabled={resumeStep.isPending}>
            Mark failed
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setReassignOpen(true)}>
            <UserCog className="h-3.5 w-3.5" />
            Reassign
          </Button>
        </div>
      )}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Reassign step</DialogTitle>
          </DialogHeader>
          <FormField label="Assign to" htmlFor="reassign-to" required>
            <Input id="reassign-to" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => reassignStep.mutate({ stepExecutionId: step.id, payload: { assignedTo: assignee } }, { onSuccess: () => { setReassignOpen(false); setAssignee(''); } })}
              disabled={!assignee || reassignStep.isPending}
            >
              Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
