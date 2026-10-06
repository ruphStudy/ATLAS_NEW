'use client';

import { useState } from 'react';
import { Loader2, Plus, Search } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import {
  useArchiveQuotaPolicy,
  useCheckQuota,
  useCreateQuotaOverride,
  useCreateQuotaPolicy,
  useDisableQuotaPolicy,
  useEnableQuotaPolicy,
  useQuotaOverrides,
  useQuotaPolicies,
  useQuotaPolicy,
  useQuotaPolicyHistory,
  useRevokeQuotaOverride,
  useUpdateQuotaPolicy,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { CreateQuotaPolicyPayload, QuotaPolicyStatus, QuotaResetSchedule, QuotaScopeType } from '@/types';
import { PlatformAdminGuard } from '@/components/auth/platform-admin-guard';

const SCOPE_TYPES: QuotaScopeType[] = ['WORKSPACE', 'ORGANIZATION', 'USER', 'PLAN'];
const POLICY_STATUSES: QuotaPolicyStatus[] = ['ACTIVE', 'DISABLED', 'ARCHIVED'];
const RESET_SCHEDULES: QuotaResetSchedule[] = ['NEVER', 'DAILY', 'MONTHLY', 'ANNUAL', 'CUSTOM', 'BILLING_PERIOD'];

export default function QuotasPage() {
  return (
    <PlatformAdminGuard>
      <QuotasPageContent />
    </PlatformAdminGuard>
  );
}

function QuotasPageContent() {
  return (
    <div>
      <PageHeader title="Quotas" description="Resource quota policies, admin overrides and live quota checks." />
      <Tabs defaultValue="policies">
        <TabsList>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="overrides">Overrides</TabsTrigger>
        </TabsList>
        <TabsContent value="policies">
          <PoliciesTab />
        </TabsContent>
        <TabsContent value="overrides">
          <OverridesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PoliciesTab() {
  const [scopeType, setScopeType] = useState<QuotaScopeType | ''>('');
  const [status, setStatus] = useState<QuotaPolicyStatus | ''>('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuotaPolicies({ scopeType: scopeType || undefined, status: status || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!scopeType || !!status} onClearFilters={() => { setScopeType(''); setStatus(''); setPage(1); }}>
          <Select value={scopeType} onChange={(e) => { setScopeType(e.target.value as QuotaScopeType | ''); setPage(1); }} placeholder="All scopes" options={SCOPE_TYPES.map((s) => ({ value: s, label: s }))} className="h-9 w-36" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as QuotaPolicyStatus | ''); setPage(1); }} placeholder="All statuses" options={POLICY_STATUSES.map((s) => ({ value: s, label: s }))} className="h-9 w-36" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create policy
        </Button>
      </div>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load quota policies." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No quota policies yet" icon={Search} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Soft / Hard limit</TableHead>
                <TableHead>Overage</TableHead>
                <TableHead>Reset</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((p) => (
                <TableRow key={p.id} clickable onClick={() => setSelectedId(p.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{p.resourceKey}{p.feature ? <span className="text-xs text-muted-foreground"> · {p.feature}</span> : null}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.scopeType}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.planKey ?? 'All plans'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.softLimit ?? '—'} / {p.hardLimit ?? 'Unlimited'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.overageAllowed ? `Allowed (${p.overageLimit ?? '∞'})` : 'Blocked'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.resetSchedule}</TableCell>
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

      <CreatePolicyDialog open={createOpen} onOpenChange={setCreateOpen} />
      <PolicyDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function emptyPolicyForm(): CreateQuotaPolicyPayload {
  return { scopeType: 'WORKSPACE', resourceKey: '', resetSchedule: 'MONTHLY' };
}

function CreatePolicyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateQuotaPolicy();
  const [form, setForm] = useState<CreateQuotaPolicyPayload>(emptyPolicyForm());
  const reset = () => setForm(emptyPolicyForm());

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Create quota policy</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <FormField label="Scope type" htmlFor="qp-scope" required>
            <Select id="qp-scope" value={form.scopeType} onChange={(e) => setForm((f) => ({ ...f, scopeType: e.target.value as QuotaScopeType }))} options={SCOPE_TYPES.map((s) => ({ value: s, label: s }))} />
          </FormField>
          <FormField label="Resource key" htmlFor="qp-resource" required>
            <Input id="qp-resource" value={form.resourceKey} onChange={(e) => setForm((f) => ({ ...f, resourceKey: e.target.value }))} />
          </FormField>
          <FormField label="Feature (optional)" htmlFor="qp-feature">
            <Input id="qp-feature" value={form.feature ?? ''} onChange={(e) => setForm((f) => ({ ...f, feature: e.target.value }))} />
          </FormField>
          <FormField label="Plan key (optional)" htmlFor="qp-plan">
            <Input id="qp-plan" value={form.planKey ?? ''} onChange={(e) => setForm((f) => ({ ...f, planKey: e.target.value }))} />
          </FormField>
          <FormField label="Unit (optional)" htmlFor="qp-unit">
            <Input id="qp-unit" value={form.unit ?? ''} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
          </FormField>
          <FormField label="Reset schedule" htmlFor="qp-reset">
            <Select id="qp-reset" value={form.resetSchedule} onChange={(e) => setForm((f) => ({ ...f, resetSchedule: e.target.value as QuotaResetSchedule }))} options={RESET_SCHEDULES.map((s) => ({ value: s, label: s }))} />
          </FormField>
          <FormField label="Soft limit" htmlFor="qp-soft">
            <Input id="qp-soft" type="number" value={form.softLimit ?? ''} onChange={(e) => setForm((f) => ({ ...f, softLimit: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <FormField label="Hard limit" htmlFor="qp-hard">
            <Input id="qp-hard" type="number" value={form.hardLimit ?? ''} onChange={(e) => setForm((f) => ({ ...f, hardLimit: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <FormField label="Grace threshold" htmlFor="qp-grace">
            <Input id="qp-grace" type="number" value={form.graceThreshold ?? ''} onChange={(e) => setForm((f) => ({ ...f, graceThreshold: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <label className="col-span-2 flex items-center gap-2 text-sm text-foreground sm:col-span-3">
            <Checkbox checked={!!form.overageAllowed} onChange={(e) => setForm((f) => ({ ...f, overageAllowed: e.target.checked }))} />
            Allow overage
          </label>
          {form.overageAllowed && (
            <FormField label="Overage limit" htmlFor="qp-overage-limit">
              <Input id="qp-overage-limit" type="number" value={form.overageLimit ?? ''} onChange={(e) => setForm((f) => ({ ...f, overageLimit: e.target.value ? Number(e.target.value) : undefined }))} />
            </FormField>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => create.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })} disabled={!form.resourceKey || create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PolicyDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: policy, isLoading } = useQuotaPolicy(id ?? undefined);
  const { data: history } = useQuotaPolicyHistory(id ?? undefined);
  const enable = useEnableQuotaPolicy(id ?? '');
  const disable = useDisableQuotaPolicy(id ?? '');
  const archive = useArchiveQuotaPolicy(id ?? '');
  const update = useUpdateQuotaPolicy(id ?? '');
  const createOverride = useCreateQuotaOverride(id ?? '');
  const checkQuota = useCheckQuota();

  const [hardLimit, setHardLimit] = useState('');
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [additionalHardLimit, setAdditionalHardLimit] = useState('');
  const [overrideExpiresAt, setOverrideExpiresAt] = useState('');

  const actions: ActionMenuItem[] = [];
  if (policy) {
    if (policy.status !== 'ACTIVE') actions.push({ label: 'Enable', onSelect: () => enable.mutate() });
    if (policy.status === 'ACTIVE') actions.push({ label: 'Disable', onSelect: () => disable.mutate() });
    if (policy.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => archive.mutate(), destructive: true, separatorBefore: true });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{policy?.resourceKey ?? 'Quota policy'}</span>
            {policy && <div className="flex items-center gap-2"><StatusBadge status={policy.status} /><ActionMenu items={actions} /></div>}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !policy ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Scope" value={`${policy.scopeType} (${policy.scopeKey})`} />
              <Field label="Feature" value={policy.feature || '—'} />
              <Field label="Plan" value={policy.planKey ?? 'All plans'} />
              <Field label="Unit" value={policy.unit ?? '—'} />
              <Field label="Soft limit" value={policy.softLimit != null ? String(policy.softLimit) : '—'} />
              <Field label="Hard limit" value={policy.hardLimit != null ? String(policy.hardLimit) : 'Unlimited'} />
              <Field label="Grace threshold" value={policy.graceThreshold != null ? String(policy.graceThreshold) : '—'} />
              <Field label="Overage" value={policy.overageAllowed ? `Allowed (${policy.overageLimit ?? 'unlimited'})` : 'Blocked'} />
              <Field label="Reset schedule" value={policy.resetSchedule} />
            </div>

            <div className="flex items-end gap-2 border-t border-border pt-3">
              <FormField label="Update hard limit" htmlFor="pd-hard">
                <Input id="pd-hard" type="number" value={hardLimit} onChange={(e) => setHardLimit(e.target.value)} className="w-40" />
              </FormField>
              <Button size="sm" onClick={() => update.mutate({ hardLimit: Number(hardLimit) }, { onSuccess: () => setHardLimit('') })} disabled={!hardLimit || update.isPending}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => checkQuota.mutate({ resourceKey: policy.resourceKey, feature: policy.feature || undefined })} disabled={checkQuota.isPending}>
                {checkQuota.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Check current usage
              </Button>
              <Button size="sm" variant="outline" onClick={() => setOverrideOpen(true)}>
                Grant override
              </Button>
            </div>

            {checkQuota.data && (
              <div className={`rounded-[var(--radius)] border p-3 text-sm ${checkQuota.data.allowed ? 'border-success/20 bg-success/5' : 'border-danger/20 bg-danger/5'}`}>
                <div className="flex items-center gap-2">
                  <StatusBadge status={checkQuota.data.state} tone={checkQuota.data.state === 'OK' ? 'success' : checkQuota.data.state === 'WARNING' || checkQuota.data.state === 'GRACE' ? 'warning' : 'danger'} />
                  <span className="text-foreground">{checkQuota.data.consumed} consumed{checkQuota.data.limit != null ? ` / ${checkQuota.data.limit}` : ''}</span>
                </div>
                {checkQuota.data.remaining != null && <p className="mt-1 text-xs text-muted-foreground">{checkQuota.data.remaining} remaining · {checkQuota.data.overage} overage</p>}
              </div>
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

      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Grant quota override</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Additional hard limit" htmlFor="ov-additional">
              <Input id="ov-additional" type="number" value={additionalHardLimit} onChange={(e) => setAdditionalHardLimit(e.target.value)} />
            </FormField>
            <FormField label="Expires at (optional)" htmlFor="ov-expires">
              <Input id="ov-expires" type="date" value={overrideExpiresAt} onChange={(e) => setOverrideExpiresAt(e.target.value)} />
            </FormField>
          </div>
          <ReasonDialogInline
            onSubmit={(reason) =>
              createOverride.mutate(
                { reason, additionalHardLimit: additionalHardLimit ? Number(additionalHardLimit) : undefined, expiresAt: overrideExpiresAt || undefined },
                { onSuccess: () => { setOverrideOpen(false); setAdditionalHardLimit(''); setOverrideExpiresAt(''); } },
              )
            }
            pending={createOverride.isPending}
          />
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function ReasonDialogInline({ onSubmit, pending }: { onSubmit: (reason: string) => void; pending: boolean }) {
  const [reason, setReason] = useState('');
  return (
    <>
      <FormField label="Reason" htmlFor="ov-reason" required>
        <Input id="ov-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      </FormField>
      <DialogFooter>
        <Button onClick={() => onSubmit(reason)} disabled={!reason || pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Grant override
        </Button>
      </DialogFooter>
    </>
  );
}

function OverridesTab() {
  const [status, setStatus] = useState<'ACTIVE' | 'EXPIRED' | 'REVOKED' | ''>('');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useQuotaOverrides({ status: status || undefined, page, limit: 20 });

  return (
    <div>
      <FilterBar hasActiveFilters={!!status} onClearFilters={() => { setStatus(''); setPage(1); }} className="mb-4">
        <Select value={status} onChange={(e) => { setStatus(e.target.value as 'ACTIVE' | 'EXPIRED' | 'REVOKED' | ''); setPage(1); }} placeholder="All statuses" options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'EXPIRED', label: 'Expired' }, { value: 'REVOKED', label: 'Revoked' }]} className="h-9 w-40" />
      </FilterBar>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load quota overrides." />
      ) : isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No quota overrides" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Additional limit</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((o) => (
                <OverrideRow key={o.id} override={o} />
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}
    </div>
  );
}

function OverrideRow({ override }: { override: { id: string; resourceKey: string; scopeKey: string; additionalHardLimit: number | null; reason: string; expiresAt: string | null; status: string } }) {
  const revoke = useRevokeQuotaOverride(override.id);
  return (
    <TableRow>
      <TableCell className="text-sm font-medium text-foreground">{override.resourceKey}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{override.scopeKey}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{override.additionalHardLimit ?? '—'}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{override.reason}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{override.expiresAt ? formatDate(override.expiresAt) : 'No expiry'}</TableCell>
      <TableCell>
        <StatusBadge status={override.status} />
      </TableCell>
      <TableCell className="text-right">
        {override.status === 'ACTIVE' && (
          <Button variant="ghost" size="sm" onClick={() => revoke.mutate({})} disabled={revoke.isPending}>
            {revoke.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Revoke
          </Button>
        )}
      </TableCell>
    </TableRow>
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
