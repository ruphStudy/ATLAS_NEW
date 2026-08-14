'use client';

import { useState } from 'react';
import { Loader2, Plus, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import {
  useArchiveProviderRegistryEntry,
  useCreateProviderCredential,
  useCreateProviderRegistryEntry,
  useDisableProviderCredential,
  useDisableProviderRegistryEntry,
  useEnableProviderCredential,
  useEnableProviderRegistryEntry,
  useOnboardProviderExpansion,
  useProviderConfigs,
  useProviderCredentials,
  useProviderExpansions,
  useProviderRegistryEntries,
  useRevokeProviderCredential,
  useValidateProviderCredential,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { AiCapability, AiProviderCredential, AiProviderRegistryEntry, CredentialType, ProviderRegistrationStatus } from '@/types';

const CAPABILITY_OPTIONS: { value: AiCapability; label: string }[] = [
  { value: 'TEXT_GENERATION', label: 'Text generation' },
  { value: 'REASONING', label: 'Reasoning' },
  { value: 'VISION', label: 'Vision' },
  { value: 'IMAGE_GENERATION', label: 'Image generation' },
  { value: 'EMBEDDING', label: 'Embedding' },
  { value: 'VALIDATION', label: 'Validation' },
  { value: 'CLASSIFICATION', label: 'Classification' },
  { value: 'STRUCTURED_OUTPUT', label: 'Structured output' },
];

const CREDENTIAL_TYPE_OPTIONS: { value: CredentialType; label: string }[] = [
  { value: 'API_KEY', label: 'API key' },
  { value: 'OAUTH', label: 'OAuth' },
  { value: 'ACCESS_TOKEN', label: 'Access token' },
  { value: 'REFRESH_TOKEN', label: 'Refresh token' },
  { value: 'CUSTOM', label: 'Custom' },
];

export default function AiProvidersPage() {
  return (
    <div>
      <PageHeader title="AI Providers" description="Provider registry, configuration, credentials and rollout state." />
      <Tabs defaultValue="registry">
        <TabsList>
          <TabsTrigger value="registry">Registry</TabsTrigger>
          <TabsTrigger value="configs">Configurations</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="rollout">Rollout</TabsTrigger>
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
        <TabsContent value="rollout">
          <RolloutTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RegistryTab() {
  const [status, setStatus] = useState<ProviderRegistrationStatus | ''>('');
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useProviderRegistryEntries({ status: status || undefined, limit: 50 });
  const createEntry = useCreateProviderRegistryEntry();

  const [providerKey, setProviderKey] = useState('');
  const [adapterKey, setAdapterKey] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [capabilities, setCapabilities] = useState<AiCapability[]>([]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!status} onClearFilters={() => setStatus('')}>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProviderRegistrationStatus | '')}
            placeholder="All statuses"
            options={[
              { value: 'PENDING', label: 'Pending' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'DISABLED', label: 'Disabled' },
              { value: 'ARCHIVED', label: 'Archived' },
            ]}
            className="h-9 w-40"
          />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Register provider
        </Button>
      </div>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load the provider registry." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No providers registered yet" description="Register a provider to make it capability-resolvable across the platform." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Adapter</TableHead>
              <TableHead>Capabilities</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Default</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((entry) => (
              <RegistryRow key={entry.id} entry={entry} />
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Register provider</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Provider key" htmlFor="reg-provider" required>
                <Input id="reg-provider" value={providerKey} onChange={(e) => setProviderKey(e.target.value)} />
              </FormField>
              <FormField label="Adapter key" htmlFor="reg-adapter" required>
                <Input id="reg-adapter" value={adapterKey} onChange={(e) => setAdapterKey(e.target.value)} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Display name" htmlFor="reg-name" required>
                <Input id="reg-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </FormField>
              <FormField label="Version" htmlFor="reg-version" required>
                <Input id="reg-version" value={version} onChange={(e) => setVersion(e.target.value)} />
              </FormField>
            </div>
            <FormField label="Capabilities" htmlFor="reg-capabilities" required hint="Hold Cmd/Ctrl to select multiple.">
              <select
                id="reg-capabilities"
                multiple
                className="h-32 w-full rounded-[var(--radius)] border border-border bg-input p-2 text-sm text-foreground"
                value={capabilities}
                onChange={(e) => setCapabilities(Array.from(e.target.selectedOptions, (o) => o.value as AiCapability))}
              >
                {CAPABILITY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                createEntry.mutate(
                  { providerKey, adapterKey, displayName, version, capabilities },
                  { onSuccess: () => { setCreateOpen(false); setProviderKey(''); setAdapterKey(''); setDisplayName(''); setCapabilities([]); } },
                )
              }
              disabled={!providerKey || !adapterKey || !displayName || capabilities.length === 0 || createEntry.isPending}
            >
              {createEntry.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RegistryRow({ entry }: { entry: AiProviderRegistryEntry }) {
  const enable = useEnableProviderRegistryEntry(entry.id);
  const disable = useDisableProviderRegistryEntry(entry.id);
  const archive = useArchiveProviderRegistryEntry(entry.id);

  const actions: ActionMenuItem[] = [];
  if (entry.status !== 'ACTIVE') actions.push({ label: 'Enable', onSelect: () => enable.mutate() });
  if (entry.status === 'ACTIVE') actions.push({ label: 'Disable', onSelect: () => disable.mutate() });
  if (entry.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => archive.mutate(), destructive: true, separatorBefore: true });

  return (
    <TableRow>
      <TableCell className="text-sm font-medium text-foreground">{entry.displayName} <span className="text-xs text-muted-foreground">({entry.providerKey})</span></TableCell>
      <TableCell className="text-sm text-muted-foreground">{entry.adapterKey} · v{entry.version}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{entry.capabilities.join(', ')}</TableCell>
      <TableCell>
        <StatusBadge status={entry.status} />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{entry.isDefault ? 'Yes' : 'No'}</TableCell>
      <TableCell className="text-right">
        <ActionMenu items={actions} />
      </TableCell>
    </TableRow>
  );
}

function ConfigsTab() {
  const { data, isLoading, isError, refetch } = useProviderConfigs({ limit: 50 });

  return (
    <div>
      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load provider configurations." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No configurations yet" description="Configurations define timeouts, retries, rate limits and model defaults per provider/scope." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Priority</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-sm font-medium text-foreground">{c.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.scope}{c.useCase ? ` · ${c.useCase}` : ''}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.providerKey}{c.modelId ? ` · ${c.modelId}` : ''}</TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">v{c.version}{c.publishedVersion ? ` (published v${c.publishedVersion})` : ''}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.priority}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function CredentialsTab() {
  const { data, isLoading, isError, refetch } = useProviderCredentials({ limit: 50 });
  const [createOpen, setCreateOpen] = useState(false);
  const createCredential = useCreateProviderCredential();

  const [providerKey, setProviderKey] = useState('');
  const [credentialSetName, setCredentialSetName] = useState('');
  const [type, setType] = useState<CredentialType>('API_KEY');
  const [apiKeyValue, setApiKeyValue] = useState('');

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <ShieldCheck className="mr-1.5 inline h-4 w-4 align-text-bottom" />
          Secret values are never displayed here — only configuration status.
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Add credential
        </Button>
      </div>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load credentials." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No credentials configured yet" description="Add a credential set to authorize a provider." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Credential set</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((c) => (
              <CredentialRow key={c.id} credential={c} />
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Add credential</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Provider key" htmlFor="cred-provider" required>
              <Input id="cred-provider" value={providerKey} onChange={(e) => setProviderKey(e.target.value)} />
            </FormField>
            <FormField label="Credential set name" htmlFor="cred-name" required>
              <Input id="cred-name" value={credentialSetName} onChange={(e) => setCredentialSetName(e.target.value)} />
            </FormField>
            <FormField label="Type" htmlFor="cred-type" required>
              <Select id="cred-type" value={type} onChange={(e) => setType(e.target.value as CredentialType)} options={CREDENTIAL_TYPE_OPTIONS} />
            </FormField>
            <FormField label="API key value" htmlFor="cred-value" required hint="Encrypted immediately server-side; never displayed again.">
              <Input id="cred-value" type="password" value={apiKeyValue} onChange={(e) => setApiKeyValue(e.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                createCredential.mutate(
                  { providerKey, credentialSetName, type, fields: { apiKey: apiKeyValue } },
                  { onSuccess: () => { setCreateOpen(false); setProviderKey(''); setCredentialSetName(''); setApiKeyValue(''); } },
                )
              }
              disabled={!providerKey || !credentialSetName || !apiKeyValue || createCredential.isPending}
            >
              {createCredential.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CredentialRow({ credential }: { credential: AiProviderCredential }) {
  const enable = useEnableProviderCredential(credential.id);
  const disable = useDisableProviderCredential(credential.id);
  const revoke = useRevokeProviderCredential(credential.id);
  const validate = useValidateProviderCredential(credential.id);

  const actions: ActionMenuItem[] = [
    { label: 'Test connection', onSelect: () => validate.mutate() },
  ];
  if (credential.status !== 'ACTIVE' && credential.status !== 'REVOKED') actions.push({ label: 'Enable', onSelect: () => enable.mutate() });
  if (credential.status === 'ACTIVE') actions.push({ label: 'Disable', onSelect: () => disable.mutate() });
  if (credential.status !== 'REVOKED') actions.push({ label: 'Revoke', onSelect: () => revoke.mutate(), destructive: true, separatorBefore: true });

  return (
    <TableRow>
      <TableCell className="text-sm font-medium text-foreground">{credential.credentialSetName}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{credential.providerKey}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{credential.type}</TableCell>
      <TableCell>
        <StatusBadge status={credential.status} />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{credential.expiresAt ? formatDate(credential.expiresAt) : '—'}</TableCell>
      <TableCell className="text-right">
        <ActionMenu items={actions} />
      </TableCell>
    </TableRow>
  );
}

function RolloutTab() {
  const { data, isLoading, isError, refetch } = useProviderExpansions({ limit: 50 });
  const [onboardOpen, setOnboardOpen] = useState(false);
  const onboard = useOnboardProviderExpansion();
  const [providerKey, setProviderKey] = useState('');

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setOnboardOpen(true)}>
          <Plus className="h-4 w-4" />
          Onboard provider
        </Button>
      </div>

      {isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load rollout data." />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No providers onboarded yet" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.data.map((e) => (
            <Card key={e.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>{e.providerKey}</span>
                  <StatusBadge status={e.rolloutState} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <p>Version {e.version} · API {e.apiVersionLabel ?? '—'}</p>
                <p>Compatibility: <StatusBadge status={e.adapterCompatibilityStatus} className="ml-1" /></p>
                <p>Eligibility: {e.eligibilityScope}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={onboardOpen} onOpenChange={setOnboardOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Onboard provider</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Provider key" htmlFor="onboard-provider" required>
              <Input id="onboard-provider" value={providerKey} onChange={(e) => setProviderKey(e.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOnboardOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => onboard.mutate({ providerKey }, { onSuccess: () => { setOnboardOpen(false); setProviderKey(''); } })}
              disabled={!providerKey || onboard.isPending}
            >
              Onboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
