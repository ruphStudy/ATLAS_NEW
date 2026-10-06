'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Loader2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  useArchiveOAuthClient,
  useAuthorizeOAuthConnection,
  useConnectOAuthClientCredentials,
  useDisableOAuthClient,
  useDisconnectOAuthConnection,
  useEnableOAuthClient,
  useOAuthClient,
  useOAuthClientHistory,
  useOAuthClients,
  useOAuthConnection,
  useOAuthConnectionHistory,
  useOAuthConnections,
  useRefreshOAuthConnection,
  useRegisterOAuthClient,
  useRevokeOAuthClient,
  useRevokeOAuthConnection,
  useRotateOAuthClientSecret,
  useTestOAuthConnection,
  useUpdateOAuthClient,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { OAuthClientStatus, OAuthConnectionStatus, OAuthScopeType, RegisterOAuthClientPayload } from '@/types';

const SCOPE_OPTIONS: { value: OAuthScopeType; label: string }[] = [
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'WORKSPACE', label: 'Workspace' },
  { value: 'USER', label: 'User' },
  { value: 'SERVICE_ACCOUNT', label: 'Service account' },
];

const CLIENT_STATUS_OPTIONS: { value: OAuthClientStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'REVOKED', label: 'Revoked' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const CONNECTION_STATUS_OPTIONS: { value: OAuthConnectionStatus; label: string }[] = [
  { value: 'CONNECTED', label: 'Connected' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'REVOKED', label: 'Revoked' },
  { value: 'DISCONNECTED', label: 'Disconnected' },
];

const GRANT_TYPE_OPTIONS = [
  { value: 'AUTHORIZATION_CODE', label: 'Authorization code' },
  { value: 'CLIENT_CREDENTIALS', label: 'Client credentials' },
];

function splitList(value: string): string[] | undefined {
  const items = value.split(/[\n,]/).map((v) => v.trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
}

export default function OAuthConnectionsPage() {
  return (
    <div>
      <PageHeader title="OAuth Connections" description="Register provider clients and manage authorized connections, tokens and scopes." />
      <Tabs defaultValue="clients">
        <TabsList>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
        </TabsList>
        <TabsContent value="clients">
          <ClientsTab />
        </TabsContent>
        <TabsContent value="connections">
          <ConnectionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ClientsTab() {
  const [status, setStatus] = useState<OAuthClientStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useOAuthClients({ status: status || undefined, search: search || undefined, page, limit });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar
          hasActiveFilters={!!status || !!search}
          onClearFilters={() => { setStatus(''); setSearch(''); setPage(1); }}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
        >
          <Select value={status} onChange={(e) => { setStatus(e.target.value as OAuthClientStatus | ''); setPage(1); }} placeholder="All statuses" options={CLIENT_STATUS_OPTIONS} className="h-9 w-40" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Register client
        </Button>
      </div>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load OAuth clients." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No OAuth clients yet" description="Register a client for a provider that supports OAuth." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Grant types</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((c) => (
              <TableRow key={c.id} clickable onClick={() => setSelectedId(c.id)}>
                <TableCell className="text-sm font-medium text-foreground">{c.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.providerKey}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.grantTypes.join(', ')}</TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={limit} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      )}

      <RegisterClientDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ClientDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function RegisterClientDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const register = useRegisterOAuthClient();
  const [form, setForm] = useState<RegisterOAuthClientPayload>({
    name: '',
    scopeType: 'WORKSPACE',
    providerKey: '',
    clientId: '',
    clientSecret: '',
    redirectUris: [],
    grantTypes: ['AUTHORIZATION_CODE'],
    authorizationEndpoint: '',
    tokenEndpoint: '',
  });
  const [redirectUrisText, setRedirectUrisText] = useState('');
  const [scopesText, setScopesText] = useState('');

  const reset = () => {
    setForm({ name: '', scopeType: 'WORKSPACE', providerKey: '', clientId: '', clientSecret: '', redirectUris: [], grantTypes: ['AUTHORIZATION_CODE'], authorizationEndpoint: '', tokenEndpoint: '' });
    setRedirectUrisText('');
    setScopesText('');
  };

  const valid = form.name && form.providerKey && form.clientId && form.clientSecret && form.authorizationEndpoint && form.tokenEndpoint && splitList(redirectUrisText);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Register OAuth client</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="oc-name" required>
            <Input id="oc-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Provider key" htmlFor="oc-provider" required>
            <Input id="oc-provider" value={form.providerKey} onChange={(e) => setForm((f) => ({ ...f, providerKey: e.target.value }))} />
          </FormField>
          <FormField label="Scope" htmlFor="oc-scope" required>
            <Select id="oc-scope" value={form.scopeType} onChange={(e) => setForm((f) => ({ ...f, scopeType: e.target.value as typeof form.scopeType }))} options={SCOPE_OPTIONS} />
          </FormField>
          {form.scopeType === 'ORGANIZATION' && (
            <FormField label="Organization ID" htmlFor="oc-org" required>
              <Input id="oc-org" value={form.organizationId ?? ''} onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))} />
            </FormField>
          )}
          <FormField label="Client ID" htmlFor="oc-clientid" required hint="Not a secret — as issued by the provider">
            <Input id="oc-clientid" value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))} />
          </FormField>
          <FormField label="Client secret" htmlFor="oc-secret" required hint="As issued by the provider — never generated by ATLAS">
            <Input id="oc-secret" type="password" value={form.clientSecret} onChange={(e) => setForm((f) => ({ ...f, clientSecret: e.target.value }))} />
          </FormField>
          <FormField label="Authorization endpoint" htmlFor="oc-authep" required>
            <Input id="oc-authep" value={form.authorizationEndpoint} onChange={(e) => setForm((f) => ({ ...f, authorizationEndpoint: e.target.value }))} />
          </FormField>
          <FormField label="Token endpoint" htmlFor="oc-tokenep" required>
            <Input id="oc-tokenep" value={form.tokenEndpoint} onChange={(e) => setForm((f) => ({ ...f, tokenEndpoint: e.target.value }))} />
          </FormField>
          <FormField label="Revocation endpoint" htmlFor="oc-revep">
            <Input id="oc-revep" value={form.revocationEndpoint ?? ''} onChange={(e) => setForm((f) => ({ ...f, revocationEndpoint: e.target.value }))} />
          </FormField>
          <FormField label="User info endpoint" htmlFor="oc-userinfoep">
            <Input id="oc-userinfoep" value={form.userInfoEndpoint ?? ''} onChange={(e) => setForm((f) => ({ ...f, userInfoEndpoint: e.target.value }))} />
          </FormField>
          <FormField label="Environment" htmlFor="oc-env">
            <Input id="oc-env" value={form.environment ?? ''} onChange={(e) => setForm((f) => ({ ...f, environment: e.target.value }))} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Grant types" htmlFor="oc-grants" required>
              <div className="flex gap-4">
                {GRANT_TYPE_OPTIONS.map((g) => (
                  <label key={g.value} className="flex items-center gap-2 text-sm text-foreground">
                    <Checkbox
                      checked={form.grantTypes.includes(g.value)}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          grantTypes: e.target.checked ? [...f.grantTypes, g.value] : f.grantTypes.filter((v) => v !== g.value),
                        }))
                      }
                    />
                    {g.label}
                  </label>
                ))}
              </div>
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField label="Redirect URIs" htmlFor="oc-redirects" required hint="Comma or newline separated">
              <Textarea id="oc-redirects" rows={2} value={redirectUrisText} onChange={(e) => setRedirectUrisText(e.target.value)} />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField label="Scopes" htmlFor="oc-scopes" hint="Comma or newline separated">
              <Textarea id="oc-scopes" rows={2} value={scopesText} onChange={(e) => setScopesText(e.target.value)} />
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              register.mutate(
                { ...form, redirectUris: splitList(redirectUrisText) ?? [], scopes: splitList(scopesText) },
                { onSuccess: () => { onOpenChange(false); reset(); } },
              )
            }
            disabled={!valid || form.grantTypes.length === 0 || register.isPending}
          >
            {register.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClientDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: client, isLoading } = useOAuthClient(id ?? undefined);
  const { data: history } = useOAuthClientHistory(id ?? undefined);
  const enable = useEnableOAuthClient(id ?? '');
  const disable = useDisableOAuthClient(id ?? '');
  const revoke = useRevokeOAuthClient(id ?? '');
  const archive = useArchiveOAuthClient(id ?? '');
  const rotateSecret = useRotateOAuthClientSecret(id ?? '');
  const authorize = useAuthorizeOAuthConnection(id ?? '');
  const connectCC = useConnectOAuthClientCredentials(id ?? '');
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [newSecret, setNewSecret] = useState('');

  const actions: ActionMenuItem[] = [];
  if (client) {
    if (client.grantTypes.includes('AUTHORIZATION_CODE')) {
      actions.push({ label: 'Authorize connection', onSelect: () => authorize.mutate({ scopeType: client.scopeType }, { onSuccess: (r) => window.open(r.authorizationUrl, '_blank') }) });
    }
    if (client.grantTypes.includes('CLIENT_CREDENTIALS')) {
      actions.push({ label: 'Connect (client credentials)', onSelect: () => connectCC.mutate({ scopeType: client.scopeType }) });
    }
    actions.push({ label: 'Rotate secret', onSelect: () => setRotateOpen(true), separatorBefore: true });
    if (client.status === 'ACTIVE') {
      actions.push({ label: 'Disable', onSelect: () => disable.mutate() });
    } else if (client.status === 'DISABLED') {
      actions.push({ label: 'Enable', onSelect: () => enable.mutate() });
    }
    if (client.status !== 'REVOKED' && client.status !== 'ARCHIVED') {
      actions.push({ label: 'Revoke', onSelect: () => setRevokeOpen(true), destructive: true, separatorBefore: true });
    }
    if (client.status !== 'ARCHIVED') {
      actions.push({ label: 'Archive', onSelect: () => archive.mutate() });
    }
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>OAuth Client</span>
            {client && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !client ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Name" value={client.name} />
              <Field label="Provider" value={client.providerKey} />
              <Field label="Client ID" value={client.clientId} />
              <Field label="Scope" value={client.scopeType} />
              <Field label="Status" value={client.status} />
              <Field label="Environment" value={client.environment} />
              <Field label="Grant types" value={client.grantTypes.join(', ')} />
              <Field label="Authorization endpoint" value={client.authorizationEndpoint} />
              <Field label="Token endpoint" value={client.tokenEndpoint} />
              <Field label="Revocation endpoint" value={client.revocationEndpoint ?? '—'} />
              <Field label="User info endpoint" value={client.userInfoEndpoint ?? '—'} />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Redirect URIs</p>
              <p className="text-sm text-foreground">{client.redirectUris.join(', ')}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scopes</p>
              <p className="text-sm text-foreground">{client.scopes.length > 0 ? client.scopes.join(', ') : '—'}</p>
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
      <ReasonDialog open={revokeOpen} onOpenChange={setRevokeOpen} title="Revoke this client" confirmLabel="Revoke" variant="danger" pending={revoke.isPending} onSubmit={(reason) => revoke.mutate(reason, { onSuccess: () => setRevokeOpen(false) })} />
      <Dialog open={rotateOpen} onOpenChange={setRotateOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Rotate client secret</DialogTitle>
          </DialogHeader>
          <FormField label="New client secret" htmlFor="new-secret" required hint="As re-rolled on the provider's side">
            <Input id="new-secret" type="password" value={newSecret} onChange={(e) => setNewSecret(e.target.value)} />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRotateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => rotateSecret.mutate(newSecret, { onSuccess: () => { setRotateOpen(false); setNewSecret(''); } })} disabled={!newSecret || rotateSecret.isPending}>
              Rotate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function ConnectionsTab() {
  const [status, setStatus] = useState<OAuthConnectionStatus | ''>('');
  const [providerKey, setProviderKey] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useOAuthConnections({ status: status || undefined, providerKey: providerKey || undefined, page, limit });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <FilterBar
        hasActiveFilters={!!status || !!providerKey}
        onClearFilters={() => { setStatus(''); setProviderKey(''); setPage(1); }}
        className="mb-4"
      >
        <Input value={providerKey} onChange={(e) => { setProviderKey(e.target.value); setPage(1); }} placeholder="Provider key…" className="h-9 w-48" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value as OAuthConnectionStatus | ''); setPage(1); }} placeholder="All statuses" options={CONNECTION_STATUS_OPTIONS} className="h-9 w-40" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load OAuth connections." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No OAuth connections yet" description="Authorize a client to establish a connection." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Last used</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((c) => (
              <TableRow key={c.id} clickable onClick={() => setSelectedId(c.id)}>
                <TableCell className="text-sm font-medium text-foreground">{c.providerKey}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.externalAccountLabel ?? c.externalAccountId ?? '—'}</TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.accessTokenExpiresAt ? formatDate(c.accessTokenExpiresAt) : '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.lastUsedAt ? formatDate(c.lastUsedAt) : 'Never'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination page={page} limit={limit} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />
      )}

      <ConnectionDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function ConnectionDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: connection, isLoading } = useOAuthConnection(id ?? undefined);
  const { data: history } = useOAuthConnectionHistory(id ?? undefined);
  const refresh = useRefreshOAuthConnection(id ?? '');
  const revoke = useRevokeOAuthConnection(id ?? '');
  const disconnect = useDisconnectOAuthConnection(id ?? '');
  const test = useTestOAuthConnection(id ?? '');
  const [revokeOpen, setRevokeOpen] = useState(false);

  const actions: ActionMenuItem[] = [];
  if (connection) {
    actions.push({ label: 'Test connection', onSelect: () => test.mutate() });
    if (connection.status === 'CONNECTED' || connection.status === 'EXPIRED') {
      actions.push({ label: 'Refresh token', onSelect: () => refresh.mutate() });
    }
    if (connection.status !== 'DISCONNECTED') {
      actions.push({ label: 'Disconnect', onSelect: () => disconnect.mutate() });
    }
    if (connection.status !== 'REVOKED') {
      actions.push({ label: 'Revoke', onSelect: () => setRevokeOpen(true), destructive: true, separatorBefore: true });
    }
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>OAuth Connection</span>
            {connection && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !connection ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Provider" value={connection.providerKey} />
              <Field label="Account" value={connection.externalAccountLabel ?? connection.externalAccountId ?? '—'} />
              <Field label="Status" value={connection.status} />
              <Field label="Grant type" value={connection.grantType} />
              <Field label="Consented" value={connection.consentedAt ? formatDate(connection.consentedAt) : '—'} />
              <Field label="Token expires" value={connection.accessTokenExpiresAt ? formatDate(connection.accessTokenExpiresAt) : '—'} />
              <Field label="Last refreshed" value={connection.lastRefreshedAt ? formatDate(connection.lastRefreshedAt) : '—'} />
              <Field label="Last used" value={connection.lastUsedAt ? formatDate(connection.lastUsedAt) : '—'} />
              <Field label="Consecutive failures" value={String(connection.consecutiveFailures)} />
              <Field label="Last failure" value={connection.lastFailureAt ? formatDate(connection.lastFailureAt) : '—'} />
              <Field label="Last failure reason" value={connection.lastFailureReason ?? '—'} />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Granted scopes</p>
              <p className="text-sm text-foreground">{connection.grantedScopes.length > 0 ? connection.grantedScopes.join(', ') : '—'}</p>
            </div>
            {test.data && (
              <div className={`rounded-[var(--radius)] border p-3 text-sm ${test.data.success ? 'border-success/30 bg-success/5 text-success' : 'border-danger/30 bg-danger/5 text-danger'}`}>
                {test.data.success ? 'Connection test succeeded' : `Connection test failed${test.data.error ? `: ${test.data.error}` : ''}`}
                {test.data.latencyMs != null && ` · ${test.data.latencyMs}ms`}
              </div>
            )}
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
      <ReasonDialog open={revokeOpen} onOpenChange={setRevokeOpen} title="Revoke this connection" confirmLabel="Revoke" variant="danger" pending={revoke.isPending} onSubmit={(reason) => revoke.mutate(reason, { onSuccess: () => setRevokeOpen(false) })} />
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="break-all text-foreground">{value}</p>
    </div>
  );
}
