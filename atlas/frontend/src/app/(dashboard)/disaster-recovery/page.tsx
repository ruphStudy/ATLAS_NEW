'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Plus, RotateCcw, Unlock } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import {
  useActivateDrPolicy,
  useArchiveDrPolicy,
  useArchiveDrRecoveryPlan,
  useCancelDrExecution,
  useCreateDrPolicy,
  useCreateDrRecoveryPlan,
  useDrExecution,
  useDrExecutions,
  useDrPolicies,
  useDrPolicy,
  useDrPolicyHistory,
  useDrRecoveryPlan,
  useDrRecoveryPlans,
  useForceReleaseDrLock,
  usePauseDrPolicy,
  usePublishDrRecoveryPlan,
  useRestoreDrPolicy,
  useRollbackDrExecution,
  useTriggerDrRecovery,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type {
  CreateDrPolicyPayload,
  CreateDrRecoveryPlanPayload,
  DrEnvironment,
  DrExecutionStatus,
  DrPlanStatus,
  DrPolicyStatus,
  DrRecoveryScope,
} from '@/types';

const ENVIRONMENT_OPTIONS: { value: DrEnvironment; label: string }[] = [
  { value: 'PRODUCTION', label: 'Production' },
  { value: 'STAGING', label: 'Staging' },
  { value: 'DEVELOPMENT', label: 'Development' },
];

const POLICY_STATUS_OPTIONS: { value: DrPolicyStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const SCOPE_OPTIONS: { value: DrRecoveryScope; label: string }[] = [
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'TENANT', label: 'Tenant' },
  { value: 'FULL_PLATFORM', label: 'Full platform' },
];

