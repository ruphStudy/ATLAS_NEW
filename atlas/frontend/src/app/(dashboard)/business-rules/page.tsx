'use client';

import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import {
  useArchiveRule,
  useCreateRule,
  useDisableRule,
  useEnableRule,
  usePublishRule,
  useRestoreRule,
  useRule,
  useRuleExecutions,
  useRuleHistory,
  useRules,
  useSimulateRule,
  useUpdateRule,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { CreateRulePayload, RuleAction, RuleActionType, RuleCondition, RuleConditionOperator, RuleExecutionStatus, RuleScope, RuleStatus, RuleTriggerType } from '@/types';

const STATUS_OPTIONS: { value: RuleStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const SCOPE_OPTIONS: { value: RuleScope; label: string }[] = [
  { value: 'GLOBAL', label: 'Global' },
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'WORKSPACE', label: 'Workspace' },
];

const TRIGGER_OPTIONS: { value: RuleTriggerType; label: string }[] = [
  { value: 'API', label: 'API' },
  { value: 'EVENT', label: 'Event' },
  { value: 'SCHEDULE', label: 'Schedule' },
  { value: 'WORKFLOW', label: 'Workflow' },
];

const OPERATOR_OPTIONS: { value: RuleConditionOperator; label: string }[] = [
  'EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN', 'LESS_THAN_OR_EQUAL',
  'CONTAINS', 'NOT_CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'IN', 'NOT_IN', 'BETWEEN', 'EXISTS', 'NOT_EXISTS',
].map((v) => ({ value: v as RuleConditionOperator, label: v.replace(/_/g, ' ').toLowerCase() }));

const ACTION_TYPE_OPTIONS: { value: RuleActionType; label: string }[] = [
  { value: 'NOTIFY', label: 'Notify' },
  { value: 'CREATE_TASK', label: 'Create task' },
  { value: 'REQUIRE_APPROVAL', label: 'Require approval' },
  { value: 'UPDATE_STATUS', label: 'Update status' },
  { value: 'BLOCK_ACTION', label: 'Block action' },
  { value: 'ROUTE_WORKFLOW', label: 'Route workflow' },
  { value: 'EMIT_EVENT', label: 'Emit event' },
];

const EXECUTION_STATUS_OPTIONS: { value: RuleExecutionStatus; label: string }[] = [
  { value: 'SUCCESS', label: 'Success' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'SKIPPED', label: 'Skipped' },
  { value: 'BLOCKED', label: 'Blocked' },
];

const EXECUTION_STATUS_TONE: Record<RuleExecutionStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  SUCCESS: 'success',
  FAILED: 'danger',
  SKIPPED: 'neutral',
  BLOCKED: 'warning',
};

