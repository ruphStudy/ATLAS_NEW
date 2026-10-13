'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Plus, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { KpiCard } from '@/components/ui/kpi-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useCreateGuardrailOverride,
  useCreateGuardrailRule,
  useCreateValidatorConfig,
  useDecideGuardrailApproval,
  useDeleteGuardrailOverride,
  useDeleteGuardrailRule,
  useDeleteValidatorConfig,
  useGuardrailApprovals,
  useGuardrailIncident,
  useGuardrailIncidents,
  useGuardrailOverrides,
  useGuardrailRule,
  useGuardrailRules,
  useGuardrailStats,
  useUpdateGuardrailIncident,
  useUpdateGuardrailRule,
  useUpdateValidatorConfig,
  useValidationHistory,
  useValidationResults,
  useValidationStats,
  useValidations,
  useValidatorConfig,
} from '@/hooks';
import { useAuthStore } from '@/stores';
import { formatDate } from '@/lib/utils';
import type {
  CreateGuardrailOverridePayload,
  CreateGuardrailRulePayload,
  CreateValidatorConfigPayload,
  GuardrailApprovalStatus,
  GuardrailCheckType,
  GuardrailDecision,
  GuardrailIncidentStatus,
  GuardrailOverrideScope,
  GuardrailSeverity,
  GuardrailStage,
  GuardrailViolationCategory,
} from '@/types';

const STAGE_OPTIONS: { value: GuardrailStage; label: string }[] = [
  { value: 'INPUT', label: 'Input' },
  { value: 'OUTPUT', label: 'Output' },
  { value: 'TOOL_USE', label: 'Tool use' },
  { value: 'ACTION', label: 'Action' },
];

const CATEGORY_OPTIONS: { value: GuardrailViolationCategory; label: string }[] = [
  'PROMPT_INJECTION', 'CREDENTIAL_EXPOSURE', 'PII_EXPOSURE', 'FINANCIAL_DATA_EXPOSURE', 'CUSTOMER_DATA_EXPOSURE',
  'WORKSPACE_DATA_EXPOSURE', 'DATA_LEAKAGE', 'UNSAFE_CONTENT', 'POLICY_VIOLATION', 'UNSUPPORTED_CLAIM',
  'RISKY_AUTOMATION', 'ALLOWLIST_VIOLATION', 'BLOCKLIST_VIOLATION', 'ROLE_PERMISSION_VIOLATION',
  'TOOL_PERMISSION_VIOLATION', 'ACTION_LIMIT_EXCEEDED', 'OTHER',
].map((v) => ({ value: v as GuardrailViolationCategory, label: v.replace(/_/g, ' ') }));

const CHECK_TYPE_OPTIONS: { value: GuardrailCheckType; label: string }[] = [
  { value: 'PATTERN_MATCH', label: 'Pattern match' },
  { value: 'ALLOWLIST', label: 'Allowlist' },
  { value: 'BLOCKLIST', label: 'Blocklist' },
  { value: 'ROLE_PERMISSION', label: 'Role permission' },
  { value: 'TOOL_PERMISSION', label: 'Tool permission' },
  { value: 'ACTION_LIMIT', label: 'Action limit' },
];

