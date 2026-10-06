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
  useArchiveSsoConnection,
  useCreateSsoGroupRoleMapping,
  useDeleteSsoGroupRoleMapping,
  useDisableSsoConnection,
  useEnableSsoConnection,
  useRefreshSsoMetadata,
  useRegisterSsoConnection,
  useRevokeSsoConnection,
  useRotateSsoCertificate,
  useRotateSsoClientSecret,
  useSsoConnection,
  useSsoConnectionHistory,
  useSsoConnections,
  useSsoGroupRoleMappings,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { RegisterSsoConnectionPayload, SsoConnectionStatus, SsoProtocol, SsoScopeType } from '@/types';

const SCOPE_OPTIONS: { value: SsoScopeType; label: string }[] = [
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'WORKSPACE', label: 'Workspace' },
];

const PROTOCOL_OPTIONS: { value: SsoProtocol; label: string }[] = [
  { value: 'SAML', label: 'SAML' },
  { value: 'OIDC', label: 'OIDC' },
];

const STATUS_OPTIONS: { value: SsoConnectionStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'REVOKED', label: 'Revoked' },
  { value: 'ARCHIVED', label: 'Archived' },
];

function splitList(value: string): string[] {
  return value.split(/[\n,]/).map((v) => v.trim()).filter(Boolean);
}

