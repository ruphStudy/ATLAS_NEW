'use client';

import { useMemo, useState } from 'react';
import { Archive, CheckCircle2, Gauge, Plus, ShieldOff, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
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
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { CreateQuotaPolicyPayload, QuotaOverrideFilterParams, QuotaPolicyFilterParams, QuotaPolicyStatus, QuotaResetSchedule, QuotaScopeType } from '@/types';

const SCOPE_OPTIONS: { value: QuotaScopeType; label: string }[] = [
  { value: 'WORKSPACE', label: 'Workspace' },
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'USER', label: 'User' },
  { value: 'PLAN', label: 'Plan' },
];

const RESET_OPTIONS: { value: QuotaResetSchedule; label: string }[] = [
  { value: 'NEVER', label: 'Never' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'CUSTOM', label: 'Custom' },
  { value: 'BILLING_PERIOD', label: 'Billing period' },
];

const POLICY_STATUS_OPTIONS: { value: QuotaPolicyStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function QuotaPage() {
  return (
    <div>
      <PageHeader title="Quota" description="Quota policies, admin overrides, live enforcement checks and grace limits." />
      <Tabs defaultValue="check">
        <TabsList>
          <TabsTrigger value="check">Check</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="overrides">Overrides</TabsTrigger>
        </TabsList>
        <TabsContent value="check">
          <CheckTab />
        </TabsContent>
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

function CheckTab() {
  const check = useCheckQuota();
  const [resourceKey, setResourceKey] = useState('');
  const [feature, setFeature] = useState('');
  const [requestedQuantity, setRequestedQuantity] = useState('1');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Resource key" htmlFor="chk-resource" required>
          <Input id="chk-resource" value={resourceKey} onChange={(e) => setResourceKey(e.target.value)} placeholder="e.g. API_CALLS" />
        </FormField>
        <FormField label="Feature (optional)" htmlFor="chk-feature">
          <Input id="chk-feature" value={feature} onChange={(e) => setFeature(e.target.value)} />
        </FormField>
        <FormField label="Requested quantity" htmlFor="chk-qty">
          <Input id="chk-qty" type="number" min={1} value={requestedQuantity} onChange={(e) => setRequestedQuantity(e.target.value)} />
        </FormField>
      </div>
      <Button
        onClick={() => check.mutate({ resourceKey, feature: feature || undefined, requestedQuantity: Number(requestedQuantity) || undefined })}
        disabled={!resourceKey || check.isPending}
      >
        <Gauge className="h-3.5 w-3.5" />
        Check quota
      </Button>

      {check.data && (
        <Card>
          <CardContent className="space-y-3 pt-6 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={check.data.allowed ? 'success' : 'danger'}>{check.data.allowed ? 'Allowed' : 'Blocked'}</Badge>
              <StatusBadge status={check.data.state} />
            </div>
            <Row label="Resource" value={check.data.resourceKey} />
            <Row label="Feature" value={check.data.feature} />
            <Row label="Consumed" value={String(check.data.consumed)} />
            <Row label="Limit" value={check.data.limit !== null ? String(check.data.limit) : '—'} />
            <Row label="Remaining" value={check.data.remaining !== null ? String(check.data.remaining) : '—'} />
            <Row label="Overage" value={String(check.data.overage)} />
            {check.data.reason && <Row label="Reason" value={check.data.reason} />}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PoliciesTab() {
  const [scopeType, setScopeType] = useState<QuotaScopeType | ''>('');
  const [status, setStatus] = useState<QuotaPolicyStatus | ''>('');
  const [resourceKey, setResourceKey] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const params = useMemo<QuotaPolicyFilterParams>(
    () => ({ scopeType: scopeType || undefined, status: status || undefined, resourceKey: resourceKey || undefined, page, limit }),
    [scopeType, status, resourceKey, page, limit],
  );

  const policies = useQuotaPolicies(params);
  const rows = policies.data?.data ?? [];
  const hasActiveFilters = !!(scopeType || status || resourceKey);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New policy
        </Button>
      </div>

      <FilterBar
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setScopeType('');
          setStatus('');
          setResourceKey('');
          setPage(1);
        }}
        className="mb-4"
      >
        <Select value={scopeType} onChange={(e) => setScopeType(e.target.value as QuotaScopeType | '')} options={[{ value: '', label: 'All scopes' }, ...SCOPE_OPTIONS]} className="h-9 w-40" />
        <Select value={status} onChange={(e) => setStatus(e.target.value as QuotaPolicyStatus | '')} options={[{ value: '', label: 'All statuses' }, ...POLICY_STATUS_OPTIONS]} className="h-9 w-40" />
        <Input placeholder="Resource key" value={resourceKey} onChange={(e) => setResourceKey(e.target.value)} className="h-9 w-40" />
      </FilterBar>

      {policies.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : policies.isError ? (
        <QueryErrorState refetch={policies.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No quota policies yet" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Soft / Hard</TableHead>
                <TableHead>Reset</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelectedId(p.id)}>
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">{p.resourceKey}</p>
                    <p className="text-xs text-muted-foreground">{p.feature}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {p.scopeType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.softLimit ?? '—'} / {p.hardLimit ?? '—'} {p.unit ?? ''}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.resetSchedule.toLowerCase()}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={policies.data?.page ?? page}
            limit={policies.data?.limit ?? limit}
            total={policies.data?.total ?? 0}
            totalPages={policies.data?.totalPages ?? 0}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </>
      )}

      <CreatePolicyDialog open={createOpen} onOpenChange={setCreateOpen} />
      <PolicyDetailDrawer id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreatePolicyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateQuotaPolicy();
  const [scopeType, setScopeType] = useState<QuotaScopeType>('WORKSPACE');
  const [resourceKey, setResourceKey] = useState('');
  const [feature, setFeature] = useState('');
  const [unit, setUnit] = useState('');
  const [softLimit, setSoftLimit] = useState('');
  const [hardLimit, setHardLimit] = useState('');
  const [resetSchedule, setResetSchedule] = useState<QuotaResetSchedule>('MONTHLY');
  const [overageAllowed, setOverageAllowed] = useState(false);

  const submit = () => {
    const payload: CreateQuotaPolicyPayload = {
      scopeType,
      resourceKey,
      feature: feature || undefined,
      unit: unit || undefined,
      softLimit: softLimit ? Number(softLimit) : undefined,
      hardLimit: hardLimit ? Number(hardLimit) : undefined,
      resetSchedule,
      overageAllowed,
    };
    create.mutate(payload, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New quota policy</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Scope type" htmlFor="qp-scope" required>
              <Select id="qp-scope" value={scopeType} onChange={(e) => setScopeType(e.target.value as QuotaScopeType)} options={SCOPE_OPTIONS} />
            </FormField>
            <FormField label="Resource key" htmlFor="qp-resource" required>
              <Input id="qp-resource" value={resourceKey} onChange={(e) => setResourceKey(e.target.value)} placeholder="e.g. API_CALLS" />
            </FormField>
            <FormField label="Feature" htmlFor="qp-feature">
              <Input id="qp-feature" value={feature} onChange={(e) => setFeature(e.target.value)} />
            </FormField>
            <FormField label="Unit" htmlFor="qp-unit">
              <Input id="qp-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. requests" />
            </FormField>
            <FormField label="Soft limit" htmlFor="qp-soft">
              <Input id="qp-soft" type="number" value={softLimit} onChange={(e) => setSoftLimit(e.target.value)} />
            </FormField>
            <FormField label="Hard limit" htmlFor="qp-hard">
              <Input id="qp-hard" type="number" value={hardLimit} onChange={(e) => setHardLimit(e.target.value)} />
            </FormField>
            <FormField label="Reset schedule" htmlFor="qp-reset">
              <Select id="qp-reset" value={resetSchedule} onChange={(e) => setResetSchedule(e.target.value as QuotaResetSchedule)} options={RESET_OPTIONS} />
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!resourceKey || create.isPending}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PolicyDetailDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: policy, isLoading } = useQuotaPolicy(id ?? undefined);
  const history = useQuotaPolicyHistory(id ?? undefined);
  const enable = useEnableQuotaPolicy(id ?? '');
  const disable = useDisableQuotaPolicy(id ?? '');
  const archive = useArchiveQuotaPolicy(id ?? '');
  const createOverride = useCreateQuotaOverride(id ?? '');
  const [overrideOpen, setOverrideOpen] = useState(false);

  const actions: ActionMenuItem[] = policy
    ? [
        ...(policy.status === 'ACTIVE' ? [{ label: 'Disable', icon: XCircle, onSelect: () => disable.mutate() }] : []),
        ...(policy.status === 'DISABLED' ? [{ label: 'Enable', icon: CheckCircle2, onSelect: () => enable.mutate() }] : []),
        { label: 'Grant override', icon: ShieldOff, onSelect: () => setOverrideOpen(true) },
        ...(policy.status !== 'ARCHIVED' ? [{ label: 'Archive', icon: Archive, onSelect: () => archive.mutate(), destructive: true, separatorBefore: true }] : []),
      ]
    : [];

  return (
    <Drawer open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent size="md">
        <DrawerHeader>
          <DrawerTitle className="flex items-center justify-between">
            <span>{policy?.resourceKey ?? 'Policy'}</span>
            <ActionMenu items={actions} />
          </DrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          {isLoading || !policy ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="space-y-6">
              <StatusBadge status={policy.status} />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Scope" value={`${policy.scopeType} (${policy.scopeKey})`} />
                <Field label="Feature" value={policy.feature} />
                <Field label="Soft limit" value={policy.softLimit !== null ? String(policy.softLimit) : '—'} />
                <Field label="Hard limit" value={policy.hardLimit !== null ? String(policy.hardLimit) : '—'} />
                <Field label="Grace threshold" value={policy.graceThreshold !== null ? String(policy.graceThreshold) : '—'} />
                <Field label="Overage" value={policy.overageAllowed ? `Allowed up to ${policy.overageLimit ?? '∞'}` : 'Not allowed'} />
                <Field label="Reset schedule" value={policy.resetSchedule} />
                <Field label="Version" value={`v${policy.version}`} />
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

      {policy && (
        <GrantOverrideDialog
          open={overrideOpen}
          onOpenChange={setOverrideOpen}
          onSubmit={(payload) => createOverride.mutate(payload, { onSuccess: () => setOverrideOpen(false) })}
          isPending={createOverride.isPending}
        />
      )}
    </Drawer>
  );
}

function GrantOverrideDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (payload: { additionalHardLimit?: number; reason: string; expiresAt?: string }) => void;
  isPending: boolean;
}) {
  const [additionalHardLimit, setAdditionalHardLimit] = useState('');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Grant quota override</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Additional hard limit" htmlFor="ov-limit">
            <Input id="ov-limit" type="number" value={additionalHardLimit} onChange={(e) => setAdditionalHardLimit(e.target.value)} />
          </FormField>
          <FormField label="Expires at" htmlFor="ov-expires">
            <Input id="ov-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </FormField>
          <FormField label="Reason" htmlFor="ov-reason" required>
            <Input id="ov-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit({ additionalHardLimit: additionalHardLimit ? Number(additionalHardLimit) : undefined, reason, expiresAt: expiresAt || undefined })}
            disabled={!reason || isPending}
          >
            Grant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OverridesTab() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const params = useMemo<QuotaOverrideFilterParams>(() => ({ page, limit }), [page, limit]);
  const overrides = useQuotaOverrides(params);
  const rows = overrides.data?.data ?? [];

  return (
    <div>
      {overrides.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : overrides.isError ? (
        <QueryErrorState refetch={overrides.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No quota overrides yet" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Additional limit</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => (
                <OverrideRow key={o.id} override={o} />
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={overrides.data?.page ?? page}
            limit={overrides.data?.limit ?? limit}
            total={overrides.data?.total ?? 0}
            totalPages={overrides.data?.totalPages ?? 0}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </>
      )}
    </div>
  );
}

function OverrideRow({ override }: { override: import('@/types').QuotaOverride }) {
  const revoke = useRevokeQuotaOverride(override.id);
  return (
    <TableRow>
      <TableCell className="text-sm font-medium text-foreground">{override.resourceKey}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{override.additionalHardLimit ?? '—'}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{override.reason}</TableCell>
      <TableCell>
        <StatusBadge status={override.status} />
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{override.expiresAt ? formatDate(override.expiresAt) : '—'}</TableCell>
      <TableCell className="text-right">
        {override.status === 'ACTIVE' && (
          <ActionMenu items={[{ label: 'Revoke', icon: XCircle, onSelect: () => revoke.mutate({ reason: 'Revoked from billing dashboard' }), destructive: true }]} />
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}
