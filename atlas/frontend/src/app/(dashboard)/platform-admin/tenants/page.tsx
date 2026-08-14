'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import { SecretRevealDialog } from '@/components/developer/secret-reveal-dialog';
import {
  useActivateTenant,
  useAddTenantNote,
  useAssignTenantPlan,
  useOverrideTenantFeature,
  useOverrideTenantQuota,
  useOverrideTenantSubscription,
  useReactivateTenant,
  useStartImpersonation,
  useSuspendTenant,
  useTenantAdminProfile,
  useTenantHealthScore,
  useTenantLicenses,
  useTenantNotes,
  useTenantOverview,
  useTenantUsage,
  useTenants,
  useTerminateTenant,
  useUpdateTenantFlags,
  useUpdateTenantSupportStatus,
} from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { AdminPlanChangeEffective, AdminSubscriptionStatus, PlanChangeDirection, SupportStatus, TenantRiskLevel } from '@/types';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'TERMINATED', label: 'Terminated' },
];

const RISK_TONE: Record<TenantRiskLevel, 'success' | 'warning' | 'danger'> = {
  HEALTHY: 'success',
  AT_RISK: 'warning',
  CRITICAL: 'danger',
};

export default function PlatformTenantsPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useTenants({ status: status || undefined, search: search || undefined, page, limit });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <PageHeader title="Tenants" description="Search, view and administer tenants across the platform. Every action here is cross-tenant and fully audited." />

      <FilterBar
        hasActiveFilters={!!status || !!search}
        onClearFilters={() => { setStatus(''); setSearch(''); setPage(1); }}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        className="mb-4"
      >
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-40" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load tenants." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No tenants found" description={search || status ? 'Try a different search or filter.' : 'No tenants have been created yet.'} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((t) => (
              <TableRow key={t.id} clickable onClick={() => setSelectedId(t.id)}>
                <TableCell className="text-sm font-medium text-foreground">{t.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.slug}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.plan ?? '—'}</TableCell>
                <TableCell>
                  <StatusBadge status={t.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={limit} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      )}

      <TenantDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
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