export default function SsoConnectionsPage() {
  const [protocol, setProtocol] = useState<SsoProtocol | ''>('');
  const [status, setStatus] = useState<SsoConnectionStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useSsoConnections({ protocol: protocol || undefined, status: status || undefined, search: search || undefined, page, limit });
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <div>
      <PageHeader
        title="SSO Configuration"
        description="Configure SAML/OIDC single sign-on, domain enforcement and group-to-role mapping."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New SSO connection
          </Button>
        }
      />

      <FilterBar
        hasActiveFilters={!!protocol || !!status || !!search}
        onClearFilters={() => { setProtocol(''); setStatus(''); setSearch(''); setPage(1); }}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        className="mb-4"
      >
        <Select value={protocol} onChange={(e) => { setProtocol(e.target.value as SsoProtocol | ''); setPage(1); }} placeholder="All protocols" options={PROTOCOL_OPTIONS} className="h-9 w-36" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value as SsoConnectionStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-40" />
      </FilterBar>

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load SSO connections." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No SSO connections yet" description="Register a SAML or OIDC connection to enable single sign-on." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Protocol</TableHead>
              <TableHead>Domains</TableHead>
              <TableHead>Enforcement</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((c) => (
              <TableRow key={c.id} clickable onClick={() => setSelectedId(c.id)}>
                <TableCell className="text-sm font-medium text-foreground">{c.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.protocol}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.domains.join(', ')}</TableCell>
                <TableCell className="text-sm text-muted-foreground capitalize">{c.enforcementPolicy.toLowerCase()}</TableCell>
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

      <RegisterSsoDialog open={createOpen} onOpenChange={setCreateOpen} />
      <SsoConnectionDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function RegisterSsoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const register = useRegisterSsoConnection();
  const [form, setForm] = useState<RegisterSsoConnectionPayload>({ name: '', scopeType: 'WORKSPACE', protocol: 'SAML', domains: [] });
  const [domainsText, setDomainsText] = useState('');
  const [scopesText, setScopesText] = useState('');

  const reset = () => { setForm({ name: '', scopeType: 'WORKSPACE', protocol: 'SAML', domains: [] }); setDomainsText(''); setScopesText(''); };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>New SSO connection</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="sso-name" required>
            <Input id="sso-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Protocol" htmlFor="sso-protocol" required>
            <Select id="sso-protocol" value={form.protocol} onChange={(e) => setForm((f) => ({ ...f, protocol: e.target.value as SsoProtocol }))} options={PROTOCOL_OPTIONS} />
          </FormField>
          <FormField label="Scope" htmlFor="sso-scope" required>
            <Select id="sso-scope" value={form.scopeType} onChange={(e) => setForm((f) => ({ ...f, scopeType: e.target.value as SsoScopeType }))} options={SCOPE_OPTIONS} />
          </FormField>
          {form.scopeType === 'ORGANIZATION' && (
            <FormField label="Organization ID" htmlFor="sso-org" required>
              <Input id="sso-org" value={form.organizationId ?? ''} onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))} />
            </FormField>
          )}
          <div className="sm:col-span-2">
            <FormField label="Domains" htmlFor="sso-domains" required hint="Comma or newline separated, e.g. acme.com">
              <Textarea id="sso-domains" rows={2} value={domainsText} onChange={(e) => setDomainsText(e.target.value)} />
            </FormField>
          </div>

          {form.protocol === 'SAML' ? (
            <>
              <FormField label="Entity ID (IdP)" htmlFor="sso-entityid">
                <Input id="sso-entityid" value={form.entityId ?? ''} onChange={(e) => setForm((f) => ({ ...f, entityId: e.target.value }))} />
              </FormField>
              <FormField label="SSO URL" htmlFor="sso-ssourl">
                <Input id="sso-ssourl" value={form.ssoUrl ?? ''} onChange={(e) => setForm((f) => ({ ...f, ssoUrl: e.target.value }))} />
              </FormField>
              <FormField label="SLO URL" htmlFor="sso-slourl">
                <Input id="sso-slourl" value={form.sloUrl ?? ''} onChange={(e) => setForm((f) => ({ ...f, sloUrl: e.target.value }))} />
              </FormField>
              <FormField label="Metadata URL" htmlFor="sso-metaurl">
                <Input id="sso-metaurl" value={form.metadataUrl ?? ''} onChange={(e) => setForm((f) => ({ ...f, metadataUrl: e.target.value }))} />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="IdP signing certificate (PEM)" htmlFor="sso-cert">
                  <Textarea id="sso-cert" rows={4} value={form.certificate ?? ''} onChange={(e) => setForm((f) => ({ ...f, certificate: e.target.value }))} />
                </FormField>
              </div>
            </>
          ) : (
            <>
              <FormField label="Client ID" htmlFor="sso-clientid">
                <Input id="sso-clientid" value={form.clientId ?? ''} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))} />
              </FormField>
              <FormField label="Client secret" htmlFor="sso-clientsecret">
                <Input id="sso-clientsecret" type="password" value={form.clientSecret ?? ''} onChange={(e) => setForm((f) => ({ ...f, clientSecret: e.target.value }))} />
              </FormField>
              <FormField label="Issuer" htmlFor="sso-issuer">
                <Input id="sso-issuer" value={form.issuer ?? ''} onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))} />
              </FormField>
              <FormField label="Authorization endpoint" htmlFor="sso-authep">
                <Input id="sso-authep" value={form.authorizationEndpoint ?? ''} onChange={(e) => setForm((f) => ({ ...f, authorizationEndpoint: e.target.value }))} />
              </FormField>
              <FormField label="Token endpoint" htmlFor="sso-tokenep">
                <Input id="sso-tokenep" value={form.tokenEndpoint ?? ''} onChange={(e) => setForm((f) => ({ ...f, tokenEndpoint: e.target.value }))} />
              </FormField>
              <FormField label="JWKS URI" htmlFor="sso-jwks">
                <Input id="sso-jwks" value={form.jwksUri ?? ''} onChange={(e) => setForm((f) => ({ ...f, jwksUri: e.target.value }))} />
              </FormField>
              <FormField label="User info endpoint" htmlFor="sso-userinfo">
                <Input id="sso-userinfo" value={form.userInfoEndpoint ?? ''} onChange={(e) => setForm((f) => ({ ...f, userInfoEndpoint: e.target.value }))} />
              </FormField>
              <FormField label="End session endpoint" htmlFor="sso-endsession">
                <Input id="sso-endsession" value={form.endSessionEndpoint ?? ''} onChange={(e) => setForm((f) => ({ ...f, endSessionEndpoint: e.target.value }))} />
              </FormField>
            </>
          )}

          <div className="sm:col-span-2">
            <FormField label="Scopes / claims" htmlFor="sso-scopes" hint="Comma or newline separated">
              <Textarea id="sso-scopes" rows={2} value={scopesText} onChange={(e) => setScopesText(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Group claim name" htmlFor="sso-groupclaim">
            <Input id="sso-groupclaim" value={form.groupClaimName ?? ''} onChange={(e) => setForm((f) => ({ ...f, groupClaimName: e.target.value }))} />
          </FormField>
          <FormField label="Default role ID" htmlFor="sso-defaultrole" hint="Assigned to JIT-provisioned users with no group mapping">
            <Input id="sso-defaultrole" value={form.defaultRoleId ?? ''} onChange={(e) => setForm((f) => ({ ...f, defaultRoleId: e.target.value }))} />
          </FormField>
          <div className="flex items-center gap-2 pt-6">
            <Checkbox
              id="sso-jit"
              checked={form.jitProvisioningEnabled ?? false}
              onChange={(e) => setForm((f) => ({ ...f, jitProvisioningEnabled: e.target.checked }))}
            />
            <label htmlFor="sso-jit" className="text-sm text-foreground">
              Enable JIT provisioning
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              register.mutate(
                { ...form, domains: splitList(domainsText), scopes: splitList(scopesText) },
                { onSuccess: () => { onOpenChange(false); reset(); } },
              )
            }
            disabled={!form.name || splitList(domainsText).length === 0 || register.isPending}
          >
            {register.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SsoConnectionDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: connection, isLoading } = useSsoConnection(id ?? undefined);
  const { data: history } = useSsoConnectionHistory(id ?? undefined);
  const { data: mappings } = useSsoGroupRoleMappings(id ?? undefined);
  const enable = useEnableSsoConnection(id ?? '');
  const disable = useDisableSsoConnection(id ?? '');
  const revoke = useRevokeSsoConnection(id ?? '');
  const archive = useArchiveSsoConnection(id ?? '');
  const refreshMetadata = useRefreshSsoMetadata(id ?? '');
  const rotateCert = useRotateSsoCertificate(id ?? '');
  const rotateClientSecret = useRotateSsoClientSecret(id ?? '');
  const createMapping = useCreateSsoGroupRoleMapping(id ?? '');
  const deleteMapping = useDeleteSsoGroupRoleMapping(id ?? '');
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [newCert, setNewCert] = useState('');
  const [secretOpen, setSecretOpen] = useState(false);
  const [newSecret, setNewSecret] = useState('');
  const [mappingGroup, setMappingGroup] = useState('');
  const [mappingRoleId, setMappingRoleId] = useState('');

  const actions: ActionMenuItem[] = [];
  if (connection) {
    if (connection.protocol === 'SAML') {
      actions.push({ label: 'Rotate certificate', onSelect: () => setCertOpen(true) });
    } else {
      actions.push({ label: 'Rotate client secret', onSelect: () => setSecretOpen(true) });
    }
    actions.push({ label: 'Refresh metadata', onSelect: () => refreshMetadata.mutate() });
    if (connection.status === 'ACTIVE') {
      actions.push({ label: 'Disable', onSelect: () => disable.mutate() });
    } else if (connection.status === 'DISABLED') {
      actions.push({ label: 'Enable', onSelect: () => enable.mutate() });
    }
    if (connection.status !== 'REVOKED' && connection.status !== 'ARCHIVED') {
      actions.push({ label: 'Revoke', onSelect: () => setRevokeOpen(true), destructive: true, separatorBefore: true });
    }
    if (connection.status !== 'ARCHIVED') {
      actions.push({ label: 'Archive', onSelect: () => archive.mutate() });
    }
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>SSO Connection</span>
            {connection && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !connection ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="mappings">Group → Role Mappings</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <Field label="Name" value={connection.name} />
                <Field label="Protocol" value={connection.protocol} />
                <Field label="Status" value={connection.status} />
                <Field label="Enforcement" value={connection.enforcementPolicy} />
                <Field label="Domains" value={connection.domains.join(', ')} />
                <Field label="Issuer" value={connection.issuer ?? '—'} />
                <Field label="Entity ID" value={connection.entityId ?? '—'} />
                <Field label="Client ID" value={connection.clientId ?? '—'} />
                <Field label="SSO URL" value={connection.ssoUrl ?? '—'} />
                <Field label="SLO URL" value={connection.sloUrl ?? '—'} />
                <Field label="Metadata URL" value={connection.metadataUrl ?? '—'} />
                <Field label="Metadata fetched" value={connection.metadataFetchedAt ? formatDate(connection.metadataFetchedAt) : '—'} />
                <Field label="JIT provisioning" value={connection.jitProvisioningEnabled ? 'Enabled' : 'Disabled'} />
                <Field label="Group claim name" value={connection.groupClaimName ?? '—'} />
                <Field label="Default role" value={connection.defaultRoleId ?? '—'} />
              </div>
            </TabsContent>

            <TabsContent value="mappings">
              <div className="mb-3 flex flex-wrap items-end gap-2">
                <FormField label="External group" htmlFor="map-group">
                  <Input id="map-group" value={mappingGroup} onChange={(e) => setMappingGroup(e.target.value)} className="h-9 w-48" />
                </FormField>
                <FormField label="Role ID" htmlFor="map-role">
                  <Input id="map-role" value={mappingRoleId} onChange={(e) => setMappingRoleId(e.target.value)} className="h-9 w-48" />
                </FormField>
                <Button
                  size="sm"
                  onClick={() => createMapping.mutate({ externalGroup: mappingGroup, roleId: mappingRoleId }, { onSuccess: () => { setMappingGroup(''); setMappingRoleId(''); } })}
                  disabled={!mappingGroup || !mappingRoleId || createMapping.isPending}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add mapping
                </Button>
              </div>
              {!mappings || mappings.length === 0 ? (
                <EmptyState title="No group mappings yet" className="border-none py-8" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>External group</TableHead>
                      <TableHead>Role ID</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm text-foreground">{m.externalGroup}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.roleId}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.priority}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => deleteMapping.mutate(m.id)} disabled={deleteMapping.isPending}>
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="history">
              {!history || history.length === 0 ? (
                <EmptyState title="No history yet" className="border-none py-8" />
              ) : (
                <ul className="space-y-2">
                  {history.map((h) => (
                    <li key={h.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-2 text-sm">
                      <span className="text-foreground">{h.changeType}{h.reason ? ` · ${h.reason}` : ''}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>

      <ReasonDialog open={revokeOpen} onOpenChange={setRevokeOpen} title="Revoke this SSO connection" confirmLabel="Revoke" variant="danger" pending={revoke.isPending} onSubmit={(reason) => revoke.mutate(reason, { onSuccess: () => setRevokeOpen(false) })} />

      <Dialog open={certOpen} onOpenChange={setCertOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Rotate signing certificate</DialogTitle>
          </DialogHeader>
          <FormField label="New certificate (PEM)" htmlFor="new-cert" required hint="As re-issued on the identity provider's side">
            <Textarea id="new-cert" rows={5} value={newCert} onChange={(e) => setNewCert(e.target.value)} />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCertOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => rotateCert.mutate({ certificate: newCert }, { onSuccess: () => { setCertOpen(false); setNewCert(''); } })} disabled={!newCert || rotateCert.isPending}>
              Rotate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={secretOpen} onOpenChange={setSecretOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Rotate client secret</DialogTitle>
          </DialogHeader>
          <FormField label="New client secret" htmlFor="new-oidc-secret" required hint="As re-rolled on the identity provider's side">
            <Input id="new-oidc-secret" type="password" value={newSecret} onChange={(e) => setNewSecret(e.target.value)} />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSecretOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => rotateClientSecret.mutate({ clientSecret: newSecret }, { onSuccess: () => { setSecretOpen(false); setNewSecret(''); } })} disabled={!newSecret || rotateClientSecret.isPending}>
              Rotate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
