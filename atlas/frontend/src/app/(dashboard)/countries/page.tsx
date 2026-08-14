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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import {
  useArchiveCountry,
  useCountries,
  useCountryById,
  useCountryHistory,
  useCountryProviderAvailability,
  useCreateCountry,
  useDeprecateCountry,
  useDisableCountry,
  useEnableCountry,
  useRestoreCountry,
  useSetDefaultWorkspaceCountry,
  useUpdateCountry,
  useUpsertWorkspaceCountryConfig,
  useValidateCountryCombination,
  useWorkspaceCountryConfigs,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import type { CountryStatus, CreateCountryPayload } from '@/types';

const STATUS_OPTIONS: { value: CountryStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'DEPRECATED', label: 'Deprecated' },
  { value: 'ARCHIVED', label: 'Archived' },
];

function useWorkspaceId() {
  return useAuthStore((s) => s.user?.workspaceId);
}

export default function CountriesPage() {
  const [status, setStatus] = useState<CountryStatus | ''>('');
  const [region, setRegion] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useCountries({ status: status || undefined, region: region || undefined, search: search || undefined, page, limit: 20 });

  return (
    <div>
      <PageHeader
        title="Countries"
        description="Manage supported countries, locale, timezone, currency, tax regime and provider availability."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Register country
          </Button>
        }
      />

      <FilterBar
        hasActiveFilters={!!status || !!region || !!search}
        onClearFilters={() => { setStatus(''); setRegion(''); setSearch(''); setPage(1); }}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
      >
        <Select value={status} onChange={(e) => { setStatus(e.target.value as CountryStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-40" />
        <Input value={region} onChange={(e) => { setRegion(e.target.value); setPage(1); }} placeholder="Region" className="h-9 w-36" />
      </FilterBar>

      {isLoading ? (
        <Skeleton className="mt-4 h-64 w-full" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No countries found" description="Register a country to get started." className="mt-4" />
      ) : (
        <>
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Locale</TableHead>
                <TableHead>Tax regime</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((c) => (
                <TableRow key={c.id} clickable onClick={() => setSelectedId(c.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{c.code}</TableCell>
                  <TableCell className="text-sm text-foreground">{c.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.region ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.currency}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.locale}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.taxRegime ?? '—'}</TableCell>
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

      <CreateCountryDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CountryDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreateCountryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateCountry();
  const [form, setForm] = useState<CreateCountryPayload>({ code: '', name: '', timezone: '', locale: '', currency: '', language: '' });

  const reset = () => setForm({ code: '', name: '', timezone: '', locale: '', currency: '', language: '' });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Register country</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="ISO code" htmlFor="c-code" required>
            <Input id="c-code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="US" />
          </FormField>
          <FormField label="Name" htmlFor="c-name" required>
            <Input id="c-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Region" htmlFor="c-region">
            <Input id="c-region" value={form.region ?? ''} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} />
          </FormField>
          <FormField label="Timezone" htmlFor="c-tz" required>
            <Input id="c-tz" value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))} placeholder="America/New_York" />
          </FormField>
          <FormField label="Locale" htmlFor="c-locale" required>
            <Input id="c-locale" value={form.locale} onChange={(e) => setForm((f) => ({ ...f, locale: e.target.value }))} placeholder="en-US" />
          </FormField>
          <FormField label="Currency" htmlFor="c-currency" required>
            <Input id="c-currency" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} placeholder="USD" />
          </FormField>
          <FormField label="Language" htmlFor="c-lang" required>
            <Input id="c-lang" value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} placeholder="en" />
          </FormField>
          <FormField label="Tax regime" htmlFor="c-tax">
            <Input id="c-tax" value={form.taxRegime ?? ''} onChange={(e) => setForm((f) => ({ ...f, taxRegime: e.target.value }))} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.code || !form.name || !form.timezone || !form.locale || !form.currency || !form.language || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CountryDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: country, isLoading } = useCountryById(id ?? undefined);
  const enable = useEnableCountry(id ?? '');
  const disable = useDisableCountry(id ?? '');
  const deprecate = useDeprecateCountry(id ?? '');
  const archive = useArchiveCountry(id ?? '');
  const restore = useRestoreCountry(id ?? '');
  const update = useUpdateCountry(id ?? '');
  const [editName, setEditName] = useState('');

  const actions: ActionMenuItem[] = [];
  if (country) {
    if (country.status === 'DRAFT' || country.status === 'DISABLED') actions.push({ label: 'Enable', onSelect: () => enable.mutate() });
    if (country.status === 'ACTIVE') actions.push({ label: 'Disable', onSelect: () => disable.mutate() });
    if (country.status === 'ACTIVE' || country.status === 'DISABLED') actions.push({ label: 'Deprecate', onSelect: () => deprecate.mutate() });
    if (country.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => archive.mutate(), destructive: true, separatorBefore: true });
    if (country.status === 'ARCHIVED') actions.push({ label: 'Restore', onSelect: () => restore.mutate() });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{country?.name ?? 'Country'}</span>
            {country && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !country ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="workspace">Workspace Config</TabsTrigger>
              <TabsTrigger value="availability">Provider Availability</TabsTrigger>
              <TabsTrigger value="validate">Validate</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <Field label="Code" value={country.code} />
                <Field label="Name" value={country.name} />
                <Field label="Region" value={country.region ?? '—'} />
                <Field label="Timezone" value={country.timezone} />
                <Field label="Locale" value={country.locale} />
                <Field label="Currency" value={country.currency} />
                <Field label="Language" value={country.language} />
                <Field label="Tax regime" value={country.taxRegime ?? '—'} />
                <Field label="Status" value={country.status} />
                <Field label="Version" value={String(country.version)} />
                <Field label="Effective from" value={country.effectiveFrom ? formatDate(country.effectiveFrom) : '—'} />
                <Field label="Effective to" value={country.effectiveTo ? formatDate(country.effectiveTo) : '—'} />
              </div>
              {country.supportedCurrencies.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Supported currencies</p>
                  <p className="text-sm text-foreground">{country.supportedCurrencies.join(', ')}</p>
                </div>
              )}
              {country.supportedLocales.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Supported locales</p>
                  <p className="text-sm text-foreground">{country.supportedLocales.join(', ')}</p>
                </div>
              )}
              {country.complianceRefs.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Compliance references</p>
                  <p className="text-sm text-foreground">{country.complianceRefs.join(', ')}</p>
                </div>
              )}
              <div className="mt-4 flex items-end gap-2">
                <FormField label="Rename country" htmlFor="c-rename">
                  <Input id="c-rename" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={country.name} className="h-9 w-64" />
                </FormField>
                <Button size="sm" onClick={() => update.mutate({ name: editName }, { onSuccess: () => setEditName('') })} disabled={!editName || update.isPending}>
                  Save
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="workspace">
              <WorkspaceConfigTab countryCode={country.code} />
            </TabsContent>
            <TabsContent value="availability">
              <AvailabilityTab countryCode={country.code} />
            </TabsContent>
            <TabsContent value="validate">
              <ValidateTab countryCode={country.code} currency={country.currency} locale={country.locale} />
            </TabsContent>
            <TabsContent value="history">
              <HistoryTab id={country.id} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function WorkspaceConfigTab({ countryCode }: { countryCode: string }) {
  const workspaceId = useWorkspaceId();
  const { data: configs, isLoading } = useWorkspaceCountryConfigs(workspaceId);
  const upsert = useUpsertWorkspaceCountryConfig(workspaceId ?? '');
  const setDefault = useSetDefaultWorkspaceCountry(workspaceId ?? '');

  const current = configs?.find((c) => c.countryCode === countryCode);

  if (!workspaceId) return <p className="py-6 text-center text-sm text-muted-foreground">No active workspace.</p>;
  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="space-y-3">
      {current ? (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Enabled" value={current.isEnabled ? 'Yes' : 'No'} />
          <Field label="Default" value={current.isDefault ? 'Yes' : 'No'} />
          <Field label="Preferred" value={current.isPreferred ? 'Yes' : 'No'} />
          <Field label="Priority" value={String(current.priority)} />
          <Field label="Fallback country" value={current.fallbackCountryCode ?? '—'} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Not configured for this workspace.</p>
      )}
      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => upsert.mutate({ countryCode, isEnabled: !(current?.isEnabled ?? false) })}
          disabled={upsert.isPending}
        >
          {current?.isEnabled ? 'Disable for workspace' : 'Enable for workspace'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setDefault.mutate(countryCode)} disabled={setDefault.isPending}>
          Set as default
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => upsert.mutate({ countryCode, isPreferred: !(current?.isPreferred ?? false) })}
          disabled={upsert.isPending}
        >
          {current?.isPreferred ? 'Unmark preferred' : 'Mark preferred'}
        </Button>
      </div>
    </div>
  );
}

