'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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
import { SecretRevealDialog } from '@/components/developer/secret-reveal-dialog';
import {
  useActivateLicense,
  useCreateLicense,
  useIssueLicense,
  useLicense,
  useLicenseFeature,
  useLicenseHistory,
  useLicenseLimit,
  useLicenses,
  useReactivateLicense,
  useRefreshLicenseEntitlements,
  useRenewLicense,
  useRevokeLicense,
  useRotateLicenseKey,
  useSuspendLicense,
  useTransferLicense,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { CreateLicensePayload, LicenseScopeType, LicenseStatus, LicenseType } from '@/types';
import { PlatformAdminGuard } from '@/components/auth/platform-admin-guard';

const SCOPE_TYPES: LicenseScopeType[] = ['WORKSPACE', 'ORGANIZATION', 'USER', 'ENVIRONMENT', 'DEPLOYMENT'];
const LICENSE_TYPES: LicenseType[] = ['TRIAL', 'STANDARD', 'ENTERPRISE', 'INTERNAL', 'OEM'];
const LICENSE_STATUSES: LicenseStatus[] = ['PENDING', 'ISSUED', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED'];

export default function LicensesPage() {
  return (
    <PlatformAdminGuard>
      <LicensesPageContent />
    </PlatformAdminGuard>
  );
}

function LicensesPageContent() {
  const [scopeType, setScopeType] = useState<LicenseScopeType | ''>('');
  const [type, setType] = useState<LicenseType | ''>('');
  const [status, setStatus] = useState<LicenseStatus | ''>('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useLicenses({
    scopeType: scopeType || undefined,
    type: type || undefined,
    status: status || undefined,
    page,
    limit: 20,
  });

  return (
    <div>
      <PageHeader title="Licenses" description="License issuance, activation, entitlements and lifecycle across trial, standard, enterprise, custom and internal licenses." />

      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!scopeType || !!type || !!status} onClearFilters={() => { setScopeType(''); setType(''); setStatus(''); setPage(1); }}>
          <Select value={scopeType} onChange={(e) => { setScopeType(e.target.value as LicenseScopeType | ''); setPage(1); }} placeholder="All scopes" options={SCOPE_TYPES.map((s) => ({ value: s, label: s }))} className="h-9 w-36" />
          <Select value={type} onChange={(e) => { setType(e.target.value as LicenseType | ''); setPage(1); }} placeholder="All types" options={LICENSE_TYPES.map((t) => ({ value: t, label: t }))} className="h-9 w-36" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as LicenseStatus | ''); setPage(1); }} placeholder="All statuses" options={LICENSE_STATUSES.map((s) => ({ value: s, label: s }))} className="h-9 w-36" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create license
        </Button>
      </div>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load licenses." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No licenses yet" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Activations</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((l) => (
                <TableRow key={l.id} clickable onClick={() => setSelectedId(l.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{l.planKey}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.scopeType} ({l.scopeKey})</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.activationCount}{l.maxActivations != null ? ` / ${l.maxActivations}` : ''}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.expiresAt ? formatDate(l.expiresAt) : 'No expiry'}</TableCell>
                  <TableCell>
                    <StatusBadge status={l.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <CreateLicenseDialog open={createOpen} onOpenChange={setCreateOpen} />
      <LicenseDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function emptyLicenseForm(): CreateLicensePayload {
  return { scopeType: 'WORKSPACE', type: 'STANDARD', planKey: '' };
}

function CreateLicenseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateLicense();
  const [form, setForm] = useState<CreateLicensePayload>(emptyLicenseForm());
  const reset = () => setForm(emptyLicenseForm());

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Create license</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <FormField label="Scope type" htmlFor="lic-scope" required>
            <Select id="lic-scope" value={form.scopeType} onChange={(e) => setForm((f) => ({ ...f, scopeType: e.target.value as LicenseScopeType }))} options={SCOPE_TYPES.map((s) => ({ value: s, label: s }))} />
          </FormField>
          <FormField label="Type" htmlFor="lic-type" required>
            <Select id="lic-type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as LicenseType }))} options={LICENSE_TYPES.map((t) => ({ value: t, label: t }))} />
          </FormField>
          <FormField label="Plan key" htmlFor="lic-plan" required>
            <Input id="lic-plan" value={form.planKey} onChange={(e) => setForm((f) => ({ ...f, planKey: e.target.value }))} />
          </FormField>
          <FormField label="Max activations (optional)" htmlFor="lic-max-act">
            <Input id="lic-max-act" type="number" value={form.maxActivations ?? ''} onChange={(e) => setForm((f) => ({ ...f, maxActivations: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <FormField label="Expires at (optional)" htmlFor="lic-expires">
            <Input id="lic-expires" type="date" value={form.expiresAt ?? ''} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value || undefined }))} />
          </FormField>
          <FormField label="Grace period days (optional)" htmlFor="lic-grace">
            <Input id="lic-grace" type="number" value={form.gracePeriodDays ?? ''} onChange={(e) => setForm((f) => ({ ...f, gracePeriodDays: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <div className="col-span-2 sm:col-span-3">
            <FormField label="External reference (optional)" htmlFor="lic-ext-ref">
              <Input id="lic-ext-ref" value={form.externalReference ?? ''} onChange={(e) => setForm((f) => ({ ...f, externalReference: e.target.value }))} />
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => create.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })} disabled={!form.planKey || create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LicenseDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: license, isLoading } = useLicense(id ?? undefined);
  const { data: history } = useLicenseHistory(id ?? undefined);
  const issue = useIssueLicense(id ?? '');
  const activate = useActivateLicense(id ?? '');
  const suspend = useSuspendLicense(id ?? '');
  const reactivate = useReactivateLicense(id ?? '');
  const revoke = useRevokeLicense(id ?? '');
  const rotateKey = useRotateLicenseKey(id ?? '');
  const refreshEntitlements = useRefreshLicenseEntitlements(id ?? '');
  const renew = useRenewLicense(id ?? '');
  const transfer = useTransferLicense(id ?? '');
  const [reasonAction, setReasonAction] = useState<'suspend' | 'revoke' | null>(null);
  const [renewOpen, setRenewOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [featureKey, setFeatureKey] = useState('');
  const [resourceKey, setResourceKey] = useState('');
  const { data: featureCheck } = useLicenseFeature(id ?? undefined, featureKey || undefined);
  const { data: limitCheck } = useLicenseLimit(id ?? undefined, resourceKey || undefined);

  const actions: ActionMenuItem[] = [];
  if (license) {
    if (license.status === 'PENDING') actions.push({ label: 'Issue', onSelect: () => issue.mutate(undefined, { onSuccess: (r) => setRevealedToken(r.token) }) });
    if (license.status === 'ISSUED') actions.push({ label: 'Activate', onSelect: () => activate.mutate({}) });
    if (license.status === 'ACTIVE') actions.push({ label: 'Suspend', onSelect: () => setReasonAction('suspend') });
    if (license.status === 'SUSPENDED') actions.push({ label: 'Reactivate', onSelect: () => reactivate.mutate() });
    actions.push({ label: 'Renew', onSelect: () => setRenewOpen(true), separatorBefore: true });
    actions.push({ label: 'Transfer', onSelect: () => setTransferOpen(true) });
    actions.push({ label: 'Rotate signing key', onSelect: () => rotateKey.mutate(undefined, { onSuccess: (r) => setRevealedToken(r.token) }) });
    actions.push({ label: 'Refresh entitlements', onSelect: () => refreshEntitlements.mutate() });
    if (license.status !== 'REVOKED') actions.push({ label: 'Revoke', onSelect: () => setReasonAction('revoke'), destructive: true, separatorBefore: true });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{license?.planKey ?? 'License'}</span>
            {license && <div className="flex items-center gap-2"><StatusBadge status={license.status} /><ActionMenu items={actions} /></div>}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !license ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Scope" value={`${license.scopeType} (${license.scopeKey})`} />
              <Field label="Type" value={license.type} />
              <Field label="Subscription" value={license.subscriptionId ?? '—'} />
              <Field label="Activations" value={`${license.activationCount}${license.maxActivations != null ? ` / ${license.maxActivations}` : ' (unlimited)'}`} />
              <Field label="Issued" value={license.issuedAt ? formatDate(license.issuedAt) : '—'} />
              <Field label="Activated" value={license.activatedAt ? formatDate(license.activatedAt) : '—'} />
              <Field label="Expires" value={license.expiresAt ? formatDate(license.expiresAt) : 'No expiry'} />
              <Field label="Grace period" value={`${license.gracePeriodDays} day(s)`} />
              <Field label="Last validated" value={license.lastValidatedAt ? formatDate(license.lastValidatedAt) : '—'} />
              <Field label="External reference" value={license.externalReference ?? '—'} />
              <Field label="License key ID" value={license.licenseKeyId} />
            </div>

            {license.featureFlagKeys.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linked feature flags</p>
                <div className="flex flex-wrap gap-1.5">
                  {license.featureFlagKeys.map((k) => <Badge key={k} variant="secondary" className="text-[10px]">{k}</Badge>)}
                </div>
              </div>
            )}

            <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
              <div className="flex items-end gap-2">
                <FormField label="Check feature key" htmlFor="ld-feature">
                  <Input id="ld-feature" value={featureKey} onChange={(e) => setFeatureKey(e.target.value)} className="w-40" />
                </FormField>
                {featureCheck && <StatusBadge status={featureCheck.enabled ? 'ENABLED' : 'DISABLED'} tone={featureCheck.enabled ? 'success' : 'neutral'} />}
              </div>
              <div className="flex items-end gap-2">
                <FormField label="Check resource limit" htmlFor="ld-resource">
                  <Input id="ld-resource" value={resourceKey} onChange={(e) => setResourceKey(e.target.value)} className="w-40" />
                </FormField>
                {limitCheck && <span className="text-sm text-foreground">{JSON.stringify(limitCheck.value)}</span>}
              </div>
            </div>

            {history && history.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</p>
                <ul className="space-y-1">
                  {history.map((h) => (
                    <li key={h.id} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{h.changeType}</span> · {h.fromStatus ?? '—'} → {h.toStatus ?? '—'} · {formatDate(h.createdAt)}
                      {h.reason && ` — ${h.reason}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>

      <ReasonDialog open={reasonAction === 'suspend'} onOpenChange={(o) => !o && setReasonAction(null)} title="Suspend this license" variant="danger" pending={suspend.isPending} onSubmit={(reason) => suspend.mutate({ reason }, { onSuccess: () => setReasonAction(null) })} />
      <ReasonDialog open={reasonAction === 'revoke'} onOpenChange={(o) => !o && setReasonAction(null)} title="Revoke this license" confirmLabel="Revoke" variant="danger" pending={revoke.isPending} onSubmit={(reason) => revoke.mutate({ reason }, { onSuccess: () => setReasonAction(null) })} />

      <RenewLicenseDialog open={renewOpen} onOpenChange={setRenewOpen} pending={renew.isPending} onSubmit={(payload) => renew.mutate(payload, { onSuccess: () => setRenewOpen(false) })} />
      <TransferLicenseDialog open={transferOpen} onOpenChange={setTransferOpen} pending={transfer.isPending} onSubmit={(payload) => transfer.mutate(payload, { onSuccess: () => setTransferOpen(false) })} />

      <SecretRevealDialog title="License signing token" label="Signed license token" secret={revealedToken} onClose={() => setRevealedToken(null)} />
    </Dialog>
  );
}

function RenewLicenseDialog({ open, onOpenChange, onSubmit, pending }: { open: boolean; onOpenChange: (o: boolean) => void; onSubmit: (payload: { expiresAt: string; gracePeriodDays?: number }) => void; pending: boolean }) {
  const [expiresAt, setExpiresAt] = useState('');
  const [gracePeriodDays, setGracePeriodDays] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Renew license</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="New expiry date" htmlFor="ren-expires" required>
            <Input id="ren-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </FormField>
          <FormField label="Grace period days (optional)" htmlFor="ren-grace">
            <Input id="ren-grace" type="number" value={gracePeriodDays} onChange={(e) => setGracePeriodDays(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSubmit({ expiresAt, gracePeriodDays: gracePeriodDays ? Number(gracePeriodDays) : undefined })} disabled={!expiresAt || pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Renew
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferLicenseDialog({ open, onOpenChange, onSubmit, pending }: { open: boolean; onOpenChange: (o: boolean) => void; onSubmit: (payload: { scopeType: LicenseScopeType; targetWorkspaceId?: string; reason: string }) => void; pending: boolean }) {
  const [scopeType, setScopeType] = useState<LicenseScopeType>('WORKSPACE');
  const [targetWorkspaceId, setTargetWorkspaceId] = useState('');
  const [reason, setReason] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Transfer license</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="New scope type" htmlFor="tr-scope" required>
            <Select id="tr-scope" value={scopeType} onChange={(e) => setScopeType(e.target.value as LicenseScopeType)} options={SCOPE_TYPES.map((s) => ({ value: s, label: s }))} />
          </FormField>
          <FormField label="Target workspace ID" htmlFor="tr-workspace">
            <Input id="tr-workspace" value={targetWorkspaceId} onChange={(e) => setTargetWorkspaceId(e.target.value)} />
          </FormField>
          <FormField label="Reason" htmlFor="tr-reason" required>
            <Input id="tr-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSubmit({ scopeType, targetWorkspaceId: targetWorkspaceId || undefined, reason })} disabled={!reason || pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Transfer
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
