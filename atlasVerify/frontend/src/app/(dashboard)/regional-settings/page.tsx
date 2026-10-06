'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import {
  useArchiveRegionalSettingsProfile,
  useCreateRegionalSettingsProfile,
  usePublishRegionalSettingsProfile,
  useRegionalSettingsProfile,
  useRegionalSettingsProfileHistory,
  useRegionalSettingsProfiles,
  useResolveRegionalSettings,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { CreateRegionalSettingsProfilePayload, RegionalSettingsScopeType, RegionalSettingsStatus } from '@/types';

const SCOPE_OPTIONS: { value: RegionalSettingsScopeType; label: string }[] = [
  { value: 'GLOBAL', label: 'Global' },
  { value: 'COUNTRY', label: 'Country' },
  { value: 'REGION', label: 'Region' },
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'WORKSPACE', label: 'Workspace' },
];

const STATUS_OPTIONS: { value: RegionalSettingsStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function RegionalSettingsPage() {
  return (
    <div>
      <PageHeader title="Regional Settings" description="Country/region profiles for locale, currency, timezone, business hours, holidays and operational preferences." />
      <Tabs defaultValue="profiles">
        <TabsList>
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
          <TabsTrigger value="resolve">Resolve Effective Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="profiles">
          <ProfilesTab />
        </TabsContent>
        <TabsContent value="resolve">
          <ResolveTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfilesTab() {
  const [scopeType, setScopeType] = useState<RegionalSettingsScopeType | ''>('');
  const [status, setStatus] = useState<RegionalSettingsStatus | ''>('');
  const [countryCode, setCountryCode] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useRegionalSettingsProfiles({ scopeType: scopeType || undefined, status: status || undefined, countryCode: countryCode || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!scopeType || !!status || !!countryCode} onClearFilters={() => { setScopeType(''); setStatus(''); setCountryCode(''); setPage(1); }}>
          <Select value={scopeType} onChange={(e) => { setScopeType(e.target.value as RegionalSettingsScopeType | ''); setPage(1); }} placeholder="All scopes" options={SCOPE_OPTIONS} className="h-9 w-36" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as RegionalSettingsStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-36" />
          <Input value={countryCode} onChange={(e) => { setCountryCode(e.target.value.toUpperCase()); setPage(1); }} placeholder="Country code" className="h-9 w-36" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create profile
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No regional settings profiles found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Country/Region</TableHead>
                <TableHead>Locale</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((p) => (
                <TableRow key={p.id} clickable onClick={() => setSelectedId(p.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{p.key}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.scopeType}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.countryCode ?? p.regionCode ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.localeCode ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.currencyCode ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <CreateProfileDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ProfileDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreateProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateRegionalSettingsProfile();
  const [form, setForm] = useState<CreateRegionalSettingsProfilePayload>({
    key: '',
    scopeType: 'COUNTRY',
    effectiveFrom: new Date().toISOString().slice(0, 10),
  });
  const reset = () => setForm({ key: '', scopeType: 'COUNTRY', effectiveFrom: new Date().toISOString().slice(0, 10) });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Create regional settings profile</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Key" htmlFor="rp-key" required>
            <Input id="rp-key" value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} />
          </FormField>
          <FormField label="Scope type" htmlFor="rp-scope" required>
            <Select id="rp-scope" value={form.scopeType} onChange={(e) => setForm((f) => ({ ...f, scopeType: e.target.value as RegionalSettingsScopeType }))} options={SCOPE_OPTIONS} />
          </FormField>
          <FormField label="Country code" htmlFor="rp-country">
            <Input id="rp-country" value={form.countryCode ?? ''} onChange={(e) => setForm((f) => ({ ...f, countryCode: e.target.value.toUpperCase() }))} />
          </FormField>
          <FormField label="Region code" htmlFor="rp-region">
            <Input id="rp-region" value={form.regionCode ?? ''} onChange={(e) => setForm((f) => ({ ...f, regionCode: e.target.value }))} />
          </FormField>
          <FormField label="Locale code" htmlFor="rp-locale">
            <Input id="rp-locale" value={form.localeCode ?? ''} onChange={(e) => setForm((f) => ({ ...f, localeCode: e.target.value }))} />
          </FormField>
          <FormField label="Currency code" htmlFor="rp-currency">
            <Input id="rp-currency" value={form.currencyCode ?? ''} onChange={(e) => setForm((f) => ({ ...f, currencyCode: e.target.value.toUpperCase() }))} />
          </FormField>
          <FormField label="Timezone" htmlFor="rp-tz">
            <Input id="rp-tz" value={form.timezone ?? ''} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))} />
          </FormField>
          <FormField label="Effective from" htmlFor="rp-effective" required>
            <Input id="rp-effective" type="date" value={form.effectiveFrom.slice(0, 10)} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })} disabled={!form.key || !form.effectiveFrom || create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProfileDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: profile, isLoading } = useRegionalSettingsProfile(id ?? undefined);
  const { data: history } = useRegionalSettingsProfileHistory(id ?? undefined);
  const publish = usePublishRegionalSettingsProfile(id ?? '');
  const archive = useArchiveRegionalSettingsProfile(id ?? '');

  const actions: ActionMenuItem[] = [];
  if (profile) {
    if (profile.status === 'DRAFT') actions.push({ label: 'Publish', onSelect: () => publish.mutate() });
    if (profile.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => archive.mutate(), destructive: true, separatorBefore: true });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{profile?.key ?? 'Profile'}</span>
            {profile && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !profile ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Scope" value={profile.scopeType} />
              <Field label="Country" value={profile.countryCode ?? '—'} />
              <Field label="Region" value={profile.regionCode ?? '—'} />
              <Field label="Locale" value={profile.localeCode ?? '—'} />
              <Field label="Currency" value={profile.currencyCode ?? '—'} />
              <Field label="Timezone" value={profile.timezone ?? '—'} />
              <Field label="Tax jurisdiction" value={profile.taxJurisdictionCode ?? '—'} />
              <Field label="Compliance profile" value={profile.complianceProfileKey ?? '—'} />
              <Field label="Status" value={profile.status} />
              <Field label="Version" value={String(profile.version)} />
              <Field label="Priority" value={String(profile.priority)} />
              <Field label="Effective from" value={formatDate(profile.effectiveFrom)} />
            </div>
            {profile.holidays.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Holidays</p>
                <p className="text-sm text-foreground">{profile.holidays.map((h) => `${h.date} (${h.name})`).join(', ')}</p>
              </div>
            )}
            {profile.marketplaceKeys.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Marketplaces</p>
                <p className="text-sm text-foreground">{profile.marketplaceKeys.join(', ')}</p>
              </div>
            )}
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
    </Dialog>
  );
}