function AvailabilityTab({ countryCode }: { countryCode: string }) {
  const { data, isLoading } = useCountryProviderAvailability(countryCode);

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data || data.length === 0) return <EmptyState title="No provider availability configured" className="border-none py-8" />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Domain</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>Available</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((a) => (
          <TableRow key={a.id}>
            <TableCell className="text-sm text-foreground">{a.domain}</TableCell>
            <TableCell className="text-sm text-foreground">{a.providerKey}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{a.isAvailable ? 'Yes' : 'No'}</TableCell>
            <TableCell>
              <StatusBadge status={a.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ValidateTab({ countryCode, currency, locale }: { countryCode: string; currency: string; locale: string }) {
  const workspaceId = useWorkspaceId();
  const validate = useValidateCountryCombination();

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Check whether this country&apos;s currency and locale combination is valid for the current workspace.
      </p>
      <Button
        size="sm"
        onClick={() => workspaceId && validate.mutate({ workspaceId, countryCode, currency, locale })}
        disabled={!workspaceId || validate.isPending}
      >
        {validate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Run validation
      </Button>
      {validate.data && (
        <div className="rounded-[var(--radius)] border border-border p-3 text-sm">
          <p className="font-medium text-foreground">{validate.data.valid ? 'Valid combination' : 'Invalid combination'}</p>
          {validate.data.issues.map((issue, i) => (
            <p key={i} className="mt-1 text-danger">
              {issue.type}: {issue.message}
            </p>
          ))}
          {validate.data.warnings.map((w, i) => (
            <p key={i} className="mt-1 text-warning">
              {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryTab({ id }: { id: string }) {
  const { data, isLoading } = useCountryHistory(id);

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data || data.length === 0) return <EmptyState title="No history yet" className="border-none py-8" />;

  return (
    <ul className="space-y-2">
      {data.map((h) => (
        <li key={h.id} className="rounded-[var(--radius)] border border-border p-2 text-sm">
          <p className="flex items-center justify-between">
            <span className="font-medium text-foreground">v{h.version} · {h.status}</span>
            <span className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
          </p>
          {h.changeReason && <p className="mt-1 text-muted-foreground">{h.changeReason}</p>}
        </li>
      ))}
    </ul>
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