const LIFECYCLE_STATUS_OPTIONS: { value: AdminSubscriptionStatus; label: string }[] = [
  { value: 'TRIAL', label: 'Trial' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAST_DUE', label: 'Past due' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'EXPIRED', label: 'Expired' },
];

const PLAN_DIRECTION_OPTIONS: { value: PlanChangeDirection; label: string }[] = [
  { value: 'UPGRADE', label: 'Upgrade' },
  { value: 'DOWNGRADE', label: 'Downgrade' },
  { value: 'LATERAL', label: 'Lateral' },
];

const PLAN_EFFECTIVE_OPTIONS: { value: AdminPlanChangeEffective; label: string }[] = [
  { value: 'IMMEDIATE', label: 'Immediate' },
  { value: 'PERIOD_END', label: 'At period end' },
];

const SUPPORT_STATUS_OPTIONS: { value: SupportStatus; label: string }[] = [
  { value: 'NONE', label: 'None' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ESCALATED', label: 'Escalated' },
  { value: 'RESOLVED', label: 'Resolved' },
];

function TenantDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: overview, isLoading } = useTenantOverview(id ?? undefined);
  const { data: healthScore } = useTenantHealthScore(id ?? undefined);
  const activate = useActivateTenant(id ?? '');
  const suspend = useSuspendTenant(id ?? '');
  const reactivate = useReactivateTenant(id ?? '');
  const terminate = useTerminateTenant(id ?? '');

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [impersonateOpen, setImpersonateOpen] = useState(false);

  const actions: ActionMenuItem[] = [];
  if (overview) {
    const status = overview.workspace.status;
    if (status !== 'ACTIVE') {
      actions.push({ label: 'Activate', onSelect: () => activate.mutate({}) });
    }
    if (status === 'SUSPENDED') {
      actions.push({ label: 'Reactivate', onSelect: () => reactivate.mutate({}) });
    }
    if (status !== 'SUSPENDED' && status !== 'TERMINATED') {
      actions.push({ label: 'Suspend', icon: AlertTriangle, onSelect: () => setSuspendOpen(true) });
    }
    actions.push({ label: 'Impersonate user', icon: ShieldAlert, onSelect: () => setImpersonateOpen(true), separatorBefore: true });
    if (status !== 'TERMINATED') {
      actions.push({ label: 'Terminate', onSelect: () => setTerminateOpen(true), destructive: true, separatorBefore: true });
    }
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{overview?.workspace.name ?? 'Tenant'}</span>
            {overview && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !overview ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="overrides">Overrides</TabsTrigger>
              <TabsTrigger value="notes">Notes & Flags</TabsTrigger>
              <TabsTrigger value="licenses">Licenses & Usage</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="mb-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <Field label="Workspace status" value={overview.workspace.status} />
                <Field label="Plan" value={overview.workspace.plan ?? '—'} />
                <Field label="Subscription status" value={overview.subscription?.status ?? '—'} />
                <Field label="Subscription plan key" value={overview.subscription?.planKey ?? '—'} />
                <Field label="Trial" value={overview.subscription?.isTrial ? 'Yes' : 'No'} />
                <Field label="Outstanding balance" value={overview.billing ? formatCurrency(overview.billing.outstandingBalance, 'USD') : '—'} />
                <Field label="Latest period status" value={overview.billing?.latestPeriodStatus ?? '—'} />
                <Field label="Recent payment failures" value={String(overview.recentPaymentFailures)} />
                <Field label="Quota violations" value={String(overview.quotaViolations)} />
                <Field label="Support status" value={overview.adminProfile?.supportStatus ?? 'NONE'} />
              </div>

              {overview.recentPaymentFailures > 0 && (
                <div className="mb-4 rounded-[var(--radius)] border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
                  {overview.recentPaymentFailures} recent payment failure(s) — billing/payment issue.
                </div>
              )}
              {overview.quotaViolations > 0 && (
                <div className="mb-4 rounded-[var(--radius)] border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
                  {overview.quotaViolations} quota violation(s) on this tenant.
                </div>
              )}

              {healthScore && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      Tenant health
                      <StatusBadge status={healthScore.riskLevel} tone={RISK_TONE[healthScore.riskLevel]} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-5">
                    <Field label="Health score" value={healthScore.healthScore.toFixed(0)} />
                    <Field label="Usage score" value={healthScore.usageScore.toFixed(0)} />
                    <Field label="Billing score" value={healthScore.billingScore.toFixed(0)} />
                    <Field label="Activity score" value={healthScore.activityScore.toFixed(0)} />
                    <Field label="Support score" value={healthScore.supportScore.toFixed(0)} />
                  </CardContent>
                </Card>
              )}

              <div className="mt-4">
                <SupportStatusEditor workspaceId={id as string} current={overview.adminProfile?.supportStatus ?? 'NONE'} />
              </div>
            </TabsContent>

            <TabsContent value="overrides">
              <OverridesTab workspaceId={id as string} />
            </TabsContent>

            <TabsContent value="notes">
              <NotesFlagsTab workspaceId={id as string} currentFlags={overview.adminProfile?.internalFlags ?? []} />
            </TabsContent>

            <TabsContent value="licenses">
              <LicensesUsageTab workspaceId={id as string} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>

      <ReasonDialog open={suspendOpen} onOpenChange={setSuspendOpen} title="Suspend this tenant" confirmLabel="Suspend" variant="danger" pending={suspend.isPending} onSubmit={(reason) => suspend.mutate({ reason }, { onSuccess: () => setSuspendOpen(false) })} />
      <ReasonDialog open={terminateOpen} onOpenChange={setTerminateOpen} title="Terminate this tenant" confirmLabel="Terminate" variant="danger" pending={terminate.isPending} onSubmit={(reason) => terminate.mutate({ reason }, { onSuccess: () => setTerminateOpen(false) })} />
      <ImpersonateDialog workspaceId={id} open={impersonateOpen} onOpenChange={setImpersonateOpen} />
    </Dialog>
  );
}

function SupportStatusEditor({ workspaceId, current }: { workspaceId: string; current: SupportStatus }) {
  const [value, setValue] = useState<SupportStatus>(current);
  const update = useUpdateTenantSupportStatus(workspaceId);

  return (
    <div className="flex items-end gap-2">
      <FormField label="Support status" htmlFor="support-status">
        <Select id="support-status" value={value} onChange={(e) => setValue(e.target.value as SupportStatus)} options={SUPPORT_STATUS_OPTIONS} className="h-9 w-40" />
      </FormField>
      <Button size="sm" onClick={() => update.mutate({ supportStatus: value })} disabled={value === current || update.isPending}>
        Save
      </Button>
    </div>
  );
}

