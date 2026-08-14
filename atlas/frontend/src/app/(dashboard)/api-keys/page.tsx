'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Loader2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
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
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import { SecretRevealDialog } from '@/components/developer/secret-reveal-dialog';
import {
  useApiKey,
  useApiKeyHistory,
  useApiKeys,
  useCreateApiKey,
  useDisableApiKey,
  useEnableApiKey,
  useRevokeApiKey,
  useRotateApiKey,
  useUpdateApiKey,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { ApiKeyScopeType, ApiKeyStatus, CreateApiKeyPayload } from '@/types';

const SCOPE_OPTIONS: { value: ApiKeyScopeType; label: string }[] = [
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'WORKSPACE', label: 'Workspace' },
  { value: 'USER', label: 'User' },
  { value: 'SERVICE_ACCOUNT', label: 'Service account' },
];

const STATUS_OPTIONS: { value: ApiKeyStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'REVOKED', label: 'Revoked' },
  { value: 'EXPIRED', label: 'Expired' },
];

function splitList(value: string): string[] | undefined {
  const items = value.split(/[\n,]/).map((v) => v.trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
}

export default function ApiKeysPage() {
  const [scopeType, setScopeType] = useState<ApiKeyScopeType | ''>('');
  const [status, setStatus] = useState<ApiKeyStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useApiKeys({
    scopeType: scopeType || undefined,
    status: status || undefined,
    search: search || undefined,
    page,
    limit,
  });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <PageHeader
        title="API Keys"
        description="Create, rotate, revoke and manage API keys and their scopes."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New API key
          </Button>
        }
      />

      <FilterBar
        hasActiveFilters={!!scopeType || !!status || !!search}
        onClearFilters={() => { setScopeType(''); setStatus(''); setSearch(''); setPage(1); }}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        className="mb-4"
      >
        <Select value={scopeType} onChange={(e) => { setScopeType(e.target.value as ApiKeyScopeType | ''); setPage(1); }} placeholder="All scopes" options={SCOPE_OPTIONS} className="h-9 w-40" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value as ApiKeyStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-40" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load API keys." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No API keys yet" description="Create an API key to let external systems call ATLAS on your behalf." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key ID</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead>Expires</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((k) => (
              <TableRow key={k.id} clickable onClick={() => setSelectedId(k.id)}>
                <TableCell className="text-sm font-medium text-foreground">{k.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{k.keyId}</TableCell>
                <TableCell className="text-sm text-muted-foreground capitalize">{k.scopeType.toLowerCase().replace('_', ' ')}</TableCell>
                <TableCell>
                  <StatusBadge status={k.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{k.lastUsedAt ? formatDate(k.lastUsedAt) : 'Never'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{k.expiresAt ? formatDate(k.expiresAt) : 'No expiry'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={limit} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      )}

      <CreateApiKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(secret) => { setCreateOpen(false); setCreatedSecret(secret); }}
      />
      <SecretRevealDialog title="API key created" label="API Key" secret={createdSecret} onClose={() => setCreatedSecret(null)} />
      <ApiKeyDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreateApiKeyDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (secret: string) => void }) {
  const createKey = useCreateApiKey();
  const [form, setForm] = useState<CreateApiKeyPayload>({ name: '', scopeType: 'WORKSPACE' });
  const [scopesText, setScopesText] = useState('');
  const [permissionsText, setPermissionsText] = useState('');

  const reset = () => {
    setForm({ name: '', scopeType: 'WORKSPACE' });
    setScopesText('');
    setPermissionsText('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New API key</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Name" htmlFor="key-name" required>
            <Input id="key-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Description" htmlFor="key-desc">
            <Input id="key-desc" value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </FormField>
          <FormField label="Scope" htmlFor="key-scope" required>
            <Select id="key-scope" value={form.scopeType} onChange={(e) => setForm((f) => ({ ...f, scopeType: e.target.value as ApiKeyScopeType }))} options={SCOPE_OPTIONS} />
          </FormField>
          {form.scopeType === 'ORGANIZATION' && (
            <FormField label="Organization ID" htmlFor="key-org" required>
              <Input id="key-org" value={form.organizationId ?? ''} onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))} />
            </FormField>
          )}
          {form.scopeType === 'SERVICE_ACCOUNT' && (
            <FormField label="Service account handle" htmlFor="key-sa" required>
              <Input id="key-sa" value={form.serviceAccountHandle ?? ''} onChange={(e) => setForm((f) => ({ ...f, serviceAccountHandle: e.target.value }))} />
            </FormField>
          )}
          <FormField label="Scopes" htmlFor="key-scopes" hint="Comma or newline separated">
            <Textarea id="key-scopes" rows={2} value={scopesText} onChange={(e) => setScopesText(e.target.value)} />
          </FormField>
          <FormField label="Permissions" htmlFor="key-permissions" hint="Comma or newline separated">
            <Textarea id="key-permissions" rows={2} value={permissionsText} onChange={(e) => setPermissionsText(e.target.value)} />
          </FormField>
          <FormField label="Rate limit / minute" htmlFor="key-rate">
            <Input id="key-rate" type="number" min="1" value={form.rateLimitPerMinute ?? ''} onChange={(e) => setForm((f) => ({ ...f, rateLimitPerMinute: e.target.value ? Number(e.target.value) : undefined }))} />
          </FormField>
          <FormField label="Expires at" htmlFor="key-expires">
            <Input id="key-expires" type="date" value={form.expiresAt ?? ''} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value || undefined }))} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              createKey.mutate(
                { ...form, scopes: splitList(scopesText), permissions: splitList(permissionsText) },
                { onSuccess: (result) => { onCreated(result.plaintextKey); reset(); } },
              )
            }
            disabled={!form.name || createKey.isPending}
          >
            {createKey.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApiKeyDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: key, isLoading } = useApiKey(id ?? undefined);
  const { data: history } = useApiKeyHistory(id ?? undefined);
  const revoke = useRevokeApiKey(id ?? '');
  const disable = useDisableApiKey(id ?? '');
  const enable = useEnableApiKey(id ?? '');
  const rotate = useRotateApiKey(id ?? '');
  const update = useUpdateApiKey(id ?? '');
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [rotatedSecret, setRotatedSecret] = useState<string | null>(null);
  const [editingIps, setEditingIps] = useState(false);
  const [ipAllowlistText, setIpAllowlistText] = useState('');

  const actions: ActionMenuItem[] = [];
  if (key) {
    if (key.status === 'ACTIVE') {
      actions.push({ label: 'Rotate', onSelect: () => rotate.mutate(undefined, { onSuccess: (r) => setRotatedSecret(r.plaintextKey) }) });
      actions.push({ label: 'Disable', onSelect: () => disable.mutate() });
    }
    if (key.status === 'DISABLED') {
      actions.push({ label: 'Enable', onSelect: () => enable.mutate() });
    }
    if (key.status !== 'REVOKED') {
      actions.push({ label: 'Revoke', onSelect: () => setRevokeOpen(true), destructive: true, separatorBefore: true });
    }
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>API Key</span>
            {key && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !key ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Name" value={key.name} />
              <Field label="Key ID" value={key.keyId} />
              <Field label="Scope" value={key.scopeType} />
              <Field label="Status" value={key.status} />
              <Field label="Usage count" value={String(key.usageCount)} />
              <Field label="Last used" value={key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never'} />
              <Field label="Last used IP" value={key.lastUsedIp ?? '—'} />
              <Field label="Rate limit / min" value={key.rateLimitPerMinute != null ? String(key.rateLimitPerMinute) : '—'} />
              <Field label="Expires" value={key.expiresAt ? formatDate(key.expiresAt) : 'No expiry'} />
              <Field label="Owner user" value={key.ownerUserId ?? '—'} />
              <Field label="Service account" value={key.serviceAccountHandle ?? '—'} />
              <Field label="Grace period ends" value={key.gracePeriodEndsAt ? formatDate(key.gracePeriodEndsAt) : '—'} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scopes</p>
                <p className="text-sm text-foreground">{key.scopes.length > 0 ? key.scopes.join(', ') : '—'}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Permissions</p>
                <p className="text-sm text-foreground">{key.permissions.length > 0 ? key.permissions.join(', ') : '—'}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Environments</p>
                <p className="text-sm text-foreground">{key.environments.length > 0 ? key.environments.join(', ') : '—'}</p>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">IP allowlist</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setIpAllowlistText(key.ipAllowlist.join(', ')); setEditingIps(true); }}
                  >
                    Edit
                  </Button>
                </div>
                {editingIps ? (
                  <div className="space-y-2">
                    <Textarea rows={2} value={ipAllowlistText} onChange={(e) => setIpAllowlistText(e.target.value)} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => update.mutate({ ipAllowlist: splitList(ipAllowlistText) ?? [] }, { onSuccess: () => setEditingIps(false) })} disabled={update.isPending}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingIps(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground">{key.ipAllowlist.length > 0 ? key.ipAllowlist.join(', ') : 'Unrestricted'}</p>
                )}
              </div>
            </div>

            {history && history.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</p>
                <ul className="space-y-2">
                  {history.map((h) => (
                    <li key={h.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-2 text-sm">
                      <span className="text-foreground">{h.changeType}{h.reason ? ` · ${h.reason}` : ''}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
      <ReasonDialog open={revokeOpen} onOpenChange={setRevokeOpen} title="Revoke this API key" confirmLabel="Revoke" variant="danger" pending={revoke.isPending} onSubmit={(reason) => revoke.mutate(reason, { onSuccess: () => setRevokeOpen(false) })} />
      <SecretRevealDialog title="API key rotated" label="New API Key" secret={rotatedSecret} onClose={() => setRotatedSecret(null)} />
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
