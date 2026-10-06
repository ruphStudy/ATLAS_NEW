'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
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
  useArchivePlan,
  useCreatePlan,
  useCreatePlanVersion,
  useDeprecatePlan,
  usePlan,
  usePlanCompatibility,
  usePlanEntitlementSnapshot,
  usePlanHistory,
  usePlans,
  usePlanVersions,
  usePublishPlan,
  useRestorePlan,
  useUpdatePlan,
} from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { CreatePlanPayload, Plan, PlanBillingCycle, PlanEntitlement, PlanLimit, PlanStatus, PlanType } from '@/types';
import { PlatformAdminGuard } from '@/components/auth/platform-admin-guard';

const PLAN_TYPES: PlanType[] = ['FREE', 'TRIAL', 'STANDARD', 'PREMIUM', 'ENTERPRISE', 'CUSTOM'];
const PLAN_STATUSES: PlanStatus[] = ['DRAFT', 'PUBLISHED', 'DEPRECATED', 'ARCHIVED'];
const BILLING_CYCLES: PlanBillingCycle[] = ['MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM'];

function emptyCreatePayload(): CreatePlanPayload {
  return { code: '', name: '', tier: '', type: 'STANDARD', supportedBillingCycles: ['MONTHLY'], prices: [], availableCountries: [], availableRegions: [], entitlements: [], limits: [] };
}

export default function PlansPage() {
  return (
    <PlatformAdminGuard>
      <PlansPageContent />
    </PlatformAdminGuard>
  );
}

