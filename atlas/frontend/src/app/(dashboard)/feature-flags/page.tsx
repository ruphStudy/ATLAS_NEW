'use client';

import { useState } from 'react';
import { Loader2, Plus, ShieldOff } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useActivateKillSwitch,
  useAllFeatureFlagOverrides,
  useArchiveFeatureFlagDefinition,
  useArchiveFeatureFlagOverride,
  useCreateFeatureFlagDefinition,
  useCreateFeatureFlagOverride,
  useDeactivateKillSwitch,
  useDisableFeatureFlagDefinition,
  useDisableFeatureFlagOverride,
  useEnableFeatureFlagDefinition,
  useEnableFeatureFlagOverride,
  useFeatureFlagDefinition,
  useFeatureFlagDefinitionHistory,
  useFeatureFlagDefinitions,
  useOverridesForFlag,
  useRestoreFeatureFlagDefinition,
  useUpdateFeatureFlagDefinition,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { CreateFeatureFlagDefinitionPayload, CreateFeatureFlagOverridePayload, FeatureFlagDefinitionStatus, FeatureFlagScopeType, FeatureFlagType } from '@/types';

const FLAG_TYPES: FeatureFlagType[] = ['BOOLEAN', 'PERCENTAGE', 'ALLOWLIST', 'DENYLIST', 'RULE_BASED'];
const FLAG_STATUSES: FeatureFlagDefinitionStatus[] = ['DRAFT', 'ACTIVE', 'DISABLED', 'ARCHIVED'];
const SCOPE_TYPES: FeatureFlagScopeType[] = ['GLOBAL', 'ORGANIZATION', 'WORKSPACE', 'PLAN', 'USER', 'ENVIRONMENT'];

