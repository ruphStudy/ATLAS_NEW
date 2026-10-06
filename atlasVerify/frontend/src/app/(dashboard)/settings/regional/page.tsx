'use client';

import { useMemo, useState } from 'react';
import { Plus, Check, Archive, RotateCcw, History } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { ActionMenu } from '@/components/ui/action-menu';
import { Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useArchiveRegionalSettingsProfile,
  useCreateRegionalSettingsProfile,
  usePublishRegionalSettingsProfile,
  useRegionalSettingsProfile,
  useRegionalSettingsProfileHistory,
  useRegionalSettingsProfiles,
  useResolveRegionalSettings,
  useRollbackRegionalSettingsProfile,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { CreateRegionalSettingsProfilePayload, RegionalSettingsProfileFilterParams, RegionalSettingsScopeType, RegionalSettingsStatus } from '@/types';

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
      <PageHeader title="Regional Settings" description="Country/region profiles — currency, tax, business hours, holidays and operational preferences." />
      <Tabs defaultValue="profiles">
        <TabsList>
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
          <TabsTrigger value="resolve">Resolve</TabsTrigger>
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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const params = useMemo<RegionalSettingsProfileFilterParams>(
    () => ({ scopeType: scopeType || undefined, status: status || undefined, countryCode: countryCode || undefined, search: search || undefined, page, limit }),
    [scopeType, status, countryCode, search, page, limit],
  );

  const profiles = useRegionalSettingsProfiles(params);
  const rows = profiles.data?.items ?? [];
  const hasActiveFilters = !!(scopeType || status || countryCode || search);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New profile
        </Button>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search profiles…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setScopeType('');
          setStatus('');
          setCountryCode('');
          setSearch('');
          setPage(1);
        }}
        className="mb-4"
      >
        <Select value={scopeType} onChange={(e) => setScopeType(e.target.value as RegionalSettingsScopeType | '')} options={[{ value: '', label: 'All scopes' }, ...SCOPE_OPTIONS]} className="h-9 w-40" />
        <Select value={status} onChange={(e) => setStatus(e.target.value as RegionalSettingsStatus | '')} options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]} className="h-9 w-40" />
        <Input value={countryCode} onChange={(e) => setCountryCode(e.target.value)} placeholder="Country code" className="h-9 w-36" />
      </FilterBar>

      {profiles.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : profiles.isError ? (
        <QueryErrorState refetch={profiles.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No regional settings profiles yet" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Country / Region</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Effective from</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelectedId(p.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{p.key}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {p.scopeType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{[p.countryCode, p.regionCode].filter(Boolean).join(' / ') || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.currencyCode ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(p.effectiveFrom)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={profiles.data?.page ?? page}
            limit={profiles.data?.limit ?? limit}
            total={profiles.data?.total ?? 0}
            totalPages={profiles.data?.totalPages ?? 0}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </>
      )}

      <CreateProfileDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ProfileDetailDrawer id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreateProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const createProfile = useCreateRegionalSettingsProfile();
  const [key, setKey] = useState('');
  const [scopeType, setScopeType] = useState<RegionalSettingsScopeType>('COUNTRY');
  const [countryCode, setCountryCode] = useState('');
  const [regionCode, setRegionCode] = useState('');
  const [localeCode, setLocaleCode] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');
  const [timezone, setTimezone] = useState('');
  const [taxJurisdictionCode, setTaxJurisdictionCode] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [operationalJson, setOperationalJson] = useState('{\n  "workingDays": [1,2,3,4,5],\n  "businessHours": {},\n  "holidays": []\n}');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New regional settings profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Key" htmlFor="rsp-key" required>
              <Input id="rsp-key" value={key} onChange={(e) => setKey(e.target.value)} />
            </FormField>
            <FormField label="Scope type" htmlFor="rsp-scope">
              <Select id="rsp-scope" value={scopeType} onChange={(e) => setScopeType(e.target.value as RegionalSettingsScopeType)} options={SCOPE_OPTIONS} />
            </FormField>
            <FormField label="Country code" htmlFor="rsp-country">
              <Input id="rsp-country" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} placeholder="e.g. US" />
            </FormField>
            <FormField label="Region code" htmlFor="rsp-region">
              <Input id="rsp-region" value={regionCode} onChange={(e) => setRegionCode(e.target.value)} />
            </FormField>
            <FormField label="Locale code" htmlFor="rsp-locale">
              <Input id="rsp-locale" value={localeCode} onChange={(e) => setLocaleCode(e.target.value)} placeholder="e.g. en-US" />
            </FormField>
            <FormField label="Currency code" htmlFor="rsp-currency">
              <Input id="rsp-currency" value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} placeholder="e.g. USD" />
            </FormField>
            <FormField label="Timezone" htmlFor="rsp-timezone">
              <Input id="rsp-timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
            </FormField>
            <FormField label="Tax jurisdiction" htmlFor="rsp-tax">
              <Input id="rsp-tax" value={taxJurisdictionCode} onChange={(e) => setTaxJurisdictionCode(e.target.value)} />
            </FormField>
            <FormField label="Effective from" htmlFor="rsp-effective-from" required>
              <Input id="rsp-effective-from" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Operational configuration (JSON — working days, business hours, holidays, preferences)" htmlFor="rsp-operational">
            <Textarea id="rsp-operational" value={operationalJson} onChange={(e) => setOperationalJson(e.target.value)} rows={6} className="font-mono text-xs" />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              let operational: Record<string, unknown> = {};
              try {
                operational = JSON.parse(operationalJson);
              } catch {
                // invalid JSON — submit without operational overrides
              }
              const payload: CreateRegionalSettingsProfilePayload = {
                key,
                scopeType,
                countryCode: countryCode || undefined,
                regionCode: regionCode || undefined,
                localeCode: localeCode || undefined,
                currencyCode: currencyCode || undefined,
                timezone: timezone || undefined,
                taxJurisdictionCode: taxJurisdictionCode || undefined,
                effectiveFrom,
                workingDays: operational['workingDays'] as number[] | undefined,
                businessHours: operational['businessHours'] as Record<string, unknown> | undefined,
                holidays: operational['holidays'] as Array<{ date: string; name: string }> | undefined,
              };
              createProfile.mutate(payload, { onSuccess: () => onOpenChange(false) });
            }}
            disabled={!key || !effectiveFrom || createProfile.isPending}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProfileDetailDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: profile, isLoading } = useRegionalSettingsProfile(id ?? undefined);
  const publish = usePublishRegionalSettingsProfile(id ?? '');
  const archive = useArchiveRegionalSettingsProfile(id ?? '');
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <Drawer open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent size="lg">
        <DrawerHeader>
          <DrawerTitle>{profile?.key ?? 'Profile'}</DrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          {isLoading || !profile ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <StatusBadge status={profile.status} />
                <ActionMenu
                  items={[
                    ...(profile.status === 'DRAFT' ? [{ label: 'Publish', icon: Check, onSelect: () => publish.mutate() }] : []),
                    ...(profile.status !== 'ARCHIVED' ? [{ label: 'Archive', icon: Archive, onSelect: () => archive.mutate(), destructive: true }] : []),
                    { label: 'History', icon: History, onSelect: () => setHistoryOpen(true), separatorBefore: true },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Scope" value={profile.scopeType} />
                <Field label="Priority" value={String(profile.priority)} />
                <Field label="Country" value={profile.countryCode ?? '—'} />
                <Field label="Region" value={profile.regionCode ?? '—'} />
                <Field label="Locale" value={profile.localeCode ?? '—'} />
                <Field label="Currency" value={profile.currencyCode ?? '—'} />
                <Field label="Timezone" value={profile.timezone ?? '—'} />
                <Field label="Tax jurisdiction" value={profile.taxJurisdictionCode ?? '—'} />
                <Field label="Version" value={`v${profile.version}`} />
                <Field label="Effective from" value={formatDate(profile.effectiveFrom)} />
                <Field label="Effective to" value={profile.effectiveTo ? formatDate(profile.effectiveTo) : '—'} />
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Working days</p>
                <p className="text-sm text-foreground">{profile.workingDays.join(', ') || '—'}</p>
              </div>

              {profile.holidays.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Holidays</p>
                  <div className="space-y-1">
                    {profile.holidays.map((h, i) => (
                      <p key={i} className="text-sm text-foreground">
                        {h.date} — {h.name}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DrawerBody>
      </DrawerContent>

      {id && <ProfileHistoryDialog id={id} open={historyOpen} onOpenChange={setHistoryOpen} />}
    </Drawer>
  );
}

function ProfileHistoryDialog({ id, open, onOpenChange }: { id: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const history = useRegionalSettingsProfileHistory(id);
  const rollback = useRollbackRegionalSettingsProfile(id);
  const [toVersion, setToVersion] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Profile history</DialogTitle>
        </DialogHeader>
        {!history.data || history.data.length === 0 ? (
          <EmptyState title="No history yet" className="border-none py-8" />
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {history.data.map((h) => (
              <div key={h.id} className="rounded-[var(--radius)] border border-border p-2.5 text-sm">
                <p className="text-foreground">
                  v{h.version} · {h.status.toLowerCase()}
                </p>
                {h.changeReason && <p className="mt-1 text-xs text-muted-foreground">{h.changeReason}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(h.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 border-t border-border pt-3">
          <FormField label="Roll back to version" htmlFor="rollback-version">
            <Input id="rollback-version" type="number" value={toVersion} onChange={(e) => setToVersion(e.target.value)} className="w-32" />
          </FormField>
          <Button
            variant="outline"
            size="sm"
            onClick={() => rollback.mutate({ toVersion: Number(toVersion) }, { onSuccess: () => setToVersion('') })}
            disabled={!toVersion || rollback.isPending}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Roll back
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResolveTab() {
  const resolve = useResolveRegionalSettings();
  const [organizationId, setOrganizationId] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [regionCode, setRegionCode] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <FormField label="Organization ID" htmlFor="resolve-org">
          <Input id="resolve-org" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} />
        </FormField>
        <FormField label="Country code" htmlFor="resolve-country">
          <Input id="resolve-country" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} />
        </FormField>
        <FormField label="Region code" htmlFor="resolve-region">
          <Input id="resolve-region" value={regionCode} onChange={(e) => setRegionCode(e.target.value)} />
        </FormField>
        <FormField label="Effective date" htmlFor="resolve-date">
          <Input id="resolve-date" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
        </FormField>
      </div>
      <Button
        onClick={() => resolve.mutate({ organizationId: organizationId || undefined, countryCode: countryCode || undefined, regionCode: regionCode || undefined, effectiveDate: effectiveDate || undefined })}
        disabled={resolve.isPending}
      >
        Resolve effective settings
      </Button>

      {resolve.data && (
        <Card>
          <CardContent className="space-y-3 pt-6 text-sm">
            {(
              [
                ['localeCode', 'Locale'],
                ['currencyCode', 'Currency'],
                ['timezone', 'Timezone'],
                ['dateFormat', 'Date format'],
                ['taxJurisdictionCode', 'Tax jurisdiction'],
                ['measurementSystem', 'Measurement system'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <span className="text-muted-foreground">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-foreground">{String(resolve.data![key] ?? '—')}</span>
                  {resolve.data!.sources[key] && (
                    <Badge variant="info" className="text-[9px]">
                      {resolve.data!.sources[key]}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            {resolve.data.holidays.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Holidays</p>
                {resolve.data.holidays.map((h, i) => (
                  <p key={i} className="text-foreground">
                    {h.date} — {h.name}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