const PLAN_STATUS_OPTIONS: { value: DrPlanStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const EXECUTION_STATUS_OPTIONS: { value: DrExecutionStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'AWAITING_APPROVAL', label: 'Awaiting approval' },
  { value: 'VALIDATING', label: 'Validating' },
  { value: 'RUNNING', label: 'Running' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'ROLLING_BACK', label: 'Rolling back' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const EXECUTION_STATUS_TONE: Record<DrExecutionStatus, StatusTone> = {
  PENDING: 'neutral',
  AWAITING_APPROVAL: 'warning',
  VALIDATING: 'info',
  RUNNING: 'info',
  PAUSED: 'warning',
  ROLLING_BACK: 'warning',
  COMPLETED: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral',
};

const SCOPE_RISK: Record<DrRecoveryScope, { label: string; tone: StatusTone; description: string }> = {
  PARTIAL: { label: 'Partial', tone: 'info', description: 'Restores specific targets only — lowest blast radius.' },
  TENANT: { label: 'Tenant', tone: 'warning', description: 'Restores an entire tenant/workspace — affects all of that tenant\'s data.' },
  FULL_PLATFORM: { label: 'Full platform', tone: 'danger', description: 'Restores the entire platform — affects every tenant. Requires the strongest confirmation.' },
};

export default function DisasterRecoveryPage() {
  return (
    <div>
      <PageHeader title="Disaster Recovery" description="RPO/RTO policies, recovery plans, checkpoints and recovery execution with strict scope confirmation." />
      <Tabs defaultValue="policies">
        <TabsList>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="plans">Recovery Plans</TabsTrigger>
          <TabsTrigger value="executions">Executions</TabsTrigger>
        </TabsList>
        <TabsContent value="policies">
          <PoliciesTab />
        </TabsContent>
        <TabsContent value="plans">
          <PlansTab />
        </TabsContent>
        <TabsContent value="executions">
          <ExecutionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PoliciesTab() {
  const [environment, setEnvironment] = useState<DrEnvironment | ''>('');
  const [status, setStatus] = useState<DrPolicyStatus | ''>('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useDrPolicies({ environment: environment || undefined, status: status || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!environment || !!status} onClearFilters={() => { setEnvironment(''); setStatus(''); setPage(1); }}>
          <Select value={environment} onChange={(e) => { setEnvironment(e.target.value as DrEnvironment | ''); setPage(1); }} placeholder="All environments" options={ENVIRONMENT_OPTIONS} className="h-9 w-40" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as DrPolicyStatus | ''); setPage(1); }} placeholder="All statuses" options={POLICY_STATUS_OPTIONS} className="h-9 w-36" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create policy
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No DR policies found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>RPO</TableHead>
                <TableHead>RTO</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((p) => (
                <TableRow key={p.id} clickable onClick={() => setSelectedId(p.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{p.criticalService}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.environment}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.rpoMinutes}m</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.rtoMinutes}m</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.recoveryPriority}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={Math.ceil(data.total / 20)} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <CreatePolicyDialog open={createOpen} onOpenChange={setCreateOpen} />
      <PolicyDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreatePolicyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateDrPolicy();
  const [form, setForm] = useState<CreateDrPolicyPayload>({ environment: 'PRODUCTION', criticalService: '', rpoMinutes: 60, rtoMinutes: 240, coverageTargets: [] });
  const reset = () => setForm({ environment: 'PRODUCTION', criticalService: '', rpoMinutes: 60, rtoMinutes: 240, coverageTargets: [] });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Create DR policy</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Critical service" htmlFor="dp-service" required>
            <Input id="dp-service" value={form.criticalService} onChange={(e) => setForm((f) => ({ ...f, criticalService: e.target.value }))} />
          </FormField>
          <FormField label="Environment" htmlFor="dp-env" required>
            <Select id="dp-env" value={form.environment} onChange={(e) => setForm((f) => ({ ...f, environment: e.target.value as DrEnvironment }))} options={ENVIRONMENT_OPTIONS} />
          </FormField>
          <FormField label="RPO (minutes)" htmlFor="dp-rpo" required>
            <Input id="dp-rpo" type="number" value={form.rpoMinutes || ''} onChange={(e) => setForm((f) => ({ ...f, rpoMinutes: Number(e.target.value) }))} />
          </FormField>
          <FormField label="RTO (minutes)" htmlFor="dp-rto" required>
            <Input id="dp-rto" type="number" value={form.rtoMinutes || ''} onChange={(e) => setForm((f) => ({ ...f, rtoMinutes: Number(e.target.value) }))} />
          </FormField>
          <FormField label="Recovery priority" htmlFor="dp-priority">
            <Input id="dp-priority" type="number" value={form.recoveryPriority ?? ''} onChange={(e) => setForm((f) => ({ ...f, recoveryPriority: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <div className="col-span-2">
            <FormField label="Coverage targets (comma-separated)" htmlFor="dp-targets" required>
              <Input
                id="dp-targets"
                value={form.coverageTargets.join(', ')}
                onChange={(e) => setForm((f) => ({ ...f, coverageTargets: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))}
              />
            </FormField>
          </div>
          <label className="col-span-2 flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={!!form.autoTriggerOnDetection} onChange={(e) => setForm((f) => ({ ...f, autoTriggerOnDetection: e.target.checked }))} />
            Auto-trigger recovery on disaster detection
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.criticalService || form.coverageTargets.length === 0 || !form.rpoMinutes || !form.rtoMinutes || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PolicyDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: policy, isLoading } = useDrPolicy(id ?? undefined);
  const { data: history } = useDrPolicyHistory(id ?? undefined);
  const activate = useActivateDrPolicy(id ?? '');
  const pause = usePauseDrPolicy(id ?? '');
  const archive = useArchiveDrPolicy(id ?? '');
  const restore = useRestoreDrPolicy(id ?? '');

  const actions: ActionMenuItem[] = [];
  if (policy) {
    if (policy.status === 'DRAFT' || policy.status === 'PAUSED') actions.push({ label: 'Activate', onSelect: () => activate.mutate() });
    if (policy.status === 'ACTIVE') actions.push({ label: 'Pause', onSelect: () => pause.mutate() });
    if (policy.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => archive.mutate(), destructive: true, separatorBefore: true });
    if (policy.status === 'ARCHIVED') actions.push({ label: 'Restore', onSelect: () => restore.mutate() });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{policy?.criticalService ?? 'Policy'}</span>
            {policy && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !policy ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Environment" value={String(policy.environment)} />
              <Field label="RPO" value={`${policy.rpoMinutes} min`} />
              <Field label="RTO" value={`${policy.rtoMinutes} min`} />
              <Field label="Priority" value={String(policy.recoveryPriority)} />
              <Field label="Auto-trigger" value={policy.autoTriggerOnDetection ? 'Yes' : 'No'} />
              <Field label="Status" value={String(policy.status)} />
              <Field label="Version" value={String(policy.version)} />
            </div>
            {policy.coverageTargets.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Coverage targets</p>
                <p className="text-sm text-foreground">{policy.coverageTargets.join(', ')}</p>
              </div>
            )}
            {policy.dependencyOrder.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dependency order</p>
                <p className="text-sm text-foreground">{policy.dependencyOrder.join(' → ')}</p>
              </div>
            )}
            {history && history.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</p>
                <ul className="space-y-2">
                  {history.map((h) => (
                    <li key={h.id} className="rounded-[var(--radius)] border border-border p-2 text-sm">
                      <span className="font-medium text-foreground">v{h.version} · {h.status}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PlansTab() {
  const [scope, setScope] = useState<DrRecoveryScope | ''>('');
  const [status, setStatus] = useState<DrPlanStatus | ''>('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useDrRecoveryPlans({ scope: scope || undefined, status: status || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!scope || !!status} onClearFilters={() => { setScope(''); setStatus(''); setPage(1); }}>
          <Select value={scope} onChange={(e) => { setScope(e.target.value as DrRecoveryScope | ''); setPage(1); }} placeholder="All scopes" options={SCOPE_OPTIONS} className="h-9 w-40" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as DrPlanStatus | ''); setPage(1); }} placeholder="All statuses" options={PLAN_STATUS_OPTIONS} className="h-9 w-36" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create plan
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No recovery plans found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Targets</TableHead>
                <TableHead>Requires approval</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((p) => (
                <TableRow key={p.id} clickable onClick={() => setSelectedId(p.id)}>
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.key}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={SCOPE_RISK[p.scope as DrRecoveryScope]?.label ?? String(p.scope)} tone={SCOPE_RISK[p.scope as DrRecoveryScope]?.tone ?? 'neutral'} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.targets.length}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.requiresApproval ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={Math.ceil(data.total / 20)} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <CreatePlanDialog open={createOpen} onOpenChange={setCreateOpen} />
      <PlanDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreatePlanDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateDrRecoveryPlan();
  const [form, setForm] = useState<CreateDrRecoveryPlanPayload>({ key: '', name: '', scope: 'PARTIAL', targets: [] });
  const reset = () => setForm({ key: '', name: '', scope: 'PARTIAL', targets: [] });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Create recovery plan</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Key" htmlFor="pl-key" required>
            <Input id="pl-key" value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} />
          </FormField>
          <FormField label="Name" htmlFor="pl-name" required>
            <Input id="pl-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Scope" htmlFor="pl-scope" required>
            <Select id="pl-scope" value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as DrRecoveryScope }))} options={SCOPE_OPTIONS} />
          </FormField>
          <FormField label="Policy ID" htmlFor="pl-policy">
            <Input id="pl-policy" value={form.policyId ?? ''} onChange={(e) => setForm((f) => ({ ...f, policyId: e.target.value || undefined }))} />
          </FormField>
          <div className="col-span-2">
            <FormField label="Targets (comma-separated)" htmlFor="pl-targets" required>
              <Input id="pl-targets" value={form.targets.join(', ')} onChange={(e) => setForm((f) => ({ ...f, targets: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))} />
            </FormField>
          </div>
          <div className="col-span-2">
            <FormField label="Description" htmlFor="pl-desc">
              <Textarea id="pl-desc" rows={2} value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </FormField>
          </div>
          <div className="col-span-2 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox checked={!!form.requiresApproval} onChange={(e) => setForm((f) => ({ ...f, requiresApproval: e.target.checked }))} />
              Requires approval
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox checked={!!form.dryRunDefault} onChange={(e) => setForm((f) => ({ ...f, dryRunDefault: e.target.checked }))} />
              Dry-run by default
            </label>
          </div>
        </div>
        {form.scope !== 'PARTIAL' && (
          <div className="mt-3 flex items-start gap-2 rounded-[var(--radius)] border border-warning/40 bg-warning/5 p-3 text-sm text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{SCOPE_RISK[form.scope].description}</span>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.key || !form.name || form.targets.length === 0 || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlanDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: plan, isLoading } = useDrRecoveryPlan(id ?? undefined);
  const publish = usePublishDrRecoveryPlan(id ?? '');
  const archive = useArchiveDrRecoveryPlan(id ?? '');
  const trigger = useTriggerDrRecovery(id ?? '');
  const [triggerOpen, setTriggerOpen] = useState(false);
  const [isDryRun, setIsDryRun] = useState(true);
  const [targetWorkspaceIds, setTargetWorkspaceIds] = useState('');
  const [confirmScope, setConfirmScope] = useState('');

  const actions: ActionMenuItem[] = [];
  if (plan) {
    if (plan.status === 'DRAFT') actions.push({ label: 'Publish', onSelect: () => publish.mutate() });
    if (plan.status === 'PUBLISHED') actions.push({ label: 'Trigger recovery', onSelect: () => setTriggerOpen(true) });
    if (plan.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => archive.mutate(), destructive: true, separatorBefore: true });
  }

  const risk = plan ? SCOPE_RISK[plan.scope as DrRecoveryScope] : undefined;
  const expectedConfirmation = plan?.scope === 'FULL_PLATFORM' ? 'FULL PLATFORM' : plan?.name ?? '';
  const canConfirmTrigger = plan?.scope === 'FULL_PLATFORM' ? confirmScope === 'FULL PLATFORM' : true;

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{plan?.name ?? 'Recovery plan'}</span>
            {plan && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !plan ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Key" value={plan.key} />
              <Field label="Scope" value={String(plan.scope)} />
              <Field label="Requires approval" value={plan.requiresApproval ? 'Yes' : 'No'} />
              <Field label="Dry-run default" value={plan.dryRunDefault ? 'Yes' : 'No'} />
              <Field label="Status" value={String(plan.status)} />
              <Field label="Version" value={String(plan.version)} />
            </div>
            {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
            {plan.targets.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Targets</p>
                <p className="text-sm text-foreground">{plan.targets.join(', ')}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>

      <Dialog open={triggerOpen} onOpenChange={setTriggerOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Trigger recovery — {plan?.name}</DialogTitle>
          </DialogHeader>
          {risk && (
            <div className="flex items-start gap-2 rounded-[var(--radius)] border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Scope: <strong>{risk.label}</strong>. {risk.description}
              </span>
            </div>
          )}
          <label className="mt-3 flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={isDryRun} onChange={(e) => setIsDryRun(e.target.checked)} />
            Dry-run (simulate without applying changes)
          </label>
          {plan?.scope !== 'PARTIAL' && (
            <FormField label="Target workspace IDs (comma-separated)" htmlFor="trigger-targets">
              <Input id="trigger-targets" value={targetWorkspaceIds} onChange={(e) => setTargetWorkspaceIds(e.target.value)} />
            </FormField>
          )}
          {plan?.scope === 'FULL_PLATFORM' && (
            <FormField label={`Type "${expectedConfirmation}" to confirm`} htmlFor="trigger-confirm" required>
              <Input id="trigger-confirm" value={confirmScope} onChange={(e) => setConfirmScope(e.target.value)} />
            </FormField>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTriggerOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={isDryRun ? 'default' : 'danger'}
              onClick={() =>
                trigger.mutate(
                  {
                    isDryRun,
                    targetWorkspaceIds: targetWorkspaceIds ? targetWorkspaceIds.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
                    triggerType: 'MANUAL',
                  },
                  { onSuccess: () => { setTriggerOpen(false); setConfirmScope(''); setTargetWorkspaceIds(''); } },
                )
              }
              disabled={!canConfirmTrigger || trigger.isPending}
            >
              {trigger.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isDryRun ? 'Run dry-run' : 'Trigger recovery'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function ExecutionsTab() {
  const [status, setStatus] = useState<DrExecutionStatus | ''>('');
  const [planId, setPlanId] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading } = useDrExecutions({ status: status || undefined, planId: planId || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4">
        <FilterBar hasActiveFilters={!!status || !!planId} onClearFilters={() => { setStatus(''); setPlanId(''); setPage(1); }}>
          <Select value={status} onChange={(e) => { setStatus(e.target.value as DrExecutionStatus | ''); setPage(1); }} placeholder="All statuses" options={EXECUTION_STATUS_OPTIONS} className="h-9 w-44" />
          <Input value={planId} onChange={(e) => { setPlanId(e.target.value); setPage(1); }} placeholder="Plan ID" className="h-9 w-56" />
        </FilterBar>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No recovery executions found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Execution</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Dry-run</TableHead>
                <TableHead>RTO actual</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((e) => (
                <TableRow key={e.id} clickable onClick={() => setSelectedId(e.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{e.id}</TableCell>
                  <TableCell>
                    <StatusBadge status={SCOPE_RISK[e.scope as DrRecoveryScope]?.label ?? String(e.scope)} tone={SCOPE_RISK[e.scope as DrRecoveryScope]?.tone ?? 'neutral'} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.isDryRun ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.rtoActualMinutes != null ? `${e.rtoActualMinutes}m` : '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(e.startedAt)}</TableCell>
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

const TERMINAL_EXECUTION_STATUSES = new Set<DrExecutionStatus>(['COMPLETED', 'FAILED', 'CANCELLED']);

function ExecutionDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: execution, isLoading } = useDrExecution(id ?? undefined);
  const cancel = useCancelDrExecution(id ?? '');
  const rollback = useRollbackDrExecution(id ?? '');
  const forceRelease = useForceReleaseDrLock();
  const [lockScopeKey, setLockScopeKey] = useState('');

  const isTerminal = execution ? TERMINAL_EXECUTION_STATUSES.has(execution.status) : false;

  const actions: ActionMenuItem[] = [];
  if (execution && !isTerminal) {
    actions.push({ label: 'Cancel', onSelect: () => cancel.mutate(), destructive: true });
  }
  if (execution && (execution.status === 'FAILED' || execution.status === 'RUNNING')) {
    actions.push({ label: 'Rollback', icon: RotateCcw, onSelect: () => rollback.mutate() });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Recovery execution</span>
            {execution && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !execution ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Scope" value={String(execution.scope)} />
              <Field label="Status" value={execution.status} />
              <Field label="Dry-run" value={execution.isDryRun ? 'Yes' : 'No'} />
              <Field label="Trigger" value={String(execution.triggerType)} />
              <Field label="Approval request" value={execution.approvalRequestId ?? '—'} />
              <Field label="Workflow execution" value={execution.workflowExecutionId ?? '—'} />
              <Field label="RPO actual" value={execution.rpoActualMinutes != null ? `${execution.rpoActualMinutes}m` : '—'} />
              <Field label="RTO actual" value={execution.rtoActualMinutes != null ? `${execution.rtoActualMinutes}m` : '—'} />
              <Field label="Started" value={formatDate(execution.startedAt)} />
              <Field label="Ended" value={execution.endedAt ? formatDate(execution.endedAt) : '—'} />
            </div>
            {execution.targetWorkspaceIds.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target workspaces</p>
                <p className="text-sm text-foreground">{execution.targetWorkspaceIds.join(', ')}</p>
              </div>
            )}
            {execution.errorMessage && (
              <div className="rounded-[var(--radius)] border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
                {execution.errorCode ? `${execution.errorCode}: ` : ''}
                {execution.errorMessage}
              </div>
            )}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checkpoints</p>
              {!execution.checkpoints || execution.checkpoints.length === 0 ? (
                <p className="text-sm text-muted-foreground">No checkpoints recorded.</p>
              ) : (
                <ul className="space-y-2">
                  {[...execution.checkpoints]
                    .sort((a, b) => a.sequence - b.sequence)
                    .map((cp) => (
                      <li key={cp.id} className="rounded-[var(--radius)] border border-border p-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">
                            #{cp.sequence} · {cp.targetType}
                          </span>
                          <StatusBadge status={cp.status} />
                        </div>
                        {cp.notes && <p className="mt-1 text-xs text-muted-foreground">{cp.notes}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(cp.createdAt)}</p>
                      </li>
                    ))}
                </ul>
              )}
            </div>
            <div className="flex items-end gap-2 border-t border-border pt-3">
              <FormField label="Force-release lock (scope key)" htmlFor="lock-key">
                <Input id="lock-key" value={lockScopeKey} onChange={(e) => setLockScopeKey(e.target.value)} className="h-9 w-64" />
              </FormField>
              <Button
                size="sm"
                variant="outline"
                onClick={() => forceRelease.mutate(lockScopeKey, { onSuccess: () => setLockScopeKey('') })}
                disabled={!lockScopeKey || forceRelease.isPending}
              >
                <Unlock className="h-3.5 w-3.5" />
                Force release
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
