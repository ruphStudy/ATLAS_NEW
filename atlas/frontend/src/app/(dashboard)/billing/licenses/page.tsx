'use client';

import { useMemo, useState } from 'react';
import { Ban, Copy, Key, Plus, PlayCircle, RefreshCcw, RotateCw, Send, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  useActivateLicense,
  useConfirm,
  useCreateLicense,
  useIssueLicense,
  useLicense,
  useLicenseHistory,
  useLicenses,
  useReactivateLicense,
  useRenewLicense,
  useRevokeLicense,
  useRotateLicenseKey,
  useSuspendLicense,
  useToast,
  useTransferLicense,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { CreateLicensePayload, LicenseFilterParams, LicenseIssuedToken, LicenseScopeType, LicenseStatus, LicenseType } from '@/types';

const SCOPE_OPTIONS: { value: LicenseScopeType; label: string }[] = [
  { value: 'WORKSPACE', label: 'Workspace' },
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'USER', label: 'User' },
  { value: 'ENVIRONMENT', label: 'Environment' },
  { value: 'DEPLOYMENT', label: 'Deployment' },
];

const TYPE_OPTIONS: { value: LicenseType; label: string }[] = [
  { value: 'TRIAL', label: 'Trial' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
  { value: 'INTERNAL', label: 'Internal' },
  { value: 'OEM', label: 'OEM' },
];

const STATUS_OPTIONS: { value: LicenseStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'REVOKED', label: 'Revoked' },
];

export default function LicensesPage() {
  const [scopeType, setScopeType] = useState<LicenseScopeType | ''>('');
  const [type, setType] = useState<LicenseType | ''>('');
  const [status, setStatus] = useState<LicenseStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [issuedToken, setIssuedToken] = useState<LicenseIssuedToken | null>(null);

  const params = useMemo<LicenseFilterParams>(
    () => ({ scopeType: scopeType || undefined, type: type || undefined, status: status || undefined, search: search || undefined, page, limit }),
    [scopeType, type, status, search, page, limit],
  );

  const licenses = useLicenses(params);
  const rows = licenses.data?.data ?? [];
  const hasActiveFilters = !!(scopeType || type || status || search);

  return (
    <div>
      <PageHeader
        title="Licenses"
        description="License status, activations, expiry and feature entitlements."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New license
          </Button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search licenses…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setScopeType('');
          setType('');
          setStatus('');
          setSearch('');
          setPage(1);
        }}
        className="mb-4"
      >
        <Select value={scopeType} onChange={(e) => setScopeType(e.target.value as LicenseScopeType | '')} options={[{ value: '', label: 'All scopes' }, ...SCOPE_OPTIONS]} className="h-9 w-40" />
        <Select value={type} onChange={(e) => setType(e.target.value as LicenseType | '')} options={[{ value: '', label: 'All types' }, ...TYPE_OPTIONS]} className="h-9 w-36" />
        <Select value={status} onChange={(e) => setStatus(e.target.value as LicenseStatus | '')} options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]} className="h-9 w-40" />
      </FilterBar>

      {licenses.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : licenses.isError ? (
        <QueryErrorState refetch={licenses.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No licenses yet" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>License</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Activations</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((l) => (
                <TableRow key={l.id} className="cursor-pointer" onClick={() => setSelectedId(l.id)}>
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">{l.scopeKey}</p>
                    <p className="font-mono text-xs text-muted-foreground">{l.licenseKeyId}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {l.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.planKey}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {l.activationCount}
                    {l.maxActivations ? ` / ${l.maxActivations}` : ''}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={l.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.expiresAt ? formatDate(l.expiresAt) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={licenses.data?.page ?? page}
            limit={licenses.data?.limit ?? limit}
            total={licenses.data?.total ?? 0}
            totalPages={licenses.data?.totalPages ?? 0}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </>
      )}

      <CreateLicenseDialog open={createOpen} onOpenChange={setCreateOpen} />
      <LicenseDetailDrawer id={selectedId} onClose={() => setSelectedId(null)} onTokenIssued={setIssuedToken} />
      <IssuedTokenDialog token={issuedToken} onClose={() => setIssuedToken(null)} />
    </div>
  );
}

function CreateLicenseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateLicense();
  const [scopeType, setScopeType] = useState<LicenseScopeType>('WORKSPACE');
  const [type, setType] = useState<LicenseType>('STANDARD');
  const [planKey, setPlanKey] = useState('');
  const [maxActivations, setMaxActivations] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [gracePeriodDays, setGracePeriodDays] = useState('');

  const submit = () => {
    const payload: CreateLicensePayload = {
      scopeType,
      type,
      planKey,
      maxActivations: maxActivations ? Number(maxActivations) : undefined,
      expiresAt: expiresAt || undefined,
      gracePeriodDays: gracePeriodDays ? Number(gracePeriodDays) : undefined,
    };
    create.mutate(payload, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New license</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Scope type" htmlFor="lic-scope" required>
              <Select id="lic-scope" value={scopeType} onChange={(e) => setScopeType(e.target.value as LicenseScopeType)} options={SCOPE_OPTIONS} />
            </FormField>
            <FormField label="Type" htmlFor="lic-type" required>
              <Select id="lic-type" value={type} onChange={(e) => setType(e.target.value as LicenseType)} options={TYPE_OPTIONS} />
            </FormField>
            <FormField label="Plan key" htmlFor="lic-plan" required>
              <Input id="lic-plan" value={planKey} onChange={(e) => setPlanKey(e.target.value)} />
            </FormField>
            <FormField label="Max activations" htmlFor="lic-max">
              <Input id="lic-max" type="number" value={maxActivations} onChange={(e) => setMaxActivations(e.target.value)} />
            </FormField>
            <FormField label="Expires at" htmlFor="lic-expires">
              <Input id="lic-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </FormField>
            <FormField label="Grace period (days)" htmlFor="lic-grace">
              <Input id="lic-grace" type="number" value={gracePeriodDays} onChange={(e) => setGracePeriodDays(e.target.value)} />
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!planKey || create.isPending}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LicenseDetailDrawer({ id, onClose, onTokenIssued }: { id: string | null; onClose: () => void; onTokenIssued: (t: LicenseIssuedToken) => void }) {
  const { data: license, isLoading } = useLicense(id ?? undefined);
  const history = useLicenseHistory(id ?? undefined);
  const confirm = useConfirm();
  const issue = useIssueLicense(id ?? '');
  const activate = useActivateLicense(id ?? '');
  const suspend = useSuspendLicense(id ?? '');
  const reactivate = useReactivateLicense(id ?? '');
  const revoke = useRevokeLicense(id ?? '');
  const rotateKey = useRotateLicenseKey(id ?? '');
  const [renewOpen, setRenewOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  if (!id) return null;

  const handleRevoke = async () => {
    const ok = await confirm({ title: 'Revoke this license?', description: 'This cannot be undone.', confirmLabel: 'Revoke', variant: 'danger' });
    if (ok) revoke.mutate({ reason: 'Revoked from billing dashboard' });
  };

  const actions: ActionMenuItem[] = license
    ? [
        ...(license.status === 'PENDING' ? [{ label: 'Issue', icon: Key, onSelect: () => issue.mutate(undefined, { onSuccess: (t) => onTokenIssued(t) }) }] : []),
        ...(license.status === 'ISSUED' ? [{ label: 'Activate', icon: PlayCircle, onSelect: () => activate.mutate({}) }] : []),
        ...(license.status === 'ACTIVE' ? [{ label: 'Suspend', icon: ShieldAlert, onSelect: () => suspend.mutate({}) }] : []),
        ...(license.status === 'SUSPENDED' ? [{ label: 'Reactivate', icon: PlayCircle, onSelect: () => reactivate.mutate() }] : []),
        { label: 'Renew', icon: RefreshCcw, onSelect: () => setRenewOpen(true), separatorBefore: true },
        { label: 'Transfer', icon: Send, onSelect: () => setTransferOpen(true) },
        { label: 'Rotate key', icon: RotateCw, onSelect: () => rotateKey.mutate(undefined, { onSuccess: (t) => onTokenIssued(t) }) },
        ...(license.status !== 'REVOKED' ? [{ label: 'Revoke', icon: Ban, onSelect: handleRevoke, destructive: true, separatorBefore: true }] : []),
      ]
    : [];

  return (
    <Drawer open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent size="lg">
        <DrawerHeader>
          <DrawerTitle className="flex items-center justify-between">
            <span>{license?.scopeKey ?? 'License'}</span>
            <ActionMenu items={actions} />
          </DrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          {isLoading || !license ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <StatusBadge status={license.status} />
                <Badge variant="secondary" className="text-[10px]">
                  {license.type}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Plan" value={license.planKey} />
                <Field label="Scope" value={`${license.scopeType} (${license.scopeKey})`} />
                <Field label="Activations" value={`${license.activationCount}${license.maxActivations ? ` / ${license.maxActivations}` : ' (unlimited)'}`} />
                <Field label="Issued" value={license.issuedAt ? formatDate(license.issuedAt) : '—'} />
                <Field label="Activated" value={license.activatedAt ? formatDate(license.activatedAt) : '—'} />
                <Field label="Expires" value={license.expiresAt ? formatDate(license.expiresAt) : '—'} />
                <Field label="Grace period" value={license.gracePeriodDays ? `${license.gracePeriodDays} days` : '—'} />
                <Field label="Last validated" value={license.lastValidatedAt ? formatDate(license.lastValidatedAt) : '—'} />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Feature entitlements</p>
                {license.featureFlagKeys.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No feature flags attached.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {license.featureFlagKeys.map((f) => (
                      <Badge key={f} variant="secondary" className="text-[10px]">
                        {f}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {history.data && history.data.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</p>
                  <div className="space-y-2">
                    {history.data.map((h) => (
                      <div key={h.id} className="text-sm">
                        <p className="text-foreground">{h.changeType.replace(/_/g, ' ').toLowerCase()}</p>
                        {h.reason && <p className="text-xs text-muted-foreground">{h.reason}</p>}
                        <p className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DrawerBody>
      </DrawerContent>

      {license && (
        <>
          <RenewLicenseDialog licenseId={license.id} open={renewOpen} onOpenChange={setRenewOpen} />
          <TransferLicenseDialog licenseId={license.id} open={transferOpen} onOpenChange={setTransferOpen} />
        </>
      )}
    </Drawer>
  );
}

function RenewLicenseDialog({ licenseId, open, onOpenChange }: { licenseId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const renew = useRenewLicense(licenseId);
  const [expiresAt, setExpiresAt] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Renew license</DialogTitle>
        </DialogHeader>
        <FormField label="New expiry date" htmlFor="renew-expires" required>
          <Input id="renew-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => renew.mutate({ expiresAt }, { onSuccess: () => onOpenChange(false) })} disabled={!expiresAt || renew.isPending}>
            Renew
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferLicenseDialog({ licenseId, open, onOpenChange }: { licenseId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const transfer = useTransferLicense(licenseId);
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
          <FormField label="Scope type" htmlFor="tr-scope" required>
            <Select id="tr-scope" value={scopeType} onChange={(e) => setScopeType(e.target.value as LicenseScopeType)} options={SCOPE_OPTIONS} />
          </FormField>
          <FormField label="Target workspace ID" htmlFor="tr-target">
            <Input id="tr-target" value={targetWorkspaceId} onChange={(e) => setTargetWorkspaceId(e.target.value)} />
          </FormField>
          <FormField label="Reason" htmlFor="tr-reason" required>
            <Input id="tr-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => transfer.mutate({ scopeType, targetWorkspaceId: targetWorkspaceId || undefined, reason }, { onSuccess: () => onOpenChange(false) })}
            disabled={!reason || transfer.isPending}
          >
            Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Surfaces a signed offline token the backend returns exactly once (issue/rotate-key) — never re-fetchable, so the user must copy it now. */
function IssuedTokenDialog({ token, onClose }: { token: LicenseIssuedToken | null; onClose: () => void }) {
  const toast = useToast();

  const copy = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Dialog open={!!token} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>License token issued</DialogTitle>
        </DialogHeader>
        {token && (
          <div className="space-y-4">
            <p className="text-sm text-warning">This signed token is shown only once. Copy and store it securely — it cannot be retrieved again.</p>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Token</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-[var(--radius)] border border-border bg-secondary p-2 text-xs">{token.token}</code>
                <Button variant="outline" size="icon-sm" onClick={() => copy(token.token, 'Token')}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Public key</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-[var(--radius)] border border-border bg-secondary p-2 text-xs">{token.publicKey}</code>
                <Button variant="outline" size="icon-sm" onClick={() => copy(token.publicKey, 'Public key')}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
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
