'use client';

import { useState } from 'react';
import { Loader2, Plus, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useActivateBackupPolicy,
  useArchiveBackupPolicy,
  useAvailableBackups,
  useBackupJobs,
  useBackupPolicies,
  useBackupPolicy,
  useBackupPolicyHistory,
  useBackupRecords,
  useCreateBackupPolicy,
  usePauseBackupPolicy,
  useRestoreBackupPolicy,
  useTriggerBackup,
  useVerifyBackupRecord,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type {
  BackupIntegrityStatus,
  BackupJobStatus,
  BackupPolicyStatus,
  BackupRecordStatus,
  BackupScope,
  CreateBackupPolicyPayload,
} from '@/types';

const POLICY_STATUS_OPTIONS: { value: BackupPolicyStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const SCOPE_OPTIONS: { value: BackupScope; label: string }[] = [
  { value: 'TENANT', label: 'Tenant' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'FULL_PLATFORM', label: 'Full platform' },
];

const JOB_STATUS_OPTIONS: { value: BackupJobStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'RUNNING', label: 'Running' },
  { value: 'VALIDATING', label: 'Validating' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const JOB_STATUS_TONE: Record<BackupJobStatus, StatusTone> = {
  PENDING: 'neutral',
  RUNNING: 'info',
  VALIDATING: 'warning',
  COMPLETED: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral',
};

const RECORD_STATUS_TONE: Record<BackupRecordStatus, StatusTone> = {
  CREATING: 'info',
  AVAILABLE: 'success',
  VERIFYING: 'warning',
  VERIFIED: 'success',
  CORRUPT: 'danger',
  EXPIRED: 'neutral',
  DELETED: 'neutral',
};

const INTEGRITY_TONE: Record<BackupIntegrityStatus, StatusTone> = {
  UNVALIDATED: 'neutral',
  VALID: 'success',
  CORRUPT: 'danger',
};

function formatBytes(bytes?: string | null): string {
  if (!bytes) return '—';
  const n = Number(bytes);
  if (!Number.isFinite(n)) return bytes;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = n;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export default function BackupManagementPage() {
  return (
    <div>
      <PageHeader title="Backup Management" description="Backup policies, schedules, jobs, records, integrity verification and retention." />
      <Tabs defaultValue="policies">
        <TabsList>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="restore">Restore Eligibility</TabsTrigger>
        </TabsList>
        <TabsContent value="policies">
          <PoliciesTab />
        </TabsContent>
        <TabsContent value="jobs">
          <JobsTab />
        </TabsContent>
        <TabsContent value="records">
          <RecordsTab />
        </TabsContent>
        <TabsContent value="restore">
          <RestoreTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PoliciesTab() {
  const [environment, setEnvironment] = useState('');
  const [status, setStatus] = useState<BackupPolicyStatus | ''>('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useBackupPolicies({ environment: environment || undefined, status: status || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!environment || !!status} onClearFilters={() => { setEnvironment(''); setStatus(''); setPage(1); }}>
          <Input value={environment} onChange={(e) => { setEnvironment(e.target.value); setPage(1); }} placeholder="Environment" className="h-9 w-40" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as BackupPolicyStatus | ''); setPage(1); }} placeholder="All statuses" options={POLICY_STATUS_OPTIONS} className="h-9 w-36" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create policy
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No backup policies found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Retention</TableHead>
                <TableHead>Encrypted</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((p) => (
                <TableRow key={p.id} clickable onClick={() => setSelectedId(p.id)}>
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">{p.service}</p>
                    <p className="text-xs text-muted-foreground">{p.dataType} · {p.backupType}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.environment}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.scope}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.retentionDays}d</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.encryptionEnabled ? 'Yes' : 'No'}</TableCell>
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
  const create = useCreateBackupPolicy();
  const [form, setForm] = useState<CreateBackupPolicyPayload>({ environment: '', service: '', dataType: '', backupType: '' });
  const reset = () => setForm({ environment: '', service: '', dataType: '', backupType: '' });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Create backup policy</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Environment" htmlFor="bp-env" required>
            <Input id="bp-env" value={form.environment} onChange={(e) => setForm((f) => ({ ...f, environment: e.target.value }))} />
          </FormField>
          <FormField label="Service" htmlFor="bp-service" required>
            <Input id="bp-service" value={form.service} onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))} />
          </FormField>
          <FormField label="Data type" htmlFor="bp-datatype" required>
            <Input id="bp-datatype" value={form.dataType} onChange={(e) => setForm((f) => ({ ...f, dataType: e.target.value }))} />
          </FormField>
          <FormField label="Backup type" htmlFor="bp-backuptype" required>
            <Input id="bp-backuptype" value={form.backupType} onChange={(e) => setForm((f) => ({ ...f, backupType: e.target.value }))} placeholder="FULL / INCREMENTAL" />
          </FormField>
          <FormField label="Scope" htmlFor="bp-scope">
            <Select id="bp-scope" value={form.scope ?? ''} onChange={(e) => setForm((f) => ({ ...f, scope: (e.target.value || undefined) as BackupScope | undefined }))} placeholder="Tenant" options={SCOPE_OPTIONS} />
          </FormField>
          <FormField label="Frequency (minutes)" htmlFor="bp-frequency">
            <Input id="bp-frequency" type="number" value={form.frequencyMinutes ?? ''} onChange={(e) => setForm((f) => ({ ...f, frequencyMinutes: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <FormField label="Retention (days)" htmlFor="bp-retention">
            <Input id="bp-retention" type="number" value={form.retentionDays ?? ''} onChange={(e) => setForm((f) => ({ ...f, retentionDays: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <FormField label="Max versions" htmlFor="bp-maxversions">
            <Input id="bp-maxversions" type="number" value={form.maxVersions ?? ''} onChange={(e) => setForm((f) => ({ ...f, maxVersions: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <div className="col-span-2 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox checked={!!form.encryptionEnabled} onChange={(e) => setForm((f) => ({ ...f, encryptionEnabled: e.target.checked }))} />
              Encryption enabled
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox checked={!!form.compressionEnabled} onChange={(e) => setForm((f) => ({ ...f, compressionEnabled: e.target.checked }))} />
              Compression enabled
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.environment || !form.service || !form.dataType || !form.backupType || create.isPending}
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
  const { data: policy, isLoading } = useBackupPolicy(id ?? undefined);
  const { data: history } = useBackupPolicyHistory(id ?? undefined);
  const activate = useActivateBackupPolicy(id ?? '');
  const pause = usePauseBackupPolicy(id ?? '');
  const archive = useArchiveBackupPolicy(id ?? '');
  const restore = useRestoreBackupPolicy(id ?? '');
  const trigger = useTriggerBackup(id ?? '');
  const [triggerOpen, setTriggerOpen] = useState(false);

  const actions: ActionMenuItem[] = [];
  if (policy) {
    if (policy.status === 'DRAFT' || policy.status === 'PAUSED') actions.push({ label: 'Activate', onSelect: () => activate.mutate() });
    if (policy.status === 'ACTIVE') {
      actions.push({ label: 'Pause', onSelect: () => pause.mutate() });
      actions.push({ label: 'Trigger backup now', onSelect: () => setTriggerOpen(true) });
    }
    if (policy.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => archive.mutate(), destructive: true, separatorBefore: true });
    if (policy.status === 'ARCHIVED') actions.push({ label: 'Restore', onSelect: () => restore.mutate() });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{policy?.service ?? 'Policy'}</span>
            {policy && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !policy ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Environment" value={policy.environment} />
              <Field label="Data type" value={policy.dataType} />
              <Field label="Backup type" value={policy.backupType} />
              <Field label="Scope" value={String(policy.scope)} />
              <Field label="Frequency" value={policy.frequencyMinutes ? `${policy.frequencyMinutes}m` : '—'} />
              <Field label="Retention" value={`${policy.retentionDays}d`} />
              <Field label="Max versions" value={policy.maxVersions ? String(policy.maxVersions) : '—'} />
              <Field label="Encryption" value={policy.encryptionEnabled ? 'Enabled' : 'Disabled'} />
              <Field label="Compression" value={policy.compressionEnabled ? 'Enabled' : 'Disabled'} />
              <Field label="Provider" value={policy.preferredProviderKey ?? '—'} />
              <Field label="Status" value={String(policy.status)} />
              <Field label="Version" value={String(policy.version)} />
            </div>
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
      <ReasonDialog
        open={triggerOpen}
        onOpenChange={setTriggerOpen}
        title="Trigger a manual backup"
        label="Reason (optional)"
        confirmLabel="Trigger"
        pending={trigger.isPending}
        onSubmit={(r) => trigger.mutate({ reason: r || undefined }, { onSuccess: () => setTriggerOpen(false) })}
      />
    </Dialog>
  );
}

function JobsTab() {
  const [status, setStatus] = useState<BackupJobStatus | ''>('');
  const [policyId, setPolicyId] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useBackupJobs({ status: status || undefined, policyId: policyId || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4">
        <FilterBar hasActiveFilters={!!status || !!policyId} onClearFilters={() => { setStatus(''); setPolicyId(''); setPage(1); }}>
          <Select value={status} onChange={(e) => { setStatus(e.target.value as BackupJobStatus | ''); setPage(1); }} placeholder="All statuses" options={JOB_STATUS_OPTIONS} className="h-9 w-40" />
          <Input value={policyId} onChange={(e) => { setPolicyId(e.target.value); setPage(1); }} placeholder="Policy ID" className="h-9 w-56" />
        </FilterBar>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No backup jobs found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Retries</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="text-sm font-medium text-foreground">{j.id}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{j.triggerType}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{j.targetType} · {j.backupType}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{j.retryCount}/{j.maxRetries}</TableCell>
                  <TableCell>
                    <StatusBadge status={j.status} tone={JOB_STATUS_TONE[j.status]} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(j.startedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={Math.ceil(data.total / 20)} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}
    </div>
  );
}

function RecordsTab() {
  const [policyId, setPolicyId] = useState('');
  const [targetType, setTargetType] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useBackupRecords({ policyId: policyId || undefined, targetType: targetType || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4">
        <FilterBar hasActiveFilters={!!policyId || !!targetType} onClearFilters={() => { setPolicyId(''); setTargetType(''); setPage(1); }}>
          <Input value={policyId} onChange={(e) => { setPolicyId(e.target.value); setPage(1); }} placeholder="Policy ID" className="h-9 w-56" />
          <Input value={targetType} onChange={(e) => { setTargetType(e.target.value); setPage(1); }} placeholder="Target type" className="h-9 w-40" />
        </FilterBar>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No backup records found" />
      ) : (
        <>
          <div className="space-y-2">
            {data.data.map((r) => (
              <RecordRow key={r.id} record={r} />
            ))}
          </div>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={Math.ceil(data.total / 20)} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}
    </div>
  );
}

function RecordRow({
  record,
}: {
  record: {
    id: string;
    targetType: string;
    backupType: string;
    providerKey: string;
    sizeBytes?: string | null;
    checksum?: string | null;
    status: BackupRecordStatus;
    integrityStatus: BackupIntegrityStatus;
    restorable: boolean;
    capturedAt: string;
    verifiedAt?: string | null;
    expiresAt?: string | null;
  };
}) {
  const verify = useVerifyBackupRecord(record.id);

  return (
    <div className="rounded-[var(--radius)] border border-border p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">
          {record.targetType} · {record.backupType}
        </span>
        <div className="flex items-center gap-2">
          <StatusBadge status={record.integrityStatus} tone={INTEGRITY_TONE[record.integrityStatus]} />
          <StatusBadge status={record.status} tone={RECORD_STATUS_TONE[record.status]} />
          {record.status === 'AVAILABLE' && (
            <Button size="sm" variant="outline" onClick={() => verify.mutate()} disabled={verify.isPending}>
              <ShieldCheck className="h-3.5 w-3.5" />
              Verify
            </Button>
          )}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {record.providerKey} · {formatBytes(record.sizeBytes)} {record.checksum ? `· checksum ${record.checksum.slice(0, 12)}…` : ''} · restorable {record.restorable ? 'yes' : 'no'}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        captured {formatDate(record.capturedAt)}
        {record.verifiedAt && ` · verified ${formatDate(record.verifiedAt)}`}
        {record.expiresAt && ` · expires ${formatDate(record.expiresAt)}`}
      </p>
    </div>
  );
}

function RestoreTab() {
  const [targetType, setTargetType] = useState('');
  const { data, isLoading } = useAvailableBackups(targetType || undefined);

  return (
    <div>
      <div className="mb-4">
        <FormField label="Target type" htmlFor="restore-target">
          <Input id="restore-target" value={targetType} onChange={(e) => setTargetType(e.target.value)} placeholder="e.g. WORKSPACE, DATABASE" className="h-9 w-64" />
        </FormField>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">Backups eligible for restore — verified, non-expired records only. Actual restore is performed from Disaster Recovery.</p>
      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No restorable backups found" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Target</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Integrity</TableHead>
              <TableHead>Captured</TableHead>
              <TableHead>Expires</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-sm font-medium text-foreground">{r.targetType}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.providerKey}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatBytes(r.sizeBytes)}</TableCell>
                <TableCell>
                  <StatusBadge status={r.integrityStatus} tone={INTEGRITY_TONE[r.integrityStatus as BackupIntegrityStatus] ?? 'neutral'} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(r.capturedAt)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.expiresAt ? formatDate(r.expiresAt) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