function ResolveTab() {
  const resolve = useResolveRegionalSettings();
  const [countryCode, setCountryCode] = useState('');
  const [regionCode, setRegionCode] = useState('');

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-muted-foreground">Resolve the effective regional settings for a country/region, layered from global down to workspace overrides.</p>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Country code" htmlFor="rs-country">
          <Input id="rs-country" value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase())} />
        </FormField>
        <FormField label="Region code" htmlFor="rs-region">
          <Input id="rs-region" value={regionCode} onChange={(e) => setRegionCode(e.target.value)} />
        </FormField>
      </div>
      <Button onClick={() => resolve.mutate({ countryCode: countryCode || undefined, regionCode: regionCode || undefined })} disabled={resolve.isPending}>
        {resolve.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Resolve
      </Button>
      {resolve.data && (
        <div className="grid grid-cols-2 gap-4 rounded-[var(--radius)] border border-border p-3 text-sm sm:grid-cols-3">
          <Field label="Locale" value={resolve.data.localeCode ?? '—'} />
          <Field label="Currency" value={resolve.data.currencyCode ?? '—'} />
          <Field label="Timezone" value={resolve.data.timezone ?? '—'} />
          <Field label="Date format" value={resolve.data.dateFormat ?? '—'} />
          <Field label="Measurement" value={resolve.data.measurementSystem ?? '—'} />
          <Field label="Tax jurisdiction" value={resolve.data.taxJurisdictionCode ?? '—'} />
        </div>
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
