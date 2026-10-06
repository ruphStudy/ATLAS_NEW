'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Siren, Check, Ban, Archive, ArchiveRestore, History, ShieldOff } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { ActionMenu } from '@/components/ui/action-menu';
import { Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useActivateKillSwitch,
  useArchiveFeatureFlagDefinition,
  useArchiveFeatureFlagOverride,
  useCreateFeatureFlagDefinition,
  useCreateFeatureFlagOverride,
  useDeactivateKillSwitch,
  useDisableFeatureFlagDefinition,
  useEnableFeatureFlagDefinition,
  useEnableFeatureFlagOverride,
  useDisableFeatureFlagOverride,
  useFeatureFlagDefinition,
  useFeatureFlagDefinitionHistory,
  useFeatureFlagDefinitions,
  useOverridesForFlag,
  useRestoreFeatureFlagDefinition,
  useUpdateFeatureFlagDefinition,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { CreateFeatureFlagOverridePayload, FeatureFlagDefinitionFilterParams, FeatureFlagDefinitionStatus, FeatureFlagOverride, FeatureFlagScopeType, FeatureFlagType } from '@/types';

const TYPE_OPTIONS: { value: FeatureFlagType; label: string }[] = [
  { value: 'BOOLEAN', label: 'Boolean' },
  { value: 'PERCENTAGE', label: 'Percentage rollout' },
  { value: 'ALLOWLIST', label: 'Allowlist' },
  { value: 'DENYLIST', label: 'Denylist' },
  { value: 'RULE_BASED', label: 'Rule-based' },
];

const STATUS_OPTIONS: { value: FeatureFlagDefinitionStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const OVERRIDE_SCOPE_OPTIONS: { value: FeatureFlagScopeType; label: string }[] = [
  { value: 'GLOBAL', label: 'Global' },
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'WORKSPACE', label: 'Workspace' },
  { value: 'PLAN', label: 'Plan' },
  { value: 'USER', label: 'User' },
  { value: 'ENVIRONMENT', label: 'Environment' },
];

export default function FeatureFlagsPage() {
  const [type, setType] = useState<FeatureFlagType | ''>('');
  const [status, setStatus] = useState<FeatureFlagDefinitionStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const params = useMemo<FeatureFlagDefinitionFilterParams>(
    () => ({ type: type || undefined, status: status || undefined, search: search || undefined, page, limit }),
    [type, status, search, page, limit],
  );

  const flags = useFeatureFlagDefinitions(params);
  const rows = flags.data?.data ?? [];
  const hasActiveFilters = !!(type || status || search);

  return (
    <div>
      <PageHeader
        title="Feature Flags"
        description="Targeting, rollout, dependencies, effective dates and kill switches."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New flag
          </Button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search flags…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setType('');
          setStatus('');
          setSearch('');
          setPage(1);
        }}
        className="mb-4"
      >
        <Select value={type} onChange={(e) => setType(e.target.value as FeatureFlagType | '')} options={[{ value: '', label: 'All types' }, ...TYPE_OPTIONS]} className="h-9 w-44" />
        <Select value={status} onChange={(e) => setStatus(e.target.value as FeatureFlagDefinitionStatus | '')} options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]} className="h-9 w-40" />
      </FilterBar>

      {flags.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : flags.isError ? (
        <QueryErrorState refetch={flags.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No feature flags yet" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flag</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Rollout</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Kill switch</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((f) => (
                <TableRow key={f.id} className="cursor-pointer" onClick={() => setSelectedKey(f.key)}>
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">{f.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{f.key}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {f.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{f.rolloutPercentage != null ? `${f.rolloutPercentage}%` : '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={f.status} />
                  </TableCell>
                  <TableCell>
                    {f.killSwitchEnabled && (
                      <Badge variant="danger" className="gap-1 text-[10px]">
                        <Siren className="h-3 w-3" />
                        Active
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={flags.data?.page ?? page}
            limit={flags.data?.limit ?? limit}
            total={flags.data?.total ?? 0}
            totalPages={flags.data?.totalPages ?? 0}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </>
      )}

      <CreateFlagDialog open={createOpen} onOpenChange={setCreateOpen} />
      <FlagDetailDrawer flagKey={selectedKey} onClose={() => setSelectedKey(null)} />
    </div>
  );
}

function CreateFlagDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const createFlag = useCreateFeatureFlagDefinition();
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<FeatureFlagType>('BOOLEAN');
  const [defaultEnabled, setDefaultEnabled] = useState(false);
  const [rolloutPercentage, setRolloutPercentage] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>New feature flag</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Key" htmlFor="ff-key" required>
            <Input id="ff-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. new-checkout-flow" />
          </FormField>
          <FormField label="Name" htmlFor="ff-name" required>
            <Input id="ff-name" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Description" htmlFor="ff-description">
            <Input id="ff-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </FormField>
          <FormField label="Type" htmlFor="ff-type">
            <Select id="ff-type" value={type} onChange={(e) => setType(e.target.value as FeatureFlagType)} options={TYPE_OPTIONS} />
          </FormField>
          {type === 'PERCENTAGE' && (
            <FormField label="Rollout percentage" htmlFor="ff-rollout">
              <Input id="ff-rollout" type="number" min={0} max={100} value={rolloutPercentage} onChange={(e) => setRolloutPercentage(e.target.value)} />
            </FormField>
          )}
          <label className="flex items-center gap-3 text-sm text-foreground">
            <Switch checked={defaultEnabled} onChange={(e) => setDefaultEnabled(e.target.checked)} />
            Default enabled
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              createFlag.mutate(
                { key, name, description: description || undefined, type, defaultEnabled, rolloutPercentage: rolloutPercentage ? Number(rolloutPercentage) : undefined },
                { onSuccess: () => onOpenChange(false) },
              )
            }
            disabled={!key || !name || createFlag.isPending}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FlagDetailDrawer({ flagKey, onClose }: { flagKey: string | null; onClose: () => void }) {
  const flag = useFeatureFlagDefinition(flagKey ?? undefined);
  const updateFlag = useUpdateFeatureFlagDefinition(flagKey ?? '');
  const enable = useEnableFeatureFlagDefinition(flagKey ?? '');
  const disable = useDisableFeatureFlagDefinition(flagKey ?? '');
  const archive = useArchiveFeatureFlagDefinition(flagKey ?? '');
  const restore = useRestoreFeatureFlagDefinition(flagKey ?? '');
  const activateKill = useActivateKillSwitch(flagKey ?? '');
  const deactivateKill = useDeactivateKillSwitch(flagKey ?? '');
  const history = useFeatureFlagDefinitionHistory(flagKey ?? undefined);
  const overrides = useOverridesForFlag(flagKey ?? undefined);

  const [rolloutPercentage, setRolloutPercentage] = useState('');
  const [killReason, setKillReason] = useState('');
  const [killDialogOpen, setKillDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);

  useEffect(() => {
    if (flag.data?.rolloutPercentage != null) setRolloutPercentage(String(flag.data.rolloutPercentage));
  }, [flag.data]);

  return (
    <Drawer open={!!flagKey} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent size="lg">
        <DrawerHeader>
          <DrawerTitle>{flag.data?.name ?? flagKey}</DrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          {flag.isLoading || !flag.data ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={flag.data.status} />
                {flag.data.killSwitchEnabled && (
                  <Badge variant="danger" className="gap-1 text-[10px]">
                    <Siren className="h-3 w-3" />
                    Kill switch active{flag.data.killSwitchReason ? `: ${flag.data.killSwitchReason}` : ''}
                  </Badge>
                )}
                <ActionMenu
                  items={[
                    ...(flag.data.status === 'DISABLED' || flag.data.status === 'DRAFT' ? [{ label: 'Enable', icon: Check, onSelect: () => enable.mutate() }] : []),
                    ...(flag.data.status === 'ACTIVE' ? [{ label: 'Disable', icon: Ban, onSelect: () => disable.mutate() }] : []),
                    ...(flag.data.status !== 'ARCHIVED' ? [{ label: 'Archive', icon: Archive, onSelect: () => archive.mutate(), separatorBefore: true }] : []),
                    ...(flag.data.status === 'ARCHIVED' ? [{ label: 'Restore', icon: ArchiveRestore, onSelect: () => restore.mutate() }] : []),
                    ...(!flag.data.killSwitchEnabled
                      ? [{ label: 'Activate kill switch', icon: Siren, onSelect: () => setKillDialogOpen(true), destructive: true, separatorBefore: true }]
                      : [{ label: 'Deactivate kill switch', icon: ShieldOff, onSelect: () => deactivateKill.mutate(), separatorBefore: true }]),
                    { label: 'History', icon: History, onSelect: () => setHistoryOpen(true), separatorBefore: true },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Type" value={flag.data.type} />
                <Field label="Owner" value={flag.data.owner ?? '—'} />
                <Field label="Priority" value={String(flag.data.priority)} />
                <Field label="Default enabled" value={flag.data.defaultEnabled ? 'Yes' : 'No'} />
                <Field label="Start date" value={flag.data.startDate ? formatDate(flag.data.startDate) : '—'} />
                <Field label="End date" value={flag.data.endDate ? formatDate(flag.data.endDate) : '—'} />
                <Field label="Dependencies" value={flag.data.dependencies.join(', ') || '—'} />
                <Field label="Mutually exclusive with" value={flag.data.mutuallyExclusiveWith.join(', ') || '—'} />
              </div>

              {flag.data.type === 'PERCENTAGE' && (
                <div className="flex items-end gap-2">
                  <FormField label="Rollout percentage" htmlFor="ff-detail-rollout">
                    <Input id="ff-detail-rollout" type="number" min={0} max={100} value={rolloutPercentage} onChange={(e) => setRolloutPercentage(e.target.value)} className="w-32" />
                  </FormField>
                  <Button size="sm" variant="outline" onClick={() => updateFlag.mutate({ rolloutPercentage: Number(rolloutPercentage) })} disabled={updateFlag.isPending}>
                    Update
                  </Button>
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Overrides</p>
                  <Button size="sm" variant="outline" onClick={() => setOverrideOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Add override
                  </Button>
                </div>
                {overrides.isLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : !overrides.data || overrides.data.length === 0 ? (
                  <EmptyState title="No overrides" className="border-none py-6" />
                ) : (
                  <div className="space-y-2">
                    {overrides.data.map((o) => (
                      <OverrideRow key={o.id} override={o} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DrawerBody>
      </DrawerContent>

      <Dialog open={killDialogOpen} onOpenChange={setKillDialogOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Activate kill switch</DialogTitle>
          </DialogHeader>
          <FormField label="Reason" htmlFor="kill-reason" required>
            <Textarea id="kill-reason" value={killReason} onChange={(e) => setKillReason(e.target.value)} rows={3} />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKillDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => activateKill.mutate(killReason, { onSuccess: () => { setKillDialogOpen(false); setKillReason(''); } })}
              disabled={!killReason || activateKill.isPending}
            >
              Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {flagKey && (
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogContent size="md">
            <DialogHeader>
              <DialogTitle>Flag history</DialogTitle>
            </DialogHeader>
            {!history.data || history.data.length === 0 ? (
              <EmptyState title="No history yet" className="border-none py-8" />
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {history.data.map((h) => (
                  <div key={h.id} className="rounded-[var(--radius)] border border-border p-2.5 text-sm">
                    <p className="text-foreground">{h.changeType.toLowerCase().replace(/_/g, ' ')}</p>
                    {h.reason && <p className="mt-1 text-xs text-muted-foreground">{h.reason}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(h.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {flagKey && <CreateOverrideDialog open={overrideOpen} onOpenChange={setOverrideOpen} flagKey={flagKey} />}
    </Drawer>
  );
}

function OverrideRow({ override: o }: { override: FeatureFlagOverride }) {
  const enable = useEnableFeatureFlagOverride();
  const disable = useDisableFeatureFlagOverride();
  const archive = useArchiveFeatureFlagOverride();

  return (
    <div className="flex items-center justify-between rounded-[var(--radius)] border border-border p-2.5 text-sm">
      <div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {o.scope}
          </Badge>
          <StatusBadge status={o.status} />
          <span className="text-xs text-muted-foreground">{o.enabled ? 'enabled' : 'disabled'}</span>
        </div>
        {o.reason && <p className="mt-1 text-xs text-muted-foreground">{o.reason}</p>}
      </div>
      <ActionMenu
        items={[
          ...(o.status === 'DISABLED' ? [{ label: 'Enable', icon: Check, onSelect: () => enable.mutate(o.id) }] : []),
          ...(o.status === 'ACTIVE' ? [{ label: 'Disable', icon: Ban, onSelect: () => disable.mutate(o.id) }] : []),
          ...(o.status !== 'ARCHIVED' ? [{ label: 'Archive', icon: Archive, onSelect: () => archive.mutate({ id: o.id }), destructive: true }] : []),
        ]}
      />
    </div>
  );
}

function CreateOverrideDialog({ open, onOpenChange, flagKey }: { open: boolean; onOpenChange: (o: boolean) => void; flagKey: string }) {
  const createOverride = useCreateFeatureFlagOverride(flagKey);
  const [scope, setScope] = useState<FeatureFlagScopeType>('WORKSPACE');
  const [organizationId, setOrganizationId] = useState('');
  const [planKey, setPlanKey] = useState('');
  const [environment, setEnvironment] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [reason, setReason] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>New override</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Scope" htmlFor="ov-scope">
            <Select id="ov-scope" value={scope} onChange={(e) => setScope(e.target.value as FeatureFlagScopeType)} options={OVERRIDE_SCOPE_OPTIONS} />
          </FormField>
          {scope === 'ORGANIZATION' && (
            <FormField label="Organization ID" htmlFor="ov-org" required>
              <Input id="ov-org" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} />
            </FormField>
          )}
          {scope === 'PLAN' && (
            <FormField label="Plan key" htmlFor="ov-plan" required>
              <Input id="ov-plan" value={planKey} onChange={(e) => setPlanKey(e.target.value)} />
            </FormField>
          )}
          {scope === 'ENVIRONMENT' && (
            <FormField label="Environment" htmlFor="ov-env" required>
              <Input id="ov-env" value={environment} onChange={(e) => setEnvironment(e.target.value)} placeholder="production, staging…" />
            </FormField>
          )}
          {scope === 'USER' && (
            <FormField label="Target user ID" htmlFor="ov-user" required>
              <Input id="ov-user" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} />
            </FormField>
          )}
          <label className="flex items-center gap-3 text-sm text-foreground">
            <Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Enabled
          </label>
          <FormField label="Reason" htmlFor="ov-reason">
            <Input id="ov-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const payload: CreateFeatureFlagOverridePayload = {
                scope,
                organizationId: scope === 'ORGANIZATION' ? organizationId : undefined,
                planKey: scope === 'PLAN' ? planKey : undefined,
                environment: scope === 'ENVIRONMENT' ? environment : undefined,
                targetUserId: scope === 'USER' ? targetUserId : undefined,
                enabled,
                reason: reason || undefined,
              };
              createOverride.mutate(payload, { onSuccess: () => onOpenChange(false) });
            }}
            disabled={createOverride.isPending}
          >
            Create
          </Button>
        </DialogFooter>
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