function OverridesTab({ workspaceId }: { workspaceId: string }) {
  const assignPlan = useAssignTenantPlan(workspaceId);
  const overrideSub = useOverrideTenantSubscription(workspaceId);
  const overrideQuota = useOverrideTenantQuota(workspaceId);
  const overrideFeature = useOverrideTenantFeature(workspaceId);

  const [planKey, setPlanKey] = useState('');
  const [changeType, setChangeType] = useState<PlanChangeDirection>('UPGRADE');
  const [effective, setEffective] = useState<AdminPlanChangeEffective>('IMMEDIATE');
  const [planReason, setPlanReason] = useState('');

  const [subId, setSubId] = useState('');
  const [subStatus, setSubStatus] = useState<AdminSubscriptionStatus>('ACTIVE');
  const [subReason, setSubReason] = useState('');

  const [resourceKey, setResourceKey] = useState('');
  const [additionalLimit, setAdditionalLimit] = useState('');
  const [quotaExpiresAt, setQuotaExpiresAt] = useState('');
  const [quotaReason, setQuotaReason] = useState('');

  const [flagKey, setFlagKey] = useState('');
  const [flagEnabled, setFlagEnabled] = useState(true);
  const [flagReason, setFlagReason] = useState('');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Assign plan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <Input placeholder="Plan key" value={planKey} onChange={(e) => setPlanKey(e.target.value)} />
          <Select value={changeType} onChange={(e) => setChangeType(e.target.value as PlanChangeDirection)} options={PLAN_DIRECTION_OPTIONS} />
          <Select value={effective} onChange={(e) => setEffective(e.target.value as AdminPlanChangeEffective)} options={PLAN_EFFECTIVE_OPTIONS} />
          <Input placeholder="Reason" value={planReason} onChange={(e) => setPlanReason(e.target.value)} />
          <Button
            className="sm:col-span-4"
            onClick={() => assignPlan.mutate({ planKey, changeType, effective, reason: planReason }, { onSuccess: () => { setPlanKey(''); setPlanReason(''); } })}
            disabled={!planKey || !planReason || assignPlan.isPending}
          >
            {assignPlan.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Assign plan
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Override subscription status</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <Input placeholder="Subscription ID" value={subId} onChange={(e) => setSubId(e.target.value)} />
          <Select value={subStatus} onChange={(e) => setSubStatus(e.target.value as AdminSubscriptionStatus)} options={LIFECYCLE_STATUS_OPTIONS} />
          <Input placeholder="Reason" className="sm:col-span-2" value={subReason} onChange={(e) => setSubReason(e.target.value)} />
          <Button
            className="sm:col-span-4"
            onClick={() => overrideSub.mutate({ subscriptionId: subId, toStatus: subStatus, reason: subReason }, { onSuccess: () => { setSubId(''); setSubReason(''); } })}
            disabled={!subId || !subReason || overrideSub.isPending}
          >
            {overrideSub.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Override subscription
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Override quota</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <Input placeholder="Resource key" value={resourceKey} onChange={(e) => setResourceKey(e.target.value)} />
          <Input type="number" placeholder="Additional hard limit" value={additionalLimit} onChange={(e) => setAdditionalLimit(e.target.value)} />
          <Input type="date" placeholder="Expires at" value={quotaExpiresAt} onChange={(e) => setQuotaExpiresAt(e.target.value)} />
          <Input placeholder="Reason" value={quotaReason} onChange={(e) => setQuotaReason(e.target.value)} />
          <Button
            className="sm:col-span-4"
            onClick={() =>
              overrideQuota.mutate(
                { resourceKey, additionalHardLimit: additionalLimit ? Number(additionalLimit) : undefined, reason: quotaReason, expiresAt: quotaExpiresAt || undefined },
                { onSuccess: () => { setResourceKey(''); setAdditionalLimit(''); setQuotaReason(''); } },
              )
            }
            disabled={!resourceKey || !quotaReason || overrideQuota.isPending}
          >
            {overrideQuota.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Override quota
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Override feature flag</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <Input placeholder="Flag key" value={flagKey} onChange={(e) => setFlagKey(e.target.value)} />
          <Select value={flagEnabled ? 'true' : 'false'} onChange={(e) => setFlagEnabled(e.target.value === 'true')} options={[{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' }]} />
          <Input placeholder="Reason" className="sm:col-span-2" value={flagReason} onChange={(e) => setFlagReason(e.target.value)} />
          <Button
            className="sm:col-span-4"
            onClick={() => overrideFeature.mutate({ flagKey, enabled: flagEnabled, reason: flagReason }, { onSuccess: () => { setFlagKey(''); setFlagReason(''); } })}
            disabled={!flagKey || !flagReason || overrideFeature.isPending}
          >
            {overrideFeature.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Override feature
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function NotesFlagsTab({ workspaceId, currentFlags }: { workspaceId: string; currentFlags: string[] }) {
  const { data: notes } = useTenantNotes(workspaceId);
  const addNote = useAddTenantNote(workspaceId);
  const updateFlags = useUpdateTenantFlags(workspaceId);
  const [noteText, setNoteText] = useState('');
  const [flagsText, setFlagsText] = useState(currentFlags.join(', '));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <p className="mb-3 text-sm font-semibold text-foreground">Internal flags</p>
        <Textarea rows={2} value={flagsText} onChange={(e) => setFlagsText(e.target.value)} placeholder="Comma or newline separated" />
        <Button
          size="sm"
          className="mt-2"
          onClick={() => updateFlags.mutate({ internalFlags: flagsText.split(/[\n,]/).map((v) => v.trim()).filter(Boolean) })}
          disabled={updateFlags.isPending}
        >
          Save flags
        </Button>
      </div>
      <div>
        <p className="mb-3 text-sm font-semibold text-foreground">Admin notes</p>
        <div className="mb-3 flex gap-2">
          <Input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note…" className="flex-1" />
          <Button size="sm" onClick={() => addNote.mutate({ note: noteText }, { onSuccess: () => setNoteText('') })} disabled={!noteText || addNote.isPending}>
            Add
          </Button>
        </div>
        {!notes || notes.length === 0 ? (
          <EmptyState title="No notes yet" className="border-none py-6" />
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded-[var(--radius)] border border-border p-2 text-sm">
                <p className="text-foreground">{n.note}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(n.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LicensesUsageTab({ workspaceId }: { workspaceId: string }) {
  const { data: licenses, isLoading: loadingLicenses } = useTenantLicenses(workspaceId);
  const { data: usage, isLoading: loadingUsage } = useTenantUsage(workspaceId);

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Licenses</p>
        {loadingLicenses ? (
          <Skeleton className="h-24 w-full" />
        ) : !licenses || (Array.isArray(licenses) && licenses.length === 0) ? (
          <EmptyState title="No license data" className="border-none py-6" />
        ) : (
          <pre className="overflow-x-auto rounded-[var(--radius)] border border-border bg-secondary p-3 text-xs text-foreground">{JSON.stringify(licenses, null, 2)}</pre>
        )}
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Usage</p>
        {loadingUsage ? (
          <Skeleton className="h-24 w-full" />
        ) : !usage ? (
          <EmptyState title="No usage data" className="border-none py-6" />
        ) : (
          <pre className="overflow-x-auto rounded-[var(--radius)] border border-border bg-secondary p-3 text-xs text-foreground">{JSON.stringify(usage, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}

function ImpersonateDialog({ workspaceId, open, onOpenChange }: { workspaceId: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const start = useStartImpersonation(workspaceId ?? '');
  const [targetUserId, setTargetUserId] = useState('');
  const [reason, setReason] = useState('');
  const [revealToken, setRevealToken] = useState<string | null>(null);

  const reset = () => { setTargetUserId(''); setReason(''); };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <ShieldAlert className="h-4 w-4" />
              Impersonate tenant user
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-[var(--radius)] border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              This grants you access to act as a user in this tenant. The action is fully audited and visible in SaaS Audit → Impersonation Sessions.
            </div>
            <FormField label="Target user ID" htmlFor="imp-user" required>
              <Input id="imp-user" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} />
            </FormField>
            <FormField label="Reason" htmlFor="imp-reason" required>
              <Textarea id="imp-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                start.mutate(
                  { targetUserId, reason },
                  { onSuccess: (result) => { onOpenChange(false); reset(); setRevealToken(JSON.stringify({ sessionId: result.sessionId, accessToken: result.accessToken }, null, 2)); } },
                )
              }
              disabled={!targetUserId || !reason || start.isPending}
            >
              {start.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Start impersonation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SecretRevealDialog title="Impersonation session started" label="Session credentials" secret={revealToken} onClose={() => setRevealToken(null)} />
    </>
  );
}