const SEVERITY_OPTIONS: { value: GuardrailSeverity; label: string }[] = [
  { value: 'INFO', label: 'Info' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const DECISION_OPTIONS: { value: GuardrailDecision; label: string }[] = [
  { value: 'ALLOW', label: 'Allow' },
  { value: 'WARN', label: 'Warn' },
  { value: 'REDACT', label: 'Redact' },
  { value: 'BLOCK', label: 'Block' },
  { value: 'REQUIRE_REVIEW', label: 'Require review' },
  { value: 'RETRY', label: 'Retry' },
  { value: 'FALLBACK', label: 'Fallback' },
];

const OVERRIDE_SCOPE_OPTIONS: { value: GuardrailOverrideScope; label: string }[] = [
  { value: 'GLOBAL', label: 'Global' },
  { value: 'WORKSPACE', label: 'Workspace' },
  { value: 'PROVIDER', label: 'Provider' },
  { value: 'MODEL', label: 'Model' },
];

const VALIDATION_TYPE_OPTIONS = ['SCHEMA', 'TYPE', 'FORMAT', 'COMPLETENESS', 'CONSISTENCY', 'BUSINESS_RULE', 'SAFETY', 'CONFIDENCE'];

function decisionTone(decision: string): 'danger' | 'success' | 'warning' {
  if (decision === 'BLOCK') return 'danger';
  if (decision === 'ALLOW') return 'success';
  return 'warning';
}

export default function AiGuardrailsPage() {
  return (
    <div>
      <PageHeader title="AI Validation & Guardrails" description="Response validation policies, guardrail rules, overrides, incidents and approvals." />
      <Tabs defaultValue="validation">
        <TabsList>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="overrides">Overrides</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
        </TabsList>
        <TabsContent value="validation">
          <ValidationTab />
        </TabsContent>
        <TabsContent value="rules">
          <RulesTab />
        </TabsContent>
        <TabsContent value="overrides">
          <OverridesTab />
        </TabsContent>
        <TabsContent value="incidents">
          <IncidentsTab />
        </TabsContent>
        <TabsContent value="approvals">
          <ApprovalsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ValidationTab() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useValidations({ workspaceId: workspaceId ?? '', limit: 30 });
  const stats = useValidationStats(workspaceId);

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total validations" value={stats.data?.totalValidations ?? 0} loading={stats.isLoading} />
        <KpiCard label="Valid responses" value={stats.data?.validResponses ?? 0} loading={stats.isLoading} />
        <KpiCard label="Avg confidence" value={stats.data ? `${(stats.data.avgConfidenceScore * 100).toFixed(0)}%` : '—'} loading={stats.isLoading} />
        <KpiCard label="Avg quality" value={stats.data ? `${(stats.data.avgQualityScore * 100).toFixed(0)}%` : '—'} loading={stats.isLoading} />
      </div>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load validations." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No validations yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Response type</TableHead>
              <TableHead>Capability</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Confidence / Quality</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((v) => (
              <TableRow key={v.id} clickable onClick={() => setSelectedId(v.id)}>
                <TableCell className="text-sm font-medium text-foreground">{v.responseType}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{v.capability ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{v.modelProvider ?? '—'} / {v.modelName ?? '—'}</TableCell>
                <TableCell>
                  <StatusBadge status={v.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {v.confidenceScore != null ? `${(v.confidenceScore * 100).toFixed(0)}%` : '—'} / {v.qualityScore != null ? `${(v.qualityScore * 100).toFixed(0)}%` : '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(v.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ValidationDetailDialog id={selectedId} workspaceId={workspaceId} onClose={() => setSelectedId(null)} />

      <ValidatorConfigsPanel workspaceId={workspaceId} />
    </div>
  );
}

function ValidationDetailDialog({ id, workspaceId, onClose }: { id: string | null; workspaceId: string | undefined; onClose: () => void }) {
  const { data: results } = useValidationResults(id ?? undefined, workspaceId);
  const { data: history } = useValidationHistory(id ?? undefined, workspaceId);

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Validation detail</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 text-sm">
          {results && results.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Results</p>
              <ul className="space-y-2">
                {results.map((r) => (
                  <li key={r.id} className="rounded-[var(--radius)] border border-border p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{r.validatorName}</span>
                      <StatusBadge status={r.passed ? 'PASSED' : 'FAILED'} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{r.validationType} · {r.severity} — {r.message}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {history && history.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</p>
              <ul className="space-y-1.5">
                {history.map((h: unknown, i: number) => (
                  <li key={i} className="text-xs text-muted-foreground">{JSON.stringify(h)}</li>
                ))}
              </ul>
            </div>
          )}
          {(!results || results.length === 0) && (!history || history.length === 0) && (
            <EmptyState title="No detail available" className="border-none py-8" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ValidatorConfigsPanel({ workspaceId }: { workspaceId: string | undefined }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const { data: config, isLoading, isError } = useValidatorConfig(activeId);
  const update = useUpdateValidatorConfig(activeId ?? '');
  const remove = useDeleteValidatorConfig();

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-sm">Validator configs (response validation policies)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <FormField label="Validator config ID" htmlFor="vc-lookup" hint="Validator configs have no list endpoint — look up an existing config by its ID, or create a new one." className="flex-1">
            <Input id="vc-lookup" value={lookupId} onChange={(e) => setLookupId(e.target.value)} placeholder="Paste a validator config ID" />
          </FormField>
          <Button variant="outline" onClick={() => setActiveId(lookupId || undefined)} disabled={!lookupId}>
            <Search className="h-4 w-4" />
            Look up
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New config
          </Button>
        </div>

        {!activeId ? (
          <EmptyState title="No config loaded" description="Look up a validator config by ID, or create a new one." className="border-none py-6" />
        ) : isError ? (
          <EmptyState title="Config not found" className="border-none py-6" />
        ) : isLoading || !config ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="rounded-[var(--radius)] border border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{config.name}</span>
              <div className="flex items-center gap-2">
                <StatusBadge status={config.enabled ? 'ENABLED' : 'DISABLED'} />
                <Button variant="ghost" size="sm" onClick={() => remove.mutate(config.id, { onSuccess: () => setActiveId(undefined) })} disabled={remove.isPending}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Validation type" value={config.validationType} />
              <Field label="Capability" value={config.capability ?? 'Any'} />
              <Field label="Agent type" value={config.agentType ?? 'Any'} />
              <Field label="Provider" value={config.modelProvider ?? 'Any'} />
              <Field label="Priority" value={String(config.priority)} />
              <Field label="Stop on failure" value={config.stopOnFailure ? 'Yes' : 'No'} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <Switch checked={config.enabled} onChange={(e) => update.mutate({ enabled: e.target.checked })} />
                <span className="text-sm text-foreground">Enabled</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={config.attemptRepair} onChange={(e) => update.mutate({ attemptRepair: e.target.checked })} />
                <span className="text-sm text-foreground">Attempt repair</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CreateValidatorConfigDialog open={createOpen} onOpenChange={setCreateOpen} workspaceId={workspaceId} onCreated={(id) => { setLookupId(id); setActiveId(id); }} />
    </Card>
  );
}

function CreateValidatorConfigDialog({ open, onOpenChange, workspaceId, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; workspaceId: string | undefined; onCreated: (id: string) => void }) {
  const create = useCreateValidatorConfig();
  const [form, setForm] = useState<CreateValidatorConfigPayload>({ name: '', validationType: 'SCHEMA', config: {}, enabled: true, priority: 0, stopOnFailure: false, attemptRepair: false });

  const reset = () => setForm({ name: '', validationType: 'SCHEMA', config: {}, enabled: true, priority: 0, stopOnFailure: false, attemptRepair: false });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New validator config</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="vc-name" required className="sm:col-span-2">
            <Input id="vc-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Validation type" htmlFor="vc-type" required>
            <Select id="vc-type" value={form.validationType} onChange={(e) => setForm((f) => ({ ...f, validationType: e.target.value }))} options={VALIDATION_TYPE_OPTIONS.map((v) => ({ value: v, label: v }))} />
          </FormField>
          <FormField label="Capability" htmlFor="vc-capability">
            <Input id="vc-capability" value={form.capability ?? ''} onChange={(e) => setForm((f) => ({ ...f, capability: e.target.value || undefined }))} />
          </FormField>
          <FormField label="Agent type" htmlFor="vc-agent">
            <Input id="vc-agent" value={form.agentType ?? ''} onChange={(e) => setForm((f) => ({ ...f, agentType: e.target.value || undefined }))} />
          </FormField>
          <FormField label="Provider" htmlFor="vc-provider">
            <Input id="vc-provider" value={form.modelProvider ?? ''} onChange={(e) => setForm((f) => ({ ...f, modelProvider: e.target.value || undefined }))} />
          </FormField>
          <FormField label="Priority" htmlFor="vc-priority">
            <Input id="vc-priority" type="number" value={form.priority ?? 0} onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))} />
          </FormField>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={!!form.stopOnFailure} onChange={(e) => setForm((f) => ({ ...f, stopOnFailure: e.target.checked }))} />
              <span className="text-sm text-foreground">Stop on failure</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!form.attemptRepair} onChange={(e) => setForm((f) => ({ ...f, attemptRepair: e.target.checked }))} />
              <span className="text-sm text-foreground">Attempt repair</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate({ ...form, workspaceId }, { onSuccess: (c) => { onOpenChange(false); reset(); onCreated(c.id); } })}
            disabled={!form.name || !form.validationType || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RulesTab() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const [stage, setStage] = useState<GuardrailStage | ''>('');
  const { data, isLoading, isError, refetch } = useGuardrailRules({ workspaceId: workspaceId ?? '', stage: stage || undefined, limit: 50 });
  const stats = useGuardrailStats(workspaceId);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total evaluations" value={stats.data?.totalEvaluations ?? 0} icon={ShieldAlert} loading={stats.isLoading} />
        <KpiCard label="Blocked" value={stats.data?.blocked ?? 0} icon={AlertTriangle} loading={stats.isLoading} />
        <KpiCard label="Require review" value={stats.data?.requireReview ?? 0} loading={stats.isLoading} />
        <KpiCard label="Avg risk score" value={stats.data?.avgRiskScore.toFixed(1) ?? '—'} loading={stats.isLoading} />
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!stage} onClearFilters={() => setStage('')}>
          <Select value={stage} onChange={(e) => setStage(e.target.value as GuardrailStage | '')} placeholder="All stages" options={STAGE_OPTIONS} className="h-9 w-40" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New rule
        </Button>
      </div>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load guardrail rules." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No guardrail rules yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Decision</TableHead>
              <TableHead>Enabled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((r) => (
              <TableRow key={r.id} clickable onClick={() => setSelectedId(r.id)}>
                <TableCell className="text-sm font-medium text-foreground">{r.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.stage}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.category}</TableCell>
                <TableCell>
                  <StatusBadge status={r.severity} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.decision} tone={decisionTone(r.decision)} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.enabled ? 'Yes' : 'No'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CreateRuleDialog open={createOpen} onOpenChange={setCreateOpen} workspaceId={workspaceId} />
      <RuleDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreateRuleDialog({ open, onOpenChange, workspaceId }: { open: boolean; onOpenChange: (open: boolean) => void; workspaceId: string | undefined }) {
  const create = useCreateGuardrailRule();
  const [form, setForm] = useState<CreateGuardrailRulePayload>({
    name: '', stage: 'INPUT', category: 'OTHER', checkType: 'PATTERN_MATCH', config: {}, enabled: true, severity: 'MEDIUM', decision: 'WARN', riskWeight: 1, requiresApproval: false, priority: 0, stopOnMatch: false,
  });

  const reset = () => setForm({ name: '', stage: 'INPUT', category: 'OTHER', checkType: 'PATTERN_MATCH', config: {}, enabled: true, severity: 'MEDIUM', decision: 'WARN', riskWeight: 1, requiresApproval: false, priority: 0, stopOnMatch: false });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>New guardrail rule</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="gr-name" required className="sm:col-span-2">
            <Input id="gr-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Stage" htmlFor="gr-stage" required>
            <Select id="gr-stage" value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as GuardrailStage }))} options={STAGE_OPTIONS} />
          </FormField>
          <FormField label="Category" htmlFor="gr-category" required>
            <Select id="gr-category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as GuardrailViolationCategory }))} options={CATEGORY_OPTIONS} />
          </FormField>
          <FormField label="Check type" htmlFor="gr-check" required>
            <Select id="gr-check" value={form.checkType} onChange={(e) => setForm((f) => ({ ...f, checkType: e.target.value as GuardrailCheckType }))} options={CHECK_TYPE_OPTIONS} />
          </FormField>
          <FormField label="Capability" htmlFor="gr-capability">
            <Input id="gr-capability" value={form.capability ?? ''} onChange={(e) => setForm((f) => ({ ...f, capability: e.target.value || undefined }))} />
          </FormField>
          <FormField label="Severity" htmlFor="gr-severity" required>
            <Select id="gr-severity" value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as GuardrailSeverity }))} options={SEVERITY_OPTIONS} />
          </FormField>
          <FormField label="Decision" htmlFor="gr-decision" required>
            <Select id="gr-decision" value={form.decision} onChange={(e) => setForm((f) => ({ ...f, decision: e.target.value as GuardrailDecision }))} options={DECISION_OPTIONS} />
          </FormField>
          <FormField label="Risk weight" htmlFor="gr-risk">
            <Input id="gr-risk" type="number" step="0.1" value={form.riskWeight ?? 1} onChange={(e) => setForm((f) => ({ ...f, riskWeight: Number(e.target.value) }))} />
          </FormField>
          <FormField label="Priority" htmlFor="gr-priority">
            <Input id="gr-priority" type="number" value={form.priority ?? 0} onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))} />
          </FormField>
          <div className="flex items-center gap-4 sm:col-span-2">
            <div className="flex items-center gap-2">
              <Switch checked={!!form.requiresApproval} onChange={(e) => setForm((f) => ({ ...f, requiresApproval: e.target.checked }))} />
              <span className="text-sm text-foreground">Requires human approval</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!form.stopOnMatch} onChange={(e) => setForm((f) => ({ ...f, stopOnMatch: e.target.checked }))} />
              <span className="text-sm text-foreground">Stop evaluation on match</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate({ ...form, workspaceId }, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.name || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RuleDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: rule, isLoading } = useGuardrailRule(id ?? undefined);
  const update = useUpdateGuardrailRule(id ?? '');
  const remove = useDeleteGuardrailRule();

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Guardrail rule</span>
            {rule && (
              <Button variant="ghost" size="sm" onClick={() => remove.mutate(rule.id, { onSuccess: onClose })} disabled={remove.isPending}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !rule ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Name" value={rule.name} />
              <Field label="Stage" value={rule.stage} />
              <Field label="Category" value={rule.category} />
              <Field label="Check type" value={rule.checkType} />
              <Field label="Priority" value={String(rule.priority)} />
              <Field label="Version" value={String(rule.version)} />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <FormField label="Severity" htmlFor="rd-severity">
                <Select id="rd-severity" value={rule.severity} onChange={(e) => update.mutate({ severity: e.target.value as GuardrailSeverity })} options={SEVERITY_OPTIONS} />
              </FormField>
              <FormField label="Decision" htmlFor="rd-decision">
                <Select id="rd-decision" value={rule.decision} onChange={(e) => update.mutate({ decision: e.target.value as GuardrailDecision })} options={DECISION_OPTIONS} />
              </FormField>
            </div>
            <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <Switch checked={rule.enabled} onChange={(e) => update.mutate({ enabled: e.target.checked })} />
                <span className="text-sm text-foreground">Enabled</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={rule.requiresApproval} onChange={(e) => update.mutate({ requiresApproval: e.target.checked })} />
                <span className="text-sm text-foreground">Requires approval</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={rule.stopOnMatch} onChange={(e) => update.mutate({ stopOnMatch: e.target.checked })} />
                <span className="text-sm text-foreground">Stop on match</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function OverridesTab() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const { data, isLoading, isError, refetch } = useGuardrailOverrides({ workspaceId: workspaceId ?? '', limit: 50 });
  const remove = useDeleteGuardrailOverride();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New override
        </Button>
      </div>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load guardrail overrides." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No overrides yet" description="Overrides let you adjust enabled state, decision or severity per scope without editing the base rule." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scope</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Enabled override</TableHead>
              <TableHead>Decision override</TableHead>
              <TableHead>Severity override</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <StatusBadge status={o.scope} tone="info" />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{o.ruleId ?? o.modelId ?? o.providerKey ?? o.workspaceId ?? 'Global'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{o.enabledOverride == null ? '—' : o.enabledOverride ? 'Yes' : 'No'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{o.decisionOverride ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{o.severityOverride ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{o.priority}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => remove.mutate(o.id)} disabled={remove.isPending}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CreateOverrideDialog open={createOpen} onOpenChange={setCreateOpen} workspaceId={workspaceId} />
    </div>
  );
}

function CreateOverrideDialog({ open, onOpenChange, workspaceId }: { open: boolean; onOpenChange: (open: boolean) => void; workspaceId: string | undefined }) {
  const create = useCreateGuardrailOverride();
  const [form, setForm] = useState<CreateGuardrailOverridePayload>({ scope: 'WORKSPACE', priority: 0 });

  const reset = () => setForm({ scope: 'WORKSPACE', priority: 0 });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New guardrail override</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Scope" htmlFor="go-scope" required>
            <Select id="go-scope" value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as GuardrailOverrideScope }))} options={OVERRIDE_SCOPE_OPTIONS} />
          </FormField>
          <FormField label="Rule ID (optional)" htmlFor="go-rule">
            <Input id="go-rule" value={form.ruleId ?? ''} onChange={(e) => setForm((f) => ({ ...f, ruleId: e.target.value || undefined }))} />
          </FormField>
          <FormField label="Provider" htmlFor="go-provider">
            <Input id="go-provider" value={form.providerKey ?? ''} onChange={(e) => setForm((f) => ({ ...f, providerKey: e.target.value || undefined }))} />
          </FormField>
          <FormField label="Model" htmlFor="go-model">
            <Input id="go-model" value={form.modelId ?? ''} onChange={(e) => setForm((f) => ({ ...f, modelId: e.target.value || undefined }))} />
          </FormField>
          <FormField label="Decision override" htmlFor="go-decision">
            <Select id="go-decision" value={form.decisionOverride ?? ''} onChange={(e) => setForm((f) => ({ ...f, decisionOverride: (e.target.value || undefined) as GuardrailDecision | undefined }))} placeholder="No override" options={DECISION_OPTIONS} />
          </FormField>
          <FormField label="Severity override" htmlFor="go-severity">
            <Select id="go-severity" value={form.severityOverride ?? ''} onChange={(e) => setForm((f) => ({ ...f, severityOverride: (e.target.value || undefined) as GuardrailSeverity | undefined }))} placeholder="No override" options={SEVERITY_OPTIONS} />
          </FormField>
          <FormField label="Priority" htmlFor="go-priority">
            <Input id="go-priority" type="number" value={form.priority ?? 0} onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))} />
          </FormField>
          <div className="flex items-center gap-2">
            <Switch checked={!!form.enabledOverride} onChange={(e) => setForm((f) => ({ ...f, enabledOverride: e.target.checked }))} />
            <span className="text-sm text-foreground">Force enabled</span>
          </div>
          <FormField label="Reason" htmlFor="go-reason" className="sm:col-span-2">
            <Input id="go-reason" value={form.reason ?? ''} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value || undefined }))} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate({ ...form, workspaceId }, { onSuccess: () => { onOpenChange(false); reset(); } })} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IncidentsTab() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const [status, setStatus] = useState<GuardrailIncidentStatus | ''>('');
  const { data, isLoading, isError, refetch } = useGuardrailIncidents({ workspaceId: workspaceId ?? '', status: status || undefined, limit: 30 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div>
      <FilterBar hasActiveFilters={!!status} onClearFilters={() => setStatus('')} className="mb-4">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as GuardrailIncidentStatus | '')}
          placeholder="All statuses"
          options={[
            { value: 'OPEN', label: 'Open' },
            { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
            { value: 'RESOLVED', label: 'Resolved' },
            { value: 'DISMISSED', label: 'Dismissed' },
          ]}
          className="h-9 w-40"
        />
      </FilterBar>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load safety incidents." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No safety incidents" icon={ShieldAlert} />
      ) : (
        <div className="space-y-2">
          {data.data.map((i) => (
            <Card key={i.id} hover onClick={() => setSelectedId(i.id)} className="cursor-pointer">
              <CardContent className="flex items-start justify-between gap-3 pt-4 text-sm">
                <div>
                  <p className="text-foreground">{i.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {i.category} · {formatDate(i.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={i.severity} />
                  <StatusBadge status={i.status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <IncidentDetailDialog id={selectedId} workspaceId={workspaceId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function IncidentDetailDialog({ id, workspaceId, onClose }: { id: string | null; workspaceId: string | undefined; onClose: () => void }) {
  const currentUser = useAuthStore((s) => s.user);
  const { data: incident, isLoading } = useGuardrailIncident(id ?? undefined, workspaceId);
  const update = useUpdateGuardrailIncident(id ?? '', workspaceId ?? '');
  const [resolution, setResolution] = useState('');

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Safety incident</DialogTitle>
        </DialogHeader>
        {isLoading || !incident ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="space-y-4 text-sm">
            <p className="text-foreground">{incident.description}</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Category" value={incident.category} />
              <Field label="Severity" value={incident.severity} />
              <Field label="Decision" value={incident.decision} />
              <Field label="Reported by" value={incident.reportedBy ?? '—'} />
              <Field label="Assigned to" value={incident.assignedTo ?? 'Unassigned'} />
              <Field label="Status" value={incident.status} />
            </div>
            {incident.resolution && <div className="rounded-[var(--radius)] border border-success/30 bg-success/5 p-3 text-success">Resolution: {incident.resolution}</div>}
            {incident.status !== 'RESOLVED' && incident.status !== 'DISMISSED' && (
              <div className="space-y-3 border-t border-border pt-4">
                <FormField label="Resolution notes" htmlFor="inc-resolution">
                  <Input id="inc-resolution" value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Describe how this was resolved" />
                </FormField>
                <div className="flex flex-wrap gap-2">
                  {incident.status === 'OPEN' && (
                    <Button variant="outline" size="sm" onClick={() => update.mutate({ status: 'ACKNOWLEDGED', performedBy: currentUser?.id })} disabled={update.isPending}>
                      Acknowledge
                    </Button>
                  )}
                  <Button size="sm" onClick={() => update.mutate({ status: 'RESOLVED', resolution, performedBy: currentUser?.id }, { onSuccess: onClose })} disabled={update.isPending}>
                    Resolve
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => update.mutate({ status: 'DISMISSED', performedBy: currentUser?.id }, { onSuccess: onClose })} disabled={update.isPending}>
                    Dismiss
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ApprovalsTab() {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  const [status, setStatus] = useState<GuardrailApprovalStatus | ''>('PENDING');
  const { data, isLoading, isError, refetch } = useGuardrailApprovals({ workspaceId: workspaceId ?? '', status: status || undefined, limit: 30 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');

  return (
    <div>
      <FilterBar hasActiveFilters={!!status} onClearFilters={() => setStatus('')} className="mb-4">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as GuardrailApprovalStatus | '')}
          placeholder="All statuses"
          options={[
            { value: 'PENDING', label: 'Pending' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'REJECTED', label: 'Rejected' },
            { value: 'EXPIRED', label: 'Expired' },
          ]}
          className="h-9 w-40"
        />
      </FilterBar>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load approvals." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No approvals" description="Items requiring human review before proceeding appear here." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="text-sm font-medium text-foreground">{a.category}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.stage}</TableCell>
                <TableCell>
                  <StatusBadge status={a.severity} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={a.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(a.createdAt)}</TableCell>
                <TableCell className="text-right">
                  {a.status === 'PENDING' && (
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setDecision('APPROVED'); setSelectedId(a.id); }}>
                        Approve
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setDecision('REJECTED'); setSelectedId(a.id); }}>
                        Reject
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ApprovalDecisionDialog id={selectedId} workspaceId={workspaceId ?? ''} decision={decision} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function ApprovalDecisionDialog({ id, workspaceId, decision, onClose }: { id: string | null; workspaceId: string; decision: 'APPROVED' | 'REJECTED'; onClose: () => void }) {
  const userId = useAuthStore((s) => s.user?.id);
  const decide = useDecideGuardrailApproval(id ?? '', workspaceId);

  return (
    <ReasonDialog
      open={!!id}
      onOpenChange={(v) => !v && onClose()}
      title={decision === 'APPROVED' ? 'Approve this item' : 'Reject this item'}
      label="Decision reason"
      confirmLabel={decision === 'APPROVED' ? 'Approve' : 'Reject'}
      variant={decision === 'REJECTED' ? 'danger' : undefined}
      pending={decide.isPending}
      onSubmit={(reason) => decide.mutate({ decision, reason, decidedBy: userId ?? '' }, { onSuccess: onClose })}
    />
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
