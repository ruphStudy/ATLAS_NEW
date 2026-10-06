'use client';

import { useState } from 'react';
import { Loader2, Plug, Plus, ShieldCheck } from 'lucide-react';
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
  useArchiveNotificationProviderEntry,
  useCancelNotificationDelivery,
  useCreateNotificationProviderConfig,
  useCreateNotificationProviderCredential,
  useDeleteNotificationProviderConfig,
  useDisableNotificationProviderConfig,
  useDisableNotificationProviderEntry,
  useEnableNotificationProviderConfig,
  useEnableNotificationProviderEntry,
  useNotificationDeliveries,
  useNotificationProviderConfig,
  useNotificationProviderConfigHistory,
  useNotificationProviderConfigs,
  useNotificationProviderCredentialHistory,
  useNotificationProviderCredentials,
  useNotificationProviderRegistry,
  useNotificationProviderRegistryEntry,
  useRegisterNotificationProviderEntry,
  useRevokeNotificationProviderCredential,
  useRollbackNotificationProviderConfig,
  useRotateNotificationProviderCredential,
  useToast,
  useUpdateNotificationProviderEntry,
  useValidateNotificationProviderConnection,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type {
  CreateNotificationProviderConfigPayload,
  CreateNotificationProviderCredentialPayload,
  NotificationProviderConfigStatus,
  NotificationProviderCredentialStatus,
  NotificationProviderRegistryStatus,
  RegisterNotificationProviderEntryPayload,
} from '@/types';

