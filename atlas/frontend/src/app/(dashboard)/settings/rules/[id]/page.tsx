'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { Plus, Trash2, Check, Ban, Archive, ArchiveRestore, Play, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { ActionMenu } from '@/components/ui/action-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  useRuleValidation,
  useSimulateRule,
  useUpdateRule,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { Rule, RuleAction, RuleCondition, RuleConditionGroup, RuleConditionOperator, RuleLogicOperator, RuleScope, RuleTriggerType } from '@/types';

const TRIGGER_OPTIONS: { value: RuleTriggerType; label: string }[] = [
  { value: 'API', label: 'API' },
  { value: 'EVENT', label: 'Event' },
  { value: 'SCHEDULE', label: 'Schedule' },
  { value: 'WORKFLOW', label: 'Workflow' },
];

const SCOPE_OPTIONS: { value: RuleScope; label: string }[] = [
  { value: 'GLOBAL', label: 'Global' },
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'WORKSPACE', label: 'Workspace' },
];

const OPERATOR_OPTIONS: { value: RuleConditionOperator; label: string }[] = [
  { value: 'EQUALS', label: 'Equals' },
  { value: 'NOT_EQUALS', label: 'Not equals' },
  { value: 'GREATER_THAN', label: 'Greater than' },
  { value: 'GREATER_THAN_OR_EQUAL', label: 'Greater than or equal' },
  { value: 'LESS_THAN', label: 'Less than' },
  { value: 'LESS_THAN_OR_EQUAL', label: 'Less than or equal' },
  { value: 'CONTAINS', label: 'Contains' },
  { value: 'NOT_CONTAINS', label: 'Not contains' },
  { value: 'STARTS_WITH', label: 'Starts with' },
  { value: 'ENDS_WITH', label: 'Ends with' },
  { value: 'IN', label: 'In' },
  { value: 'NOT_IN', label: 'Not in' },
  { value: 'BETWEEN', label: 'Between' },
  { value: 'EXISTS', label: 'Exists' },
  { value: 'NOT_EXISTS', label: 'Not exists' },
];

const EMPTY_GROUP: RuleConditionGroup = { logic: 'AND', conditions: [], groups: [] };

function emptyCondition(): RuleCondition {
  return { field: '', operator: 'EQUALS', value: '' };
}

export default function RuleDetailPage() {
  const params = useParams<{ id: string }>();
  const isNew = params.id === 'new';
  return isNew ? <NewRulePage /> : <ExistingRulePage id={params.id} />;
}