export default function BusinessRulesPage() {
  return (
    <div>
      <PageHeader title="Business Rules" description="Condition/action rules that power policy decisions, workflow routing and governance linkage." />
      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="executions">Executions</TabsTrigger>
        </TabsList>
        <TabsContent value="rules">
          <RulesTab />
        </TabsContent>
        <TabsContent value="executions">
          <ExecutionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RulesTab() {
  const [status, setStatus] = useState<RuleStatus | ''>('');
  const [scope, setScope] = useState<RuleScope | ''>('');
  const [module, setModule] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useRules({ status: status || undefined, scope: scope || undefined, module: module || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!status || !!scope || !!module} onClearFilters={() => { setStatus(''); setScope(''); setModule(''); setPage(1); }}>
          <Select value={status} onChange={(e) => { setStatus(e.target.value as RuleStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-36" />
          <Select value={scope} onChange={(e) => { setScope(e.target.value as RuleScope | ''); setPage(1); }} placeholder="All scopes" options={SCOPE_OPTIONS} className="h-9 w-36" />
          <Input value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }} placeholder="Module" className="h-9 w-36" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create rule
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No rules found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((r) => (
                <TableRow key={r.id} clickable onClick={() => setSelectedId(r.id)}>
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.key}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.module}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.scope}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.triggerType}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.priority}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <CreateRuleDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RuleDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreateRuleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateRule();
  const [form, setForm] = useState<CreateRulePayload>({
    module: '',
    key: '',
    name: '',
    triggerType: 'API',
    conditions: { logic: 'AND', conditions: [] },
    actions: [],
  });
  const reset = () => setForm({ module: '', key: '', name: '', triggerType: 'API', conditions: { logic: 'AND', conditions: [] }, actions: [] });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Create business rule</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Module" htmlFor="r-module" required>
              <Input id="r-module" value={form.module} onChange={(e) => setForm((f) => ({ ...f, module: e.target.value }))} />
            </FormField>
            <FormField label="Key" htmlFor="r-key" required>
              <Input id="r-key" value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} />
            </FormField>
            <FormField label="Name" htmlFor="r-name" required>
              <Input id="r-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </FormField>
            <FormField label="Trigger type" htmlFor="r-trigger" required>
              <Select id="r-trigger" value={form.triggerType} onChange={(e) => setForm((f) => ({ ...f, triggerType: e.target.value as RuleTriggerType }))} options={TRIGGER_OPTIONS} />
            </FormField>
            <FormField label="Scope" htmlFor="r-scope">
              <Select id="r-scope" value={form.scope ?? ''} onChange={(e) => setForm((f) => ({ ...f, scope: (e.target.value || undefined) as RuleScope | undefined }))} placeholder="Global" options={SCOPE_OPTIONS} />
            </FormField>
            <FormField label="Priority" htmlFor="r-priority">
              <Input id="r-priority" type="number" value={form.priority ?? ''} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value ? Number(e.target.value) : undefined }))} />
            </FormField>
          </div>
          <FormField label="Description" htmlFor="r-desc">
            <Textarea id="r-desc" rows={2} value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </FormField>
          <ConditionsBuilder
            conditions={form.conditions.conditions ?? []}
            onChange={(conditions) => setForm((f) => ({ ...f, conditions: { ...f.conditions, conditions } }))}
          />
          <ActionsBuilder actions={form.actions} onChange={(actions) => setForm((f) => ({ ...f, actions }))} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.module || !form.key || !form.name || form.actions.length === 0 || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConditionsBuilder({ conditions, onChange }: { conditions: RuleCondition[]; onChange: (conditions: RuleCondition[]) => void }) {
  const add = () => onChange([...conditions, { field: '', operator: 'EQUALS' }]);
  const update = (i: number, patch: Partial<RuleCondition>) => {
    const next = [...conditions];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i: number) => onChange(conditions.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Conditions (AND)</p>
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
          Add condition
        </Button>
      </div>
      <div className="space-y-2">
        {conditions.map((c, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
            <Input value={c.field} onChange={(e) => update(i, { field: e.target.value })} placeholder="field.path" className="h-8" />
            <Select value={c.operator} onChange={(e) => update(i, { operator: e.target.value as RuleConditionOperator })} options={OPERATOR_OPTIONS} className="h-8" />
            <Input
              value={c.value != null ? String(c.value) : ''}
              onChange={(e) => update(i, { value: e.target.value })}
              placeholder="value"
              className="h-8"
            />
            <Button variant="ghost" size="sm" onClick={() => remove(i)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionsBuilder({ actions, onChange }: { actions: RuleAction[]; onChange: (actions: RuleAction[]) => void }) {
  const add = () => onChange([...actions, { type: 'NOTIFY', config: {} }]);
  const update = (i: number, patch: Partial<RuleAction>) => {
    const next = [...actions];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i: number) => onChange(actions.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Actions</p>
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
          Add action
        </Button>
      </div>
      <div className="space-y-2">
        {actions.map((a, i) => (
          <div key={i} className="rounded-[var(--radius)] border border-border p-2">
            <div className="flex items-center gap-2">
              <Select value={a.type as RuleActionType} onChange={(e) => update(i, { type: e.target.value as RuleActionType })} options={ACTION_TYPE_OPTIONS} className="h-8 w-56" />
              <Button variant="ghost" size="sm" onClick={() => remove(i)} className="ml-auto">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Textarea
              value={JSON.stringify(a.config ?? {})}
              onChange={(e) => {
                try {
                  update(i, { config: JSON.parse(e.target.value || '{}') });
                } catch {
                  // ignore invalid JSON while typing
                }
              }}
              rows={2}
              placeholder="Action config (JSON)"
              className="mt-2 font-mono text-xs"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function RuleDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: rule, isLoading } = useRule(id ?? undefined);
  const { data: history } = useRuleHistory(id ?? undefined);
  const update = useUpdateRule(id ?? '');
  const publish = usePublishRule(id ?? '');
  const enable = useEnableRule(id ?? '');
  const disable = useDisableRule(id ?? '');
  const archive = useArchiveRule(id ?? '');
  const restore = useRestoreRule(id ?? '');
  const simulate = useSimulateRule(id ?? '');
  const [simInput, setSimInput] = useState('{}');
  const [priority, setPriority] = useState('');

  const actions: ActionMenuItem[] = [];
  if (rule) {
    if (rule.status === 'DRAFT') actions.push({ label: 'Publish', onSelect: () => publish.mutate() });
    if (rule.status === 'DISABLED') actions.push({ label: 'Enable', onSelect: () => enable.mutate() });
    if (rule.status === 'PUBLISHED') actions.push({ label: 'Disable', onSelect: () => disable.mutate() });
    if (rule.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => archive.mutate(), destructive: true, separatorBefore: true });
    if (rule.status === 'ARCHIVED') actions.push({ label: 'Restore', onSelect: () => restore.mutate() });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{rule?.name ?? 'Rule'}</span>
            {rule && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !rule ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="simulate">Simulate</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <Field label="Key" value={rule.key} />
                <Field label="Module" value={rule.module} />
                <Field label="Scope" value={rule.scope} />
                <Field label="Trigger" value={rule.triggerType} />
                <Field label="Priority" value={String(rule.priority)} />
                <Field label="Execution order" value={String(rule.executionOrder)} />
                <Field label="Stop on match" value={rule.stopOnMatch ? 'Yes' : 'No'} />
                <Field label="Status" value={rule.status} />
                <Field label="Version" value={String(rule.version)} />
              </div>
              {rule.description && <p className="mt-4 text-sm text-muted-foreground">{rule.description}</p>}
              <div className="mt-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conditions</p>
                <pre className="max-h-40 overflow-auto rounded-[var(--radius)] border border-border bg-muted/30 p-2 text-xs text-foreground">{JSON.stringify(rule.conditions, null, 2)}</pre>
              </div>
              <div className="mt-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</p>
                <pre className="max-h-40 overflow-auto rounded-[var(--radius)] border border-border bg-muted/30 p-2 text-xs text-foreground">{JSON.stringify(rule.actions, null, 2)}</pre>
              </div>
              <div className="mt-4 flex items-end gap-2">
                <FormField label="Update priority" htmlFor="rule-priority">
                  <Input id="rule-priority" type="number" value={priority} onChange={(e) => setPriority(e.target.value)} className="h-9 w-32" />
                </FormField>
                <Button
                  size="sm"
                  onClick={() => update.mutate({ priority: Number(priority), changeReason: 'Priority updated from UI' }, { onSuccess: () => setPriority('') })}
                  disabled={!priority || update.isPending}
                >
                  Save
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="simulate">
              <FormField label="Input (JSON)" htmlFor="sim-input">
                <Textarea id="sim-input" rows={5} value={simInput} onChange={(e) => setSimInput(e.target.value)} className="font-mono text-xs" />
              </FormField>
              <Button
                size="sm"
                className="mt-2"
                onClick={() => {
                  try {
                    simulate.mutate({ input: JSON.parse(simInput) });
                  } catch {
                    // invalid JSON — no-op
                  }
                }}
                disabled={simulate.isPending}
              >
                {simulate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Run simulation
              </Button>
              {simulate.data && (
                <div className="mt-3 space-y-2 rounded-[var(--radius)] border border-border p-3 text-sm">
                  <p className="font-medium text-foreground">{simulate.data.matched ? 'Conditions matched' : 'Conditions did not match'}</p>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Would execute actions</p>
                    <pre className="max-h-40 overflow-auto rounded-[var(--radius)] bg-muted/30 p-2 text-xs">{JSON.stringify(simulate.data.wouldExecuteActions, null, 2)}</pre>
                  </div>
                  {simulate.data.validation.length > 0 && (
                    <ul className="space-y-1">
                      {simulate.data.validation.map((v, i) => (
                        <li key={i} className={v.severity === 'ERROR' ? 'text-danger' : 'text-warning'}>
                          {v.code}: {v.message}
                        </li>
                      ))}
                    </ul>
                  )}
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
                      <span className="font-medium text-foreground">
                        v{h.version} · {h.fromStatus ?? '—'} → {h.toStatus}
                      </span>
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
  const [status, setStatus] = useState<RuleExecutionStatus | ''>('');
  const [module, setModule] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useRuleExecutions({ status: status || undefined, module: module || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4">
        <FilterBar hasActiveFilters={!!status || !!module} onClearFilters={() => { setStatus(''); setModule(''); setPage(1); }}>
          <Select value={status} onChange={(e) => { setStatus(e.target.value as RuleExecutionStatus | ''); setPage(1); }} placeholder="All statuses" options={EXECUTION_STATUS_OPTIONS} className="h-9 w-36" />
          <Input value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }} placeholder="Module" className="h-9 w-36" />
        </FilterBar>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No rule executions found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Matched</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Executed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm text-foreground">{e.ruleId}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.module}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.entityType ? `${e.entityType} · ${e.entityId}` : '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.matched ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <StatusBadge status={e.status} tone={EXECUTION_STATUS_TONE[e.status]} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(e.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}
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