const REGISTRY_STATUS_OPTIONS: { value: NotificationProviderRegistryStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const CONFIG_STATUS_OPTIONS: { value: NotificationProviderConfigStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const CREDENTIAL_STATUS_OPTIONS: { value: NotificationProviderCredentialStatus; label: string }[] = [
  { value: 'PENDING_VALIDATION', label: 'Pending validation' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'INVALID', label: 'Invalid' },
  { value: 'VALIDATION_FAILED', label: 'Validation failed' },
  { value: 'REVOKED', label: 'Revoked' },
];

const CREDENTIAL_STATUS_TONE: Record<NotificationProviderCredentialStatus, StatusTone> = {
  PENDING_VALIDATION: 'warning',
  ACTIVE: 'success',
  DISABLED: 'neutral',
  EXPIRED: 'danger',
  INVALID: 'danger',
  VALIDATION_FAILED: 'danger',
  REVOKED: 'neutral',
};

export default function NotificationProvidersPage() {
  return (
    <div>
      <PageHeader title="Notification Providers" description="Registry, configuration, credentials and delivery activity for email/SMS/WhatsApp/push notification providers." />
      <Tabs defaultValue="registry">
        <TabsList>
          <TabsTrigger value="registry">Registry</TabsTrigger>
          <TabsTrigger value="configs">Configurations</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
        </TabsList>
        <TabsContent value="registry">
          <RegistryTab />
        </TabsContent>
        <TabsContent value="configs">
          <ConfigsTab />
        </TabsContent>
        <TabsContent value="credentials">
          <CredentialsTab />
        </TabsContent>
        <TabsContent value="deliveries">
          <DeliveriesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RegistryTab() {
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState<NotificationProviderRegistryStatus | ''>('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading } = useNotificationProviderRegistry({ channel: channel || undefined, status: status || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!channel || !!status} onClearFilters={() => { setChannel(''); setStatus(''); setPage(1); }}>
          <Input value={channel} onChange={(e) => { setChannel(e.target.value); setPage(1); }} placeholder="Channel (EMAIL, SMS...)" className="h-9 w-48" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as NotificationProviderRegistryStatus | ''); setPage(1); }} placeholder="All statuses" options={REGISTRY_STATUS_OPTIONS} className="h-9 w-40" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Register provider
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No providers registered yet" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Capabilities</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((entry) => (
                <TableRow key={entry.id} clickable onClick={() => setSelectedId(entry.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{entry.displayName} <span className="text-xs text-muted-foreground">({entry.providerKey})</span></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{entry.channel}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{entry.capabilities.join(', ') || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{entry.priority}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{entry.isDefault ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <StatusBadge status={entry.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <RegisterEntryDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RegistryEntryDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function RegisterEntryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const register = useRegisterNotificationProviderEntry();
  const [form, setForm] = useState<Omit<RegisterNotificationProviderEntryPayload, 'workspaceId'>>({ providerKey: '', channel: '', displayName: '', version: '1.0.0' });
  const reset = () => setForm({ providerKey: '', channel: '', displayName: '', version: '1.0.0' });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Register notification provider</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Provider key" htmlFor="np-key" required>
            <Input id="np-key" value={form.providerKey} onChange={(e) => setForm((f) => ({ ...f, providerKey: e.target.value }))} />
          </FormField>
          <FormField label="Channel" htmlFor="np-channel" required>
            <Input id="np-channel" value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value.toUpperCase() }))} placeholder="EMAIL / SMS / WHATSAPP / PUSH" />
          </FormField>
          <FormField label="Display name" htmlFor="np-name" required>
            <Input id="np-name" value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />
          </FormField>
          <FormField label="Version" htmlFor="np-version" required>
            <Input id="np-version" value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} />
          </FormField>
          <FormField label="Priority" htmlFor="np-priority">
            <Input id="np-priority" type="number" value={form.priority ?? ''} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <FormField label="Capabilities (comma-separated)" htmlFor="np-caps">
            <Input id="np-caps" value={(form.capabilities ?? []).join(', ')} onChange={(e) => setForm((f) => ({ ...f, capabilities: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))} />
          </FormField>
          <label className="col-span-2 flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={!!form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} />
            Default provider for this channel
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => register.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.providerKey || !form.channel || !form.displayName || !form.version || register.isPending}
          >
            {register.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RegistryEntryDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: entry, isLoading } = useNotificationProviderRegistryEntry(id ?? undefined);
  const update = useUpdateNotificationProviderEntry(id ?? '');
  const enable = useEnableNotificationProviderEntry(id ?? '');
  const disable = useDisableNotificationProviderEntry(id ?? '');
  const archive = useArchiveNotificationProviderEntry(id ?? '');
  const [fallbackOrder, setFallbackOrder] = useState('');

  const actions: ActionMenuItem[] = [];
  if (entry) {
    if (entry.status !== 'ACTIVE') actions.push({ label: 'Enable', onSelect: () => enable.mutate() });
    if (entry.status === 'ACTIVE') actions.push({ label: 'Disable', onSelect: () => disable.mutate() });
    if (entry.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => archive.mutate(), destructive: true, separatorBefore: true });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{entry?.displayName ?? 'Provider'}</span>
            {entry && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !entry ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Provider key" value={entry.providerKey} />
              <Field label="Channel" value={entry.channel} />
              <Field label="Version" value={entry.version} />
              <Field label="Priority" value={String(entry.priority)} />
              <Field label="Default" value={entry.isDefault ? 'Yes' : 'No'} />
              <Field label="Status" value={entry.status} />
            </div>
            {entry.capabilities.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Capabilities</p>
                <p className="text-sm text-foreground">{entry.capabilities.join(', ')}</p>
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fallback order</p>
              <p className="mb-2 text-sm text-foreground">{entry.fallbackOrder.length > 0 ? entry.fallbackOrder.join(' → ') : 'None configured'}</p>
              <div className="flex items-end gap-2">
                <FormField label="Set fallback order (comma-separated provider keys)" htmlFor="np-fallback">
                  <Input id="np-fallback" value={fallbackOrder} onChange={(e) => setFallbackOrder(e.target.value)} className="h-9 w-72" />
                </FormField>
                <Button
                  size="sm"
                  onClick={() => update.mutate({ fallbackOrder: fallbackOrder.split(',').map((s) => s.trim()).filter(Boolean) }, { onSuccess: () => setFallbackOrder('') })}
                  disabled={!fallbackOrder || update.isPending}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConfigsTab() {
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState<NotificationProviderConfigStatus | ''>('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, isLoading } = useNotificationProviderConfigs({ channel: channel || undefined, status: status || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!channel || !!status} onClearFilters={() => { setChannel(''); setStatus(''); setPage(1); }}>
          <Input value={channel} onChange={(e) => { setChannel(e.target.value); setPage(1); }} placeholder="Channel" className="h-9 w-40" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as NotificationProviderConfigStatus | ''); setPage(1); }} placeholder="All statuses" options={CONFIG_STATUS_OPTIONS} className="h-9 w-36" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create configuration
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No configurations yet" description="Configurations define priority, fallback, rate limits and retry behavior per provider/channel." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Provider / Channel</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Fallback</TableHead>
                <TableHead>Rate limit</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((c) => (
                <TableRow key={c.id} clickable onClick={() => setSelectedId(c.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{c.name} <span className="text-xs text-muted-foreground">v{c.version}</span></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.providerKey} · {c.channel}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.priority}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.isFallback ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.maxRequestsPerMinute ? `${c.maxRequestsPerMinute}/min` : '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <CreateConfigDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ConfigDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreateConfigDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateNotificationProviderConfig();
  const [form, setForm] = useState<Omit<CreateNotificationProviderConfigPayload, 'workspaceId'>>({ providerKey: '', channel: '', name: '' });
  const reset = () => setForm({ providerKey: '', channel: '', name: '' });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Create configuration</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Provider key" htmlFor="cfg-provider" required>
            <Input id="cfg-provider" value={form.providerKey} onChange={(e) => setForm((f) => ({ ...f, providerKey: e.target.value }))} />
          </FormField>
          <FormField label="Channel" htmlFor="cfg-channel" required>
            <Input id="cfg-channel" value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value.toUpperCase() }))} />
          </FormField>
          <div className="col-span-2">
            <FormField label="Name" htmlFor="cfg-name" required>
              <Input id="cfg-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Priority" htmlFor="cfg-priority">
            <Input id="cfg-priority" type="number" value={form.priority ?? ''} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <FormField label="Timeout (ms)" htmlFor="cfg-timeout">
            <Input id="cfg-timeout" type="number" value={form.timeoutMs ?? ''} onChange={(e) => setForm((f) => ({ ...f, timeoutMs: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <FormField label="Max retry attempts" htmlFor="cfg-retries">
            <Input id="cfg-retries" type="number" value={form.maxRetryAttempts ?? ''} onChange={(e) => setForm((f) => ({ ...f, maxRetryAttempts: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <FormField label="Retry backoff (ms)" htmlFor="cfg-backoff">
            <Input id="cfg-backoff" type="number" value={form.retryBackoffMs ?? ''} onChange={(e) => setForm((f) => ({ ...f, retryBackoffMs: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <FormField label="Max requests/minute" htmlFor="cfg-rpm">
            <Input id="cfg-rpm" type="number" value={form.maxRequestsPerMinute ?? ''} onChange={(e) => setForm((f) => ({ ...f, maxRequestsPerMinute: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <label className="col-span-2 flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={!!form.isFallback} onChange={(e) => setForm((f) => ({ ...f, isFallback: e.target.checked }))} />
            This configuration is a fallback
          </label>
          {form.isFallback && (
            <div className="col-span-2">
              <FormField label="Fallback provider keys (comma-separated)" htmlFor="cfg-fallback-keys">
                <Input id="cfg-fallback-keys" value={(form.fallbackProviderKeys ?? []).join(', ')} onChange={(e) => setForm((f) => ({ ...f, fallbackProviderKeys: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))} />
              </FormField>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.providerKey || !form.channel || !form.name || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfigDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: config, isLoading } = useNotificationProviderConfig(id ?? undefined);
  const { data: history } = useNotificationProviderConfigHistory(id ?? undefined);
  const enable = useEnableNotificationProviderConfig(id ?? '');
  const disable = useDisableNotificationProviderConfig(id ?? '');
  const remove = useDeleteNotificationProviderConfig(id ?? '');
  const rollback = useRollbackNotificationProviderConfig(id ?? '');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const actions: ActionMenuItem[] = [];
  if (config) {
    if (config.status !== 'ACTIVE') actions.push({ label: 'Enable', onSelect: () => enable.mutate() });
    if (config.status === 'ACTIVE') actions.push({ label: 'Disable', onSelect: () => disable.mutate() });
    actions.push({ label: 'Delete', onSelect: () => setDeleteOpen(true), destructive: true, separatorBefore: true });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{config?.name ?? 'Configuration'}</span>
            {config && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !config ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Provider" value={config.providerKey} />
              <Field label="Channel" value={config.channel} />
              <Field label="Priority" value={String(config.priority)} />
              <Field label="Fallback" value={config.isFallback ? 'Yes' : 'No'} />
              <Field label="Timeout" value={config.timeoutMs ? `${config.timeoutMs}ms` : '—'} />
              <Field label="Max retries" value={config.maxRetryAttempts != null ? String(config.maxRetryAttempts) : '—'} />
              <Field label="Retry backoff" value={config.retryBackoffMs != null ? `${config.retryBackoffMs}ms` : '—'} />
              <Field label="Rate limit" value={config.maxRequestsPerMinute ? `${config.maxRequestsPerMinute}/min` : '—'} />
              <Field label="Status" value={config.status} />
              <Field label="Version" value={String(config.version)} />
              <Field label="Effective from" value={config.effectiveFrom ? formatDate(config.effectiveFrom) : '—'} />
              <Field label="Effective to" value={config.effectiveTo ? formatDate(config.effectiveTo) : '—'} />
            </div>
            {config.fallbackProviderKeys.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fallback providers</p>
                <p className="text-sm text-foreground">{config.fallbackProviderKeys.join(', ')}</p>
              </div>
            )}
            {history && history.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">History (rollback available)</p>
                <ul className="space-y-2">
                  {history.map((h) => (
                    <li key={h.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-2 text-sm">
                      <div>
                        <span className="font-medium text-foreground">v{h.version} · {h.status}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
                        {h.changeReason && <p className="mt-1 text-xs text-muted-foreground">{h.changeReason}</p>}
                      </div>
                      {h.version !== config.version && (
                        <Button size="sm" variant="ghost" onClick={() => rollback.mutate({ version: h.version })} disabled={rollback.isPending}>
                          Rollback to v{h.version}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
      <ReasonDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this configuration"
        confirmLabel="Delete"
        variant="danger"
        pending={remove.isPending}
        onSubmit={() => remove.mutate(undefined, { onSuccess: () => { setDeleteOpen(false); onClose(); } })}
      />
    </Dialog>
  );
}

function CredentialsTab() {
  const [providerKey, setProviderKey] = useState('');
  const [status, setStatus] = useState<NotificationProviderCredentialStatus | ''>('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useNotificationProviderCredentials({ providerKey: providerKey || undefined, status: status || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!providerKey || !!status} onClearFilters={() => { setProviderKey(''); setStatus(''); setPage(1); }}>
          <Input value={providerKey} onChange={(e) => { setProviderKey(e.target.value); setPage(1); }} placeholder="Provider key" className="h-9 w-44" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as NotificationProviderCredentialStatus | ''); setPage(1); }} placeholder="All statuses" options={CREDENTIAL_STATUS_OPTIONS} className="h-9 w-44" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Add credential
        </Button>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">
        <ShieldCheck className="mr-1.5 inline h-4 w-4 align-text-bottom" />
        Secret values are never displayed here — only status, expiry and rotation metadata.
      </p>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No credentials configured yet" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Credential set</TableHead>
                <TableHead>Provider / Channel</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Last rotated</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((c) => (
                <CredentialRow key={c.id} credential={c} />
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <CreateCredentialDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CredentialRow({
  credential,
}: {
  credential: { id: string; credentialSetName: string; providerKey: string; channel: string; status: NotificationProviderCredentialStatus; expiresAt?: string | null; lastRotatedAt?: string | null };
}) {
  const toast = useToast();
  const revoke = useRevokeNotificationProviderCredential(credential.id);
  const validate = useValidateNotificationProviderConnection(credential.id);
  const rotate = useRotateNotificationProviderCredential(credential.id);
  const { data: history } = useNotificationProviderCredentialHistory(credential.id);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [rotateFields, setRotateFields] = useState('{}');

  const isExpiringSoon = credential.expiresAt && new Date(credential.expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  const actions: ActionMenuItem[] = [
    {
      label: 'Test connection',
      icon: Plug,
      onSelect: () =>
        validate.mutate(undefined, {
          onSuccess: (result) =>
            result.valid
              ? toast.success('Connection valid', result.message)
              : toast.error('Connection invalid', result.message),
        }),
    },
    { label: 'Rotate', onSelect: () => setRotateOpen(true) },
    { label: 'View history', onSelect: () => setHistoryOpen(true) },
  ];
  if (credential.status !== 'REVOKED') actions.push({ label: 'Revoke', onSelect: () => revoke.mutate(), destructive: true, separatorBefore: true });

  return (
    <TableRow>
      <TableCell className="text-sm font-medium text-foreground">{credential.credentialSetName}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{credential.providerKey} · {credential.channel}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {credential.expiresAt ? formatDate(credential.expiresAt) : '—'}
        {isExpiringSoon && <span className="ml-1.5 text-xs text-warning">expiring soon</span>}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{credential.lastRotatedAt ? formatDate(credential.lastRotatedAt) : 'Never'}</TableCell>
      <TableCell>
        <StatusBadge status={credential.status} tone={CREDENTIAL_STATUS_TONE[credential.status]} />
      </TableCell>
      <TableCell className="text-right">
        <ActionMenu items={actions} />
      </TableCell>

      <Dialog open={rotateOpen} onOpenChange={setRotateOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Rotate credential</DialogTitle>
          </DialogHeader>
          <FormField label="New fields (JSON)" htmlFor="rotate-fields" required hint="Encrypted immediately; the old values are superseded.">
            <Input id="rotate-fields" value={rotateFields} onChange={(e) => setRotateFields(e.target.value)} className="font-mono text-xs" />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRotateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                try {
                  rotate.mutate({ fields: JSON.parse(rotateFields) }, { onSuccess: () => { setRotateOpen(false); setRotateFields('{}'); } });
                } catch {
                  // invalid JSON — no-op
                }
              }}
              disabled={rotate.isPending}
            >
              {rotate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Rotate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Credential history</DialogTitle>
          </DialogHeader>
          {!history || history.length === 0 ? (
            <EmptyState title="No history yet" className="border-none py-8" />
          ) : (
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.id} className="rounded-[var(--radius)] border border-border p-2 text-sm">
                  <span className="font-medium text-foreground">v{h.version} · {h.status}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
                  {h.changeReason && <p className="mt-1 text-muted-foreground">{h.changeReason}</p>}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </TableRow>
  );
}

function CreateCredentialDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateNotificationProviderCredential();
  const [form, setForm] = useState<Omit<CreateNotificationProviderCredentialPayload, 'workspaceId' | 'fields'>>({ providerKey: '', channel: '', credentialSetName: '' });
  const [fields, setFields] = useState('{}');
  const reset = () => { setForm({ providerKey: '', channel: '', credentialSetName: '' }); setFields('{}'); };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Add credential</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Provider key" htmlFor="cred-provider" required>
            <Input id="cred-provider" value={form.providerKey} onChange={(e) => setForm((f) => ({ ...f, providerKey: e.target.value }))} />
          </FormField>
          <FormField label="Channel" htmlFor="cred-channel" required>
            <Input id="cred-channel" value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value.toUpperCase() }))} />
          </FormField>
          <FormField label="Credential set name" htmlFor="cred-name" required>
            <Input id="cred-name" value={form.credentialSetName} onChange={(e) => setForm((f) => ({ ...f, credentialSetName: e.target.value }))} />
          </FormField>
          <FormField label="Fields (JSON)" htmlFor="cred-fields" required hint="Encrypted immediately server-side; never displayed again.">
            <Input id="cred-fields" value={fields} onChange={(e) => setFields(e.target.value)} placeholder='{"apiKey":"...","apiSecret":"..."}' className="font-mono text-xs" />
          </FormField>
          <FormField label="Expires at" htmlFor="cred-expires">
            <Input id="cred-expires" type="date" value={form.expiresAt ?? ''} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value || undefined }))} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              try {
                create.mutate({ ...form, fields: JSON.parse(fields) }, { onSuccess: () => { onOpenChange(false); reset(); } });
              } catch {
                // invalid JSON — no-op
              }
            }}
            disabled={!form.providerKey || !form.channel || !form.credentialSetName || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeliveriesTab() {
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotificationDeliveries({ channel: channel || undefined, status: status || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4">
        <FilterBar hasActiveFilters={!!channel || !!status} onClearFilters={() => { setChannel(''); setStatus(''); setPage(1); }}>
          <Input value={channel} onChange={(e) => { setChannel(e.target.value); setPage(1); }} placeholder="Channel" className="h-9 w-40" />
          <Input value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder="Status" className="h-9 w-40" />
        </FilterBar>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No deliveries found" />
      ) : (
        <>
          <div className="space-y-2">
            {data.data.map((d) => (
              <DeliveryRow key={d.id} delivery={d} />
            ))}
          </div>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}
    </div>
  );
}

function DeliveryRow({
  delivery,
}: {
  delivery: { id: string; channel: string; providerKey?: string | null; recipientAddress: string; status: string; attemptNumber: number; isRetry: boolean; isFallback: boolean; errorMessage?: string | null; latencyMs?: number | null; createdAt: string };
}) {
  const cancel = useCancelNotificationDelivery(delivery.id);
  const cancellable = !['DELIVERED', 'FAILED', 'CANCELLED', 'READ', 'OPENED'].includes(delivery.status);

  return (
    <div className="rounded-[var(--radius)] border border-border p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">
          {delivery.channel} → {delivery.recipientAddress}
        </span>
        <div className="flex items-center gap-2">
          <StatusBadge status={delivery.status} />
          {cancellable && (
            <Button size="sm" variant="ghost" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
              Cancel
            </Button>
          )}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {delivery.providerKey ?? '—'} · attempt {delivery.attemptNumber}
        {delivery.isRetry ? ' · retry' : ''}
        {delivery.isFallback ? ' · fallback' : ''}
        {delivery.latencyMs != null ? ` · ${delivery.latencyMs}ms` : ''} · {formatDate(delivery.createdAt)}
      </p>
      {delivery.errorMessage && <p className="mt-1 text-xs text-danger">{delivery.errorMessage}</p>}
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