function NewRulePage() {
  const router = useRouter();
  const createRule = useCreateRule();

  const [module, setModule] = useState('');
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<RuleScope>('WORKSPACE');
  const [triggerType, setTriggerType] = useState<RuleTriggerType>('API');
  const [triggerRef, setTriggerRef] = useState('');
  const [conditions, setConditions] = useState<RuleConditionGroup>(EMPTY_GROUP);
  const [actions, setActions] = useState<RuleAction[]>([]);
  const [priority, setPriority] = useState('0');
  const [executionOrder, setExecutionOrder] = useState('0');
  const [stopOnMatch, setStopOnMatch] = useState(false);

  return (
    <div>
      <PageHeader title="New Rule" breadcrumbs={[{ label: 'Business Rules', href: '/settings/rules' }, { label: 'New' }]} />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <FormField label="Module" htmlFor="rule-module" required>
              <Input id="rule-module" value={module} onChange={(e) => setModule(e.target.value)} />
            </FormField>
            <FormField label="Key" htmlFor="rule-key" required>
              <Input id="rule-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. high-value-order-approval" />
            </FormField>
            <FormField label="Name" htmlFor="rule-name" required>
              <Input id="rule-name" value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Description" htmlFor="rule-description">
              <Input id="rule-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </FormField>
            <FormField label="Scope" htmlFor="rule-scope">
              <Select id="rule-scope" value={scope} onChange={(e) => setScope(e.target.value as RuleScope)} options={SCOPE_OPTIONS} />
            </FormField>
            <FormField label="Trigger type" htmlFor="rule-trigger">
              <Select id="rule-trigger" value={triggerType} onChange={(e) => setTriggerType(e.target.value as RuleTriggerType)} options={TRIGGER_OPTIONS} />
            </FormField>
            {(triggerType === 'EVENT' || triggerType === 'WORKFLOW') && (
              <FormField label={triggerType === 'EVENT' ? 'Event name' : 'Workflow key'} htmlFor="rule-trigger-ref">
                <Input id="rule-trigger-ref" value={triggerRef} onChange={(e) => setTriggerRef(e.target.value)} />
              </FormField>
            )}
            <FormField label="Priority" htmlFor="rule-priority">
              <Input id="rule-priority" type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
            </FormField>
            <FormField label="Execution order" htmlFor="rule-order">
              <Input id="rule-order" type="number" value={executionOrder} onChange={(e) => setExecutionOrder(e.target.value)} />
            </FormField>
            <label className="flex items-center gap-3 text-sm text-foreground">
              <Switch checked={stopOnMatch} onChange={(e) => setStopOnMatch(e.target.checked)} />
              Stop on first match
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <ConditionGroupEditor group={conditions} onChange={setConditions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionsEditor actions={actions} onChange={setActions} />
          </CardContent>
        </Card>

        <Button
          onClick={() =>
            createRule.mutate(
              {
                module,
                key,
                name,
                description: description || undefined,
                scope,
                triggerType,
                triggerRef: triggerRef || undefined,
                conditions,
                actions,
                priority: Number(priority) || 0,
                executionOrder: Number(executionOrder) || 0,
                stopOnMatch,
              },
              { onSuccess: (rule) => router.push(`/settings/rules/${rule.id}`) },
            )
          }
          disabled={!module || !key || !name || actions.length === 0 || createRule.isPending}
        >
          Create rule
        </Button>
      </div>
    </div>
  );
}

function ExistingRulePage({ id }: { id: string }) {
  const { data: rule, isLoading, isError, error, refetch } = useRule(id);
  const updateRule = useUpdateRule(id);
  const publish = usePublishRule(id);
  const enable = useEnableRule(id);
  const disable = useDisableRule(id);
  const archive = useArchiveRule(id);
  const restore = useRestoreRule(id);

  const [description, setDescription] = useState('');
  const [triggerRef, setTriggerRef] = useState('');
  const [conditions, setConditions] = useState<RuleConditionGroup>(EMPTY_GROUP);
  const [actions, setActions] = useState<RuleAction[]>([]);
  const [priority, setPriority] = useState('0');
  const [executionOrder, setExecutionOrder] = useState('0');
  const [stopOnMatch, setStopOnMatch] = useState(false);
  const [changeReason, setChangeReason] = useState('');

  useEffect(() => {
    if (!rule) return;
    setDescription(rule.description ?? '');
    setTriggerRef(rule.triggerRef ?? '');
    setConditions(rule.conditions ?? EMPTY_GROUP);
    setActions(rule.actions ?? []);
    setPriority(String(rule.priority));
    setExecutionOrder(String(rule.executionOrder));
    setStopOnMatch(rule.stopOnMatch);
  }, [rule]);

  const isForbidden = isAxiosError(error) && error.response?.status === 403;
  const isNotFound = isAxiosError(error) && error.response?.status === 404;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description={isNotFound ? 'This rule could not be found.' : "We couldn't load this rule."} />;
  if (isLoading || !rule) return <Skeleton className="h-96 w-full" />;

  const canPublish = rule.status === 'DRAFT';
  const canDisable = rule.status === 'PUBLISHED';
  const canEnable = rule.status === 'DISABLED';
  const canArchive = rule.status !== 'ARCHIVED';
  const canRestore = rule.status === 'ARCHIVED';

  return (
    <div>
      <PageHeader
        title={rule.name}
        breadcrumbs={[{ label: 'Business Rules', href: '/settings/rules' }, { label: rule.name }]}
        actions={
          <>
            <StatusBadge status={rule.status} />
            <ActionMenu
              items={[
                ...(canPublish ? [{ label: 'Publish', icon: Check, onSelect: () => publish.mutate() }] : []),
                ...(canDisable ? [{ label: 'Disable', icon: Ban, onSelect: () => disable.mutate() }] : []),
                ...(canEnable ? [{ label: 'Enable', icon: Check, onSelect: () => enable.mutate() }] : []),
                ...(canArchive ? [{ label: 'Archive', icon: Archive, onSelect: () => archive.mutate(), destructive: true, separatorBefore: true }] : []),
                ...(canRestore ? [{ label: 'Restore', icon: ArchiveRestore, onSelect: () => restore.mutate() }] : []),
              ]}
            />
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="Module" value={rule.module} />
        <Field label="Key" value={rule.key} />
        <Field label="Scope" value={rule.scope} />
        <Field label="Trigger" value={rule.triggerType} />
        <Field label="Version" value={`v${rule.version}`} />
        <Field label="System rule" value={rule.isSystem ? 'Yes' : 'No'} />
        <Field label="Published" value={rule.publishedAt ? formatDate(rule.publishedAt) : '—'} />
        <Field label="Updated" value={formatDate(rule.updatedAt)} />
      </div>

      <Tabs defaultValue="builder">
        <TabsList>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="simulate">Simulate</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="executions">Executions</TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <FormField label="Description" htmlFor="rule-edit-description">
                  <Input id="rule-edit-description" value={description} onChange={(e) => setDescription(e.target.value)} />
                </FormField>
                <FormField label="Trigger reference" htmlFor="rule-edit-trigger-ref">
                  <Input id="rule-edit-trigger-ref" value={triggerRef} onChange={(e) => setTriggerRef(e.target.value)} />
                </FormField>
                <FormField label="Priority" htmlFor="rule-edit-priority">
                  <Input id="rule-edit-priority" type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
                </FormField>
                <FormField label="Execution order" htmlFor="rule-edit-order">
                  <Input id="rule-edit-order" type="number" value={executionOrder} onChange={(e) => setExecutionOrder(e.target.value)} />
                </FormField>
                <label className="flex items-center gap-3 text-sm text-foreground">
                  <Switch checked={stopOnMatch} onChange={(e) => setStopOnMatch(e.target.checked)} />
                  Stop on first match
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <ConditionGroupEditor group={conditions} onChange={setConditions} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <ActionsEditor actions={actions} onChange={setActions} />
              </CardContent>
            </Card>

            <FormField label="Change reason" htmlFor="rule-change-reason" required>
              <Input id="rule-change-reason" value={changeReason} onChange={(e) => setChangeReason(e.target.value)} />
            </FormField>

            <Button
              onClick={() =>
                updateRule.mutate(
                  { description: description || undefined, triggerRef: triggerRef || undefined, conditions, actions, priority: Number(priority) || 0, executionOrder: Number(executionOrder) || 0, stopOnMatch, changeReason },
                  { onSuccess: () => setChangeReason('') },
                )
              }
              disabled={!changeReason || actions.length === 0 || updateRule.isPending}
            >
              Save changes
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="simulate">
          <SimulateTab ruleId={id} />
        </TabsContent>
        <TabsContent value="validation">
          <ValidationTab ruleId={id} />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab ruleId={id} />
        </TabsContent>
        <TabsContent value="executions">
          <ExecutionsTab rule={rule} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConditionGroupEditor({ group, onChange }: { group: RuleConditionGroup; onChange: (g: RuleConditionGroup) => void }) {
  const conditions = group.conditions ?? [];
  const groups = group.groups ?? [];

  function updateCondition(index: number, patch: Partial<RuleCondition>) {
    const next = conditions.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onChange({ ...group, conditions: next });
  }

  function removeCondition(index: number) {
    onChange({ ...group, conditions: conditions.filter((_, i) => i !== index) });
  }

  function updateNestedGroup(index: number, nested: RuleConditionGroup) {
    onChange({ ...group, groups: groups.map((g, i) => (i === index ? nested : g)) });
  }

  function removeGroup(index: number) {
    onChange({ ...group, groups: groups.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-3 rounded-[var(--radius)] border border-border p-3">
      <div className="flex items-center justify-between">
        <Select
          value={group.logic}
          onChange={(e) => onChange({ ...group, logic: e.target.value as RuleLogicOperator })}
          options={[
            { value: 'AND', label: 'Match ALL (AND)' },
            { value: 'OR', label: 'Match ANY (OR)' },
          ]}
          className="h-8 w-48 text-xs"
        />
      </div>

      {conditions.map((c, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <Input value={c.field} onChange={(e) => updateCondition(i, { field: e.target.value })} placeholder="field, e.g. order.total" className="h-8 w-48" />
          <Select value={c.operator} onChange={(e) => updateCondition(i, { operator: e.target.value as RuleConditionOperator })} options={OPERATOR_OPTIONS} className="h-8 w-52" />
          {c.operator !== 'EXISTS' && c.operator !== 'NOT_EXISTS' && (
            <Input
              value={typeof c.value === 'string' || typeof c.value === 'number' ? String(c.value) : JSON.stringify(c.value ?? '')}
              onChange={(e) => updateCondition(i, { value: e.target.value })}
              placeholder="value"
              className="h-8 w-40"
            />
          )}
          <button onClick={() => removeCondition(i)} className="text-muted-foreground hover:text-danger">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {groups.map((g, i) => (
        <div key={i} className="ml-4 border-l border-border pl-3">
          <div className="mb-1 flex justify-end">
            <button onClick={() => removeGroup(i)} className="text-xs text-muted-foreground hover:text-danger">
              Remove group
            </button>
          </div>
          <ConditionGroupEditor group={g} onChange={(nested) => updateNestedGroup(i, nested)} />
        </div>
      ))}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onChange({ ...group, conditions: [...conditions, emptyCondition()] })}>
          <Plus className="h-3.5 w-3.5" />
          Condition
        </Button>
        <Button variant="outline" size="sm" onClick={() => onChange({ ...group, groups: [...groups, { logic: 'AND', conditions: [], groups: [] }] })}>
          <Plus className="h-3.5 w-3.5" />
          Nested group
        </Button>
      </div>
    </div>
  );
}

function ActionsEditor({ actions, onChange }: { actions: RuleAction[]; onChange: (a: RuleAction[]) => void }) {
  function update(index: number, patch: Partial<RuleAction>) {
    onChange(actions.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  function remove(index: number) {
    onChange(actions.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {actions.map((a, i) => (
        <ActionRow key={i} action={a} onChange={(patch) => update(i, patch)} onRemove={() => remove(i)} />
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...actions, { type: 'NOTIFY', config: {} }])}>
        <Plus className="h-3.5 w-3.5" />
        Action
      </Button>
    </div>
  );
}

function ActionRow({ action, onChange, onRemove }: { action: RuleAction; onChange: (patch: Partial<RuleAction>) => void; onRemove: () => void }) {
  const [configText, setConfigText] = useState(() => JSON.stringify(action.config ?? {}, null, 2));

  return (
    <div className="space-y-2 rounded-[var(--radius)] border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <Select
          value={action.type}
          onChange={(e) => onChange({ type: e.target.value })}
          options={[
            { value: 'NOTIFY', label: 'Notify' },
            { value: 'CREATE_TASK', label: 'Create task' },
            { value: 'REQUIRE_APPROVAL', label: 'Require approval' },
            { value: 'UPDATE_STATUS', label: 'Update status' },
            { value: 'BLOCK_ACTION', label: 'Block action' },
            { value: 'ROUTE_WORKFLOW', label: 'Route workflow' },
            { value: 'EMIT_EVENT', label: 'Emit event' },
          ]}
          className="h-8 w-56"
        />
        <button onClick={onRemove} className="text-muted-foreground hover:text-danger">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <Textarea
        value={configText}
        onChange={(e) => {
          setConfigText(e.target.value);
          try {
            onChange({ config: JSON.parse(e.target.value) });
          } catch {
            // keep typing — parent's config stays at the last valid JSON until this parses again
          }
        }}
        rows={3}
        className="font-mono text-xs"
      />
    </div>
  );
}

function SimulateTab({ ruleId }: { ruleId: string }) {
  const simulate = useSimulateRule(ruleId);
  const [input, setInput] = useState('{\n  \n}');

  return (
    <div className="space-y-4">
      <FormField label="Sample input (JSON)" htmlFor="simulate-input">
        <Textarea id="simulate-input" value={input} onChange={(e) => setInput(e.target.value)} rows={8} className="font-mono text-xs" />
      </FormField>
      <Button
        onClick={() => {
          try {
            simulate.mutate({ input: JSON.parse(input) });
          } catch {
            // invalid JSON — simulate button stays inert
          }
        }}
        disabled={simulate.isPending}
      >
        <Play className="h-3.5 w-3.5" />
        Run simulation
      </Button>

      {simulate.data && (
        <Card>
          <CardContent className="space-y-3 pt-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-foreground">Matched:</span>
              <Badge variant={simulate.data.matched ? 'success' : 'secondary'}>{simulate.data.matched ? 'Yes' : 'No'}</Badge>
            </div>
            {simulate.data.validation.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Validation</p>
                {simulate.data.validation.map((v, i) => (
                  <p key={i} className={v.severity === 'ERROR' ? 'text-danger' : 'text-warning'}>
                    {v.severity}: {v.message}
                  </p>
                ))}
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Would execute</p>
              <pre className="overflow-auto rounded-[var(--radius)] border border-border bg-secondary p-3 text-xs">{JSON.stringify(simulate.data.wouldExecuteActions, null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ValidationTab({ ruleId }: { ruleId: string }) {
  const validation = useRuleValidation(ruleId);
  if (validation.isLoading) return <Skeleton className="h-40 w-full" />;
  if (!validation.data || validation.data.length === 0) return <EmptyState title="No validation issues" icon={ShieldAlert} />;

  return (
    <div className="space-y-2">
      {validation.data.map((v, i) => (
        <div key={i} className={`rounded-[var(--radius)] border p-3 text-sm ${v.severity === 'ERROR' ? 'border-danger/40' : 'border-warning/40'}`}>
          <Badge variant={v.severity === 'ERROR' ? 'danger' : 'warning'} className="text-[10px]">
            {v.severity}
          </Badge>
          <p className="mt-1 text-foreground">{v.message}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{v.code}</p>
        </div>
      ))}
    </div>
  );
}

function HistoryTab({ ruleId }: { ruleId: string }) {
  const history = useRuleHistory(ruleId);
  if (history.isLoading) return <Skeleton className="h-40 w-full" />;
  if (!history.data || history.data.length === 0) return <EmptyState title="No history yet" />;

  return (
    <div className="space-y-2">
      {history.data.map((h) => (
        <div key={h.id} className="rounded-[var(--radius)] border border-border p-3 text-sm">
          <p className="text-foreground">
            v{h.version} · {(h.fromStatus ?? 'created').toLowerCase()} → {h.toStatus.toLowerCase()}
          </p>
          {h.changeReason && <p className="mt-1 text-muted-foreground">{h.changeReason}</p>}
          <p className="mt-1 text-xs text-muted-foreground">{formatDate(h.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}

function ExecutionsTab({ rule }: { rule: Rule }) {
  const executions = useRuleExecutions({ ruleId: rule.id, limit: 50 });
  const rows = executions.data?.data ?? [];

  if (executions.isLoading) return <Skeleton className="h-64 w-full" />;
  if (executions.isError) return <QueryErrorState refetch={executions.refetch} />;
  if (rows.length === 0) return <EmptyState title="No executions yet" description="This rule hasn't run yet." />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>Matched</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Error</TableHead>
          <TableHead>When</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((ex) => (
          <TableRow key={ex.id}>
            <TableCell>
              <StatusBadge status={ex.status} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{ex.matched ? 'Yes' : 'No'}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{ex.entityType ? `${ex.entityType} · ${ex.entityId}` : '—'}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{ex.durationMs != null ? `${ex.durationMs}ms` : '—'}</TableCell>
            <TableCell className="text-sm text-danger">{ex.errorMessage ?? '—'}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{formatDate(ex.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