function PlansPageContent() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PlanStatus | ''>('');
  const [type, setType] = useState<PlanType | ''>('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = usePlans({ search: search || undefined, status: status || undefined, type: type || undefined, page, limit: 20 });

  return (
    <div>
      <PageHeader title="Plans" description="Plan catalog, entitlements, limits, versions and publishing." />

      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search plans…"
          hasActiveFilters={!!status || !!type}
          onClearFilters={() => { setStatus(''); setType(''); setPage(1); }}
        >
          <Select value={status} onChange={(e) => { setStatus(e.target.value as PlanStatus | ''); setPage(1); }} placeholder="All statuses" options={PLAN_STATUSES.map((s) => ({ value: s, label: s }))} className="h-9 w-36" />
          <Select value={type} onChange={(e) => { setType(e.target.value as PlanType | ''); setPage(1); }} placeholder="All types" options={PLAN_TYPES.map((t) => ({ value: t, label: t }))} className="h-9 w-36" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create plan
        </Button>
      </div>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load plans." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No plans yet" description="Create your first plan to define pricing, entitlements and limits." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Countries</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((p) => (
                <TableRow key={p.id} clickable onClick={() => setSelectedId(p.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{p.name} <span className="text-xs text-muted-foreground">({p.code})</span></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.tier}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">v{p.version}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.prices[0] ? formatCurrency(p.prices[0].amount, p.prices[0].currency) : '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.availableCountries.length > 0 ? p.availableCountries.join(', ') : 'All'}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <CreatePlanDialog open={createOpen} onOpenChange={setCreateOpen} />
      <PlanDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreatePlanDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreatePlan();
  const [form, setForm] = useState<CreatePlanPayload>(emptyCreatePayload());
  const reset = () => setForm(emptyCreatePayload());

  const toggleCycle = (c: PlanBillingCycle) =>
    setForm((f) => ({ ...f, supportedBillingCycles: f.supportedBillingCycles.includes(c) ? f.supportedBillingCycles.filter((x) => x !== c) : [...f.supportedBillingCycles, c] }));

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Create plan</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <FormField label="Code" htmlFor="plan-code" required hint="lowercase-hyphenated">
            <Input id="plan-code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          </FormField>
          <FormField label="Name" htmlFor="plan-name" required>
            <Input id="plan-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Tier" htmlFor="plan-tier" required>
            <Input id="plan-tier" value={form.tier} onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value }))} />
          </FormField>
          <FormField label="Type" htmlFor="plan-type" required>
            <Select id="plan-type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as PlanType }))} options={PLAN_TYPES.map((t) => ({ value: t, label: t }))} />
          </FormField>
          <FormField label="Tier rank" htmlFor="plan-tier-rank">
            <Input id="plan-tier-rank" type="number" value={form.tierRank ?? ''} onChange={(e) => setForm((f) => ({ ...f, tierRank: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <div className="col-span-2">
            <FormField label="Description" htmlFor="plan-description">
              <Input id="plan-description" value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </FormField>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Supported billing cycles</p>
          <div className="flex flex-wrap gap-3">
            {BILLING_CYCLES.map((c) => (
              <label key={c} className="flex items-center gap-1.5 text-sm text-foreground">
                <Checkbox checked={form.supportedBillingCycles.includes(c)} onChange={() => toggleCycle(c)} />
                {c}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Available countries (comma-separated, empty = all)" htmlFor="plan-countries">
            <Input id="plan-countries" value={(form.availableCountries ?? []).join(', ')} onChange={(e) => setForm((f) => ({ ...f, availableCountries: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))} />
          </FormField>
          <FormField label="Available regions (comma-separated, empty = all)" htmlFor="plan-regions">
            <Input id="plan-regions" value={(form.availableRegions ?? []).join(', ')} onChange={(e) => setForm((f) => ({ ...f, availableRegions: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))} />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => create.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.code || !form.name || !form.tier || form.supportedBillingCycles.length === 0 || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create draft plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlanDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: plan, isLoading } = usePlan(id ?? undefined);
  const publish = usePublishPlan(id ?? '');
  const deprecate = useDeprecatePlan(id ?? '');
  const archive = useArchivePlan(id ?? '');
  const restore = useRestorePlan(id ?? '');
  const createVersion = useCreatePlanVersion(plan?.code ?? '');
  const [reasonAction, setReasonAction] = useState<'deprecate' | 'archive' | 'newVersion' | null>(null);

  const actions: ActionMenuItem[] = [];
  if (plan) {
    if (plan.status === 'DRAFT') actions.push({ label: 'Publish', onSelect: () => publish.mutate({}) });
    if (plan.status === 'PUBLISHED') actions.push({ label: 'Deprecate', onSelect: () => setReasonAction('deprecate') });
    if (plan.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => setReasonAction('archive'), destructive: true, separatorBefore: true });
    if (plan.status === 'ARCHIVED' || plan.status === 'DEPRECATED') actions.push({ label: 'Restore', onSelect: () => restore.mutate() });
    actions.push({ label: 'Create new version', onSelect: () => setReasonAction('newVersion'), separatorBefore: true });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{plan ? `${plan.name} (v${plan.version})` : 'Plan'}</span>
            {plan && <div className="flex items-center gap-2"><StatusBadge status={plan.status} /><ActionMenu items={actions} /></div>}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !plan ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="entitlements">Entitlements</TabsTrigger>
              <TabsTrigger value="limits">Limits</TabsTrigger>
              <TabsTrigger value="versions">Versions</TabsTrigger>
              <TabsTrigger value="compatibility">Compatibility</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <PlanOverviewTab plan={plan} />
            </TabsContent>
            <TabsContent value="entitlements">
              <PlanEntitlementsTab entitlements={plan.entitlements} />
            </TabsContent>
            <TabsContent value="limits">
              <PlanLimitsTab limits={plan.limits} />
            </TabsContent>
            <TabsContent value="versions">
              <PlanVersionsTab code={plan.code} currentVersion={plan.version} />
            </TabsContent>
            <TabsContent value="compatibility">
              <PlanCompatibilityTab code={plan.code} />
            </TabsContent>
            <TabsContent value="history">
              <PlanHistoryTab id={plan.id} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>

      <ReasonDialog
        open={reasonAction === 'deprecate'}
        onOpenChange={(o) => !o && setReasonAction(null)}
        title="Deprecate this plan"
        confirmLabel="Deprecate"
        variant="danger"
        pending={deprecate.isPending}
        onSubmit={(reason) => deprecate.mutate({ reason }, { onSuccess: () => setReasonAction(null) })}
      />
      <ReasonDialog
        open={reasonAction === 'archive'}
        onOpenChange={(o) => !o && setReasonAction(null)}
        title="Archive this plan"
        confirmLabel="Archive"
        variant="danger"
        pending={archive.isPending}
        onSubmit={(reason) => archive.mutate({ reason }, { onSuccess: () => setReasonAction(null) })}
      />
      <ReasonDialog
        open={reasonAction === 'newVersion'}
        onOpenChange={(o) => !o && setReasonAction(null)}
        title="Create a new draft version"
        label="Reason (optional)"
        confirmLabel="Create version"
        pending={createVersion.isPending}
        onSubmit={(reason) => createVersion.mutate({ reason }, { onSuccess: () => setReasonAction(null) })}
      />
    </Dialog>
  );
}

function PlanOverviewTab({ plan }: { plan: Plan }) {
  const update = useUpdatePlan(plan.id);
  const [changeReason, setChangeReason] = useState('');
  const [tierRank, setTierRank] = useState(String(plan.tierRank));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <Field label="Code" value={plan.code} />
        <Field label="Tier" value={plan.tier} />
        <Field label="Type" value={plan.type} />
        <Field label="Billing cycles" value={plan.supportedBillingCycles.join(', ')} />
        <Field label="Effective at" value={formatDate(plan.effectiveAt)} />
        <Field label="Published at" value={plan.publishedAt ? formatDate(plan.publishedAt) : '—'} />
      </div>
      {plan.prices.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prices</p>
          <div className="flex flex-wrap gap-1.5">
            {plan.prices.map((p, i) => (
              <Badge key={i} variant="secondary">{formatCurrency(p.amount, p.currency)} / {p.billingCycle.toLowerCase()}</Badge>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <Field label="Countries" value={plan.availableCountries.length > 0 ? plan.availableCountries.join(', ') : 'All countries'} />
        <Field label="Regions" value={plan.availableRegions.length > 0 ? plan.availableRegions.join(', ') : 'All regions'} />
      </div>
      {plan.dependencies && (plan.dependencies.requiresPlanCodes?.length || plan.dependencies.incompatibleWithPlanCodes?.length) ? (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Requires plans" value={plan.dependencies.requiresPlanCodes?.join(', ') || '—'} />
          <Field label="Incompatible with" value={plan.dependencies.incompatibleWithPlanCodes?.join(', ') || '—'} />
        </div>
      ) : null}
      {plan.migrationRules && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Allowed upgrades" value={plan.migrationRules.allowedDirectUpgradeCodes?.join(', ') || '—'} />
          <Field label="Allowed downgrades" value={plan.migrationRules.allowedDirectDowngradeCodes?.join(', ') || '—'} />
        </div>
      )}
      {plan.status === 'DRAFT' && (
        <div className="flex items-end gap-2 border-t border-border pt-3">
          <FormField label="Tier rank" htmlFor="ov-tier-rank">
            <Input id="ov-tier-rank" type="number" value={tierRank} onChange={(e) => setTierRank(e.target.value)} className="w-28" />
          </FormField>
          <FormField label="Change reason" htmlFor="ov-change-reason" required>
            <Input id="ov-change-reason" value={changeReason} onChange={(e) => setChangeReason(e.target.value)} className="w-64" />
          </FormField>
          <Button
            size="sm"
            onClick={() => update.mutate({ tierRank: Number(tierRank), changeReason }, { onSuccess: () => setChangeReason('') })}
            disabled={!changeReason || update.isPending}
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
}

function PlanEntitlementsTab({ entitlements }: { entitlements: PlanEntitlement[] }) {
  if (entitlements.length === 0) return <EmptyState title="No entitlements configured" className="border-none py-8" />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Module</TableHead>
          <TableHead>Feature</TableHead>
          <TableHead>Capability</TableHead>
          <TableHead>Resource</TableHead>
          <TableHead>Included</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entitlements.map((e, i) => (
          <TableRow key={i}>
            <TableCell className="text-sm text-foreground">{e.module}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{e.feature}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{e.capability ?? '—'}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{e.resource ?? '—'}</TableCell>
            <TableCell>
              <StatusBadge status={e.included ? 'INCLUDED' : 'EXCLUDED'} tone={e.included ? 'success' : 'neutral'} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PlanLimitsTab({ limits }: { limits: PlanLimit[] }) {
  if (limits.length === 0) return <EmptyState title="No limits configured" className="border-none py-8" />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Resource</TableHead>
          <TableHead>Unit</TableHead>
          <TableHead>Soft limit</TableHead>
          <TableHead>Hard limit</TableHead>
          <TableHead>Grace threshold</TableHead>
          <TableHead>Overage rule</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {limits.map((l, i) => (
          <TableRow key={i}>
            <TableCell className="text-sm text-foreground">{l.resourceKey}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{l.unit ?? '—'}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{l.soft ?? '—'}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{l.hard ?? 'Unlimited'}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{l.graceThreshold ?? '—'}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{l.overageRule ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PlanVersionsTab({ code, currentVersion }: { code: string; currentVersion: number }) {
  const { data: versions, isLoading } = usePlanVersions(code);
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!versions || versions.length === 0) return <EmptyState title="No versions found" className="border-none py-8" />;
  return (
    <div className="space-y-2">
      {versions.map((v) => (
        <div key={v.id} className={`flex items-center justify-between rounded-[var(--radius)] border p-2.5 text-sm ${v.version === currentVersion ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
          <span className="text-foreground">v{v.version} {v.version === currentVersion && <Badge variant="secondary" className="ml-1.5 text-[10px]">viewing</Badge>}</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDate(v.effectiveAt)}</span>
            <StatusBadge status={v.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PlanCompatibilityTab({ code }: { code: string }) {
  const { data: allPlans } = usePlans({ limit: 100 });
  const [toCode, setToCode] = useState('');
  const { data: result, isLoading } = usePlanCompatibility(code, toCode || undefined);
  const { data: snapshot } = usePlanEntitlementSnapshot(code);

  return (
    <div className="space-y-4">
      <FormField label="Check compatibility with" htmlFor="compat-target">
        <Select
          id="compat-target"
          value={toCode}
          onChange={(e) => setToCode(e.target.value)}
          placeholder="Select a plan"
          options={(allPlans?.data ?? []).filter((p) => p.code !== code).map((p) => ({ value: p.code, label: `${p.name} (${p.code})` }))}
        />
      </FormField>
      {toCode && (isLoading ? <Skeleton className="h-12 w-full" /> : result && (
        <div className={`rounded-[var(--radius)] border p-3 text-sm ${result.compatible ? 'border-success/20 bg-success/5' : 'border-danger/20 bg-danger/5'}`}>
          <p className={result.compatible ? 'text-success' : 'text-danger'}>{result.compatible ? 'Compatible' : 'Not compatible'} ({result.direction})</p>
          {result.reason && <p className="mt-1 text-xs text-muted-foreground">{result.reason}</p>}
        </div>
      ))}
      {snapshot && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Effective entitlement snapshot</p>
          <p className="text-xs text-muted-foreground">{Object.keys(snapshot.entitlementsByKey).length} entitlement(s) · {Object.keys(snapshot.limitsByKey).length} limit(s) · effective {formatDate(snapshot.effectiveAt)}</p>
        </div>
      )}
    </div>
  );
}

function PlanHistoryTab({ id }: { id: string }) {
  const { data: history, isLoading } = usePlanHistory(id);
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!history || history.length === 0) return <EmptyState title="No history yet" className="border-none py-8" />;
  return (
    <ul className="space-y-2">
      {history.map((h) => (
        <li key={h.id} className="rounded-[var(--radius)] border border-border p-2.5 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{h.changeType}</span>
            <span className="text-xs text-muted-foreground">{h.fromStatus ?? '—'} → {h.toStatus}</span>
          </div>
          {h.reason && <p className="mt-1 text-xs text-muted-foreground">{h.reason}</p>}
          <p className="mt-1 text-xs text-muted-foreground">{formatDate(h.createdAt)}</p>
        </li>
      ))}
    </ul>
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