export default function FeatureFlagsPage() {
  return (
    <div>
      <PageHeader title="Feature Flags" description="Feature flag definitions, rollout rules, kill switches and scoped overrides." />
      <Tabs defaultValue="definitions">
        <TabsList>
          <TabsTrigger value="definitions">Definitions</TabsTrigger>
          <TabsTrigger value="overrides">Overrides</TabsTrigger>
        </TabsList>
        <TabsContent value="definitions">
          <DefinitionsTab />
        </TabsContent>
        <TabsContent value="overrides">
          <OverridesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DefinitionsTab() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<FeatureFlagType | ''>('');
  const [status, setStatus] = useState<FeatureFlagDefinitionStatus | ''>('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useFeatureFlagDefinitions({ search: search || undefined, type: type || undefined, status: status || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search flags…"
          hasActiveFilters={!!type || !!status}
          onClearFilters={() => { setType(''); setStatus(''); setPage(1); }}
        >
          <Select value={type} onChange={(e) => { setType(e.target.value as FeatureFlagType | ''); setPage(1); }} placeholder="All types" options={FLAG_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))} className="h-9 w-36" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as FeatureFlagDefinitionStatus | ''); setPage(1); }} placeholder="All statuses" options={FLAG_STATUSES.map((s) => ({ value: s, label: s }))} className="h-9 w-36" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create flag
        </Button>
      </div>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load feature flags." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No feature flags yet" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flag</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Rollout</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((f) => (
                <TableRow key={f.id} clickable onClick={() => setSelectedKey(f.key)}>
                  <TableCell className="text-sm font-medium text-foreground">{f.name} <span className="text-xs text-muted-foreground">({f.key})</span></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{f.type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{f.defaultEnabled ? 'Enabled' : 'Disabled'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{f.rolloutPercentage != null ? `${f.rolloutPercentage}%` : '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{f.priority}</TableCell>
                  <TableCell>
                    <StatusBadge status={f.status} />
                    {f.killSwitchEnabled && <Badge variant="danger" className="ml-1.5 text-[9px]">kill switch</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <CreateDefinitionDialog open={createOpen} onOpenChange={setCreateOpen} />
      <DefinitionDetailDialog flagKey={selectedKey} onClose={() => setSelectedKey(null)} />
    </div>
  );
}

function emptyDefinitionForm(): CreateFeatureFlagDefinitionPayload {
  return { key: '', name: '', type: 'BOOLEAN', defaultEnabled: false };
}

function CreateDefinitionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateFeatureFlagDefinition();
  const [form, setForm] = useState<CreateFeatureFlagDefinitionPayload>(emptyDefinitionForm());
  const reset = () => setForm(emptyDefinitionForm());

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Create feature flag</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Key" htmlFor="ff-key" required>
            <Input id="ff-key" value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} />
          </FormField>
          <FormField label="Name" htmlFor="ff-name" required>
            <Input id="ff-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Type" htmlFor="ff-type" required>
            <Select id="ff-type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as FeatureFlagType }))} options={FLAG_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))} />
          </FormField>
          <FormField label="Priority" htmlFor="ff-priority">
            <Input id="ff-priority" type="number" value={form.priority ?? ''} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          {form.type === 'PERCENTAGE' && (
            <FormField label="Rollout percentage" htmlFor="ff-rollout">
              <Input id="ff-rollout" type="number" min={0} max={100} value={form.rolloutPercentage ?? ''} onChange={(e) => setForm((f) => ({ ...f, rolloutPercentage: e.target.value ? Number(e.target.value) : undefined }))} />
            </FormField>
          )}
          <FormField label="Owner (optional)" htmlFor="ff-owner">
            <Input id="ff-owner" value={form.owner ?? ''} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} />
          </FormField>
          <div className="col-span-2">
            <FormField label="Description (optional)" htmlFor="ff-description">
              <Input id="ff-description" value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </FormField>
          </div>
          <label className="col-span-2 flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={!!form.defaultEnabled} onChange={(e) => setForm((f) => ({ ...f, defaultEnabled: e.target.checked }))} />
            Enabled by default
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => create.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })} disabled={!form.key || !form.name || create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DefinitionDetailDialog({ flagKey, onClose }: { flagKey: string | null; onClose: () => void }) {
  const { data: flag, isLoading } = useFeatureFlagDefinition(flagKey ?? undefined);
  const { data: history } = useFeatureFlagDefinitionHistory(flagKey ?? undefined);
  const { data: overrides } = useOverridesForFlag(flagKey ?? undefined);
  const enable = useEnableFeatureFlagDefinition(flagKey ?? '');
  const disable = useDisableFeatureFlagDefinition(flagKey ?? '');
  const archive = useArchiveFeatureFlagDefinition(flagKey ?? '');
  const restore = useRestoreFeatureFlagDefinition(flagKey ?? '');
  const update = useUpdateFeatureFlagDefinition(flagKey ?? '');
  const activateKill = useActivateKillSwitch(flagKey ?? '');
  const deactivateKill = useDeactivateKillSwitch(flagKey ?? '');
  const createOverride = useCreateFeatureFlagOverride(flagKey ?? '');

  const [killSwitchOpen, setKillSwitchOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [rollout, setRollout] = useState('');

  const actions: ActionMenuItem[] = [];
  if (flag) {
    if (flag.status !== 'ACTIVE') actions.push({ label: 'Enable', onSelect: () => enable.mutate() });
    if (flag.status === 'ACTIVE') actions.push({ label: 'Disable', onSelect: () => disable.mutate() });
    if (flag.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => archive.mutate(), destructive: true, separatorBefore: true });
    if (flag.status === 'ARCHIVED') actions.push({ label: 'Restore', onSelect: () => restore.mutate() });
    if (!flag.killSwitchEnabled) actions.push({ label: 'Activate kill switch', onSelect: () => setKillSwitchOpen(true), destructive: true, separatorBefore: true });
    if (flag.killSwitchEnabled) actions.push({ label: 'Deactivate kill switch', onSelect: () => deactivateKill.mutate(), separatorBefore: true });
  }

  return (
    <Dialog open={!!flagKey} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{flag?.name ?? 'Feature flag'}</span>
            {flag && <div className="flex items-center gap-2"><StatusBadge status={flag.status} /><ActionMenu items={actions} /></div>}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !flag ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <div className="space-y-4">
            {flag.killSwitchEnabled && (
              <div className="flex items-center gap-2 rounded-[var(--radius)] border border-danger/20 bg-danger/5 p-2.5 text-sm text-danger">
                <ShieldOff className="h-4 w-4" />
                Kill switch active{flag.killSwitchReason ? `: ${flag.killSwitchReason}` : ''}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Key" value={flag.key} />
              <Field label="Type" value={flag.type} />
              <Field label="Default" value={flag.defaultEnabled ? 'Enabled' : 'Disabled'} />
              <Field label="Rollout" value={flag.rolloutPercentage != null ? `${flag.rolloutPercentage}%` : '—'} />
              <Field label="Priority" value={String(flag.priority)} />
              <Field label="Owner" value={flag.owner ?? '—'} />
              <Field label="Start date" value={flag.startDate ? formatDate(flag.startDate) : '—'} />
              <Field label="End date" value={flag.endDate ? formatDate(flag.endDate) : '—'} />
            </div>
            {(flag.dependencies.length > 0 || flag.mutuallyExclusiveWith.length > 0) && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Depends on" value={flag.dependencies.join(', ') || '—'} />
                <Field label="Mutually exclusive with" value={flag.mutuallyExclusiveWith.join(', ') || '—'} />
              </div>
            )}

            {flag.type === 'PERCENTAGE' && flag.status !== 'ARCHIVED' && (
              <div className="flex items-end gap-2 border-t border-border pt-3">
                <FormField label="Update rollout %" htmlFor="ff-update-rollout">
                  <Input id="ff-update-rollout" type="number" min={0} max={100} value={rollout} onChange={(e) => setRollout(e.target.value)} className="w-32" />
                </FormField>
                <Button size="sm" onClick={() => update.mutate({ rolloutPercentage: Number(rollout) }, { onSuccess: () => setRollout('') })} disabled={!rollout || update.isPending}>
                  Save
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scoped overrides ({overrides?.length ?? 0})</p>
              <Button variant="outline" size="sm" onClick={() => setOverrideOpen(true)}>Add override</Button>
            </div>
            {overrides && overrides.length > 0 && (
              <ul className="space-y-1.5">
                {overrides.map((o) => (
                  <li key={o.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-2 text-sm">
                    <span className="text-foreground">{o.scope} · {o.scopeKey} — {o.enabled ? 'Enabled' : 'Disabled'}</span>
                    <StatusBadge status={o.status} />
                  </li>
                ))}
              </ul>
            )}

            {history && history.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</p>
                <ul className="space-y-1">
                  {history.map((h) => (
                    <li key={h.id} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{h.changeType}</span> · {formatDate(h.createdAt)}
                      {h.reason && ` — ${h.reason}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>

      <ReasonDialog
        open={killSwitchOpen}
        onOpenChange={setKillSwitchOpen}
        title="Activate kill switch"
        label="Reason (required)"
        confirmLabel="Activate"
        variant="danger"
        pending={activateKill.isPending}
        onSubmit={(reason) => activateKill.mutate(reason, { onSuccess: () => setKillSwitchOpen(false) })}
      />

      <CreateOverrideDialog open={overrideOpen} onOpenChange={setOverrideOpen} pending={createOverride.isPending} onSubmit={(payload) => createOverride.mutate(payload, { onSuccess: () => setOverrideOpen(false) })} />
    </Dialog>
  );
}

function CreateOverrideDialog({ open, onOpenChange, onSubmit, pending }: { open: boolean; onOpenChange: (o: boolean) => void; onSubmit: (payload: CreateFeatureFlagOverridePayload) => void; pending: boolean }) {
  const [scope, setScope] = useState<FeatureFlagScopeType>('WORKSPACE');
  const [enabled, setEnabled] = useState(true);
  const [reason, setReason] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [planKey, setPlanKey] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [environment, setEnvironment] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Add scoped override</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Scope" htmlFor="ov-scope" required>
            <Select id="ov-scope" value={scope} onChange={(e) => setScope(e.target.value as FeatureFlagScopeType)} options={SCOPE_TYPES.map((s) => ({ value: s, label: s }))} />
          </FormField>
          {scope === 'ORGANIZATION' && (
            <FormField label="Organization ID" htmlFor="ov-org">
              <Input id="ov-org" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} />
            </FormField>
          )}
          {scope === 'PLAN' && (
            <FormField label="Plan key" htmlFor="ov-plan">
              <Input id="ov-plan" value={planKey} onChange={(e) => setPlanKey(e.target.value)} />
            </FormField>
          )}
          {scope === 'USER' && (
            <FormField label="Target user ID" htmlFor="ov-user">
              <Input id="ov-user" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} />
            </FormField>
          )}
          {scope === 'ENVIRONMENT' && (
            <FormField label="Environment" htmlFor="ov-env">
              <Input id="ov-env" value={environment} onChange={(e) => setEnvironment(e.target.value)} />
            </FormField>
          )}
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Enabled for this scope
          </label>
          <FormField label="Reason (optional)" htmlFor="ov-reason">
            <Input id="ov-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() =>
              onSubmit({
                scope,
                enabled,
                reason: reason || undefined,
                organizationId: organizationId || undefined,
                planKey: planKey || undefined,
                targetUserId: targetUserId || undefined,
                environment: environment || undefined,
              })
            }
            disabled={pending}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Add override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OverridesTab() {
  const [scope, setScope] = useState<FeatureFlagScopeType | ''>('');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useAllFeatureFlagOverrides({ scope: scope || undefined, page, limit: 20 });
  const enable = useEnableFeatureFlagOverride();
  const disable = useDisableFeatureFlagOverride();
  const archive = useArchiveFeatureFlagOverride();

  return (
    <div>
      <FilterBar hasActiveFilters={!!scope} onClearFilters={() => { setScope(''); setPage(1); }} className="mb-4">
        <Select value={scope} onChange={(e) => { setScope(e.target.value as FeatureFlagScopeType | ''); setPage(1); }} placeholder="All scopes" options={SCOPE_TYPES.map((s) => ({ value: s, label: s }))} className="h-9 w-40" />
      </FilterBar>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load overrides." />
      ) : isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No overrides configured" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flag</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="text-sm font-medium text-foreground">{o.flagKey}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{o.scope} · {o.scopeKey}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{o.enabled ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{o.reason ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={o.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ActionMenu
                      items={[
                        ...(o.status !== 'ACTIVE' ? [{ label: 'Enable', onSelect: () => enable.mutate(o.id) }] : []),
                        ...(o.status === 'ACTIVE' ? [{ label: 'Disable', onSelect: () => disable.mutate(o.id) }] : []),
                        ...(o.status !== 'ARCHIVED' ? [{ label: 'Archive', onSelect: () => archive.mutate({ id: o.id }), destructive: true, separatorBefore: true }] : []),
                      ]}
                    />
                  </TableCell>
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
