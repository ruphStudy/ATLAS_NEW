'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Check, Ban, Archive, ArchiveRestore, Star } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ActionMenu } from '@/components/ui/action-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useArchiveLocale,
  useCreateLocale,
  useDisableLocale,
  useEnableLocale,
  useEnabledLanguages,
  useLocaleSearch,
  useLocales,
  usePreferredLanguages,
  useRestoreLocale,
  useSetDefaultLocale,
  useSetEnabledLanguages,
  useSetPreferredLanguages,
  useTranslationCompleteness,
} from '@/hooks';
import type { CreateLocalePayload, LocaleDirection, LocaleFilterParams, LocaleStatus, MeasurementSystem } from '@/types';

const STATUS_OPTIONS: { value: LocaleStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const DIRECTION_OPTIONS: { value: LocaleDirection; label: string }[] = [
  { value: 'LTR', label: 'Left to right' },
  { value: 'RTL', label: 'Right to left' },
];

export default function LocalizationPage() {
  return (
    <div>
      <PageHeader title="Localization" description="Locales, fallback languages, enabled/preferred languages and translation completeness." />
      <Tabs defaultValue="locales">
        <TabsList>
          <TabsTrigger value="locales">Locales</TabsTrigger>
          <TabsTrigger value="languages">Languages</TabsTrigger>
          <TabsTrigger value="completeness">Translation Completeness</TabsTrigger>
        </TabsList>
        <TabsContent value="locales">
          <LocalesTab />
        </TabsContent>
        <TabsContent value="languages">
          <LanguagesTab />
        </TabsContent>
        <TabsContent value="completeness">
          <CompletenessTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LocalesTab() {
  const [status, setStatus] = useState<LocaleStatus | ''>('');
  const [direction, setDirection] = useState<LocaleDirection | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);

  const params = useMemo<LocaleFilterParams>(
    () => ({ status: status || undefined, direction: direction || undefined, search: search || undefined, page, limit }),
    [status, direction, search, page, limit],
  );

  const locales = useLocaleSearch(params);
  const rows = locales.data?.data ?? [];
  const hasActiveFilters = !!(status || direction || search);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New locale
        </Button>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search locales…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setStatus('');
          setDirection('');
          setSearch('');
          setPage(1);
        }}
        className="mb-4"
      >
        <Select value={status} onChange={(e) => setStatus(e.target.value as LocaleStatus | '')} options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]} className="h-9 w-40" />
        <Select value={direction} onChange={(e) => setDirection(e.target.value as LocaleDirection | '')} options={[{ value: '', label: 'All directions' }, ...DIRECTION_OPTIONS]} className="h-9 w-40" />
      </FilterBar>

      {locales.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : locales.isError ? (
        <QueryErrorState refetch={locales.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No locales found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Locale</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Timezone</TableHead>
                <TableHead>Fallback</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {l.displayName} ({l.code})
                      </p>
                      {l.isDefault && (
                        <Badge variant="solid" className="text-[9px]">
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{l.nativeName}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.currencyCode}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.timezone}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.fallbackLocaleCode ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={l.status} />
                  </TableCell>
                  <TableCell>
                    <LocaleActions code={l.code} status={l.status} isDefault={l.isDefault} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={locales.data?.page ?? page}
            limit={locales.data?.limit ?? limit}
            total={locales.data?.total ?? 0}
            totalPages={locales.data?.totalPages ?? 0}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </>
      )}

      <CreateLocaleDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function LocaleActions({ code, status, isDefault }: { code: string; status: LocaleStatus; isDefault: boolean }) {
  const enable = useEnableLocale(code);
  const disable = useDisableLocale(code);
  const archive = useArchiveLocale(code);
  const restore = useRestoreLocale(code);
  const setDefault = useSetDefaultLocale();

  return (
    <ActionMenu
      items={[
        ...(!isDefault ? [{ label: 'Set as default', icon: Star, onSelect: () => setDefault.mutate(code) }] : []),
        ...(status === 'DISABLED' ? [{ label: 'Enable', icon: Check, onSelect: () => enable.mutate(undefined) }] : []),
        ...(status === 'ACTIVE' ? [{ label: 'Disable', icon: Ban, onSelect: () => disable.mutate(undefined) }] : []),
        ...(status !== 'ARCHIVED' ? [{ label: 'Archive', icon: Archive, onSelect: () => archive.mutate(undefined), destructive: true, separatorBefore: true }] : []),
        ...(status === 'ARCHIVED' ? [{ label: 'Restore', icon: ArchiveRestore, onSelect: () => restore.mutate(undefined) }] : []),
      ]}
    />
  );
}

function CreateLocaleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const createLocale = useCreateLocale();
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('');
  const [nativeName, setNativeName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');
  const [timezone, setTimezone] = useState('');
  const [fallbackLocaleCode, setFallbackLocaleCode] = useState('');
  const [measurementSystem, setMeasurementSystem] = useState<MeasurementSystem>('METRIC');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>New locale</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Code" htmlFor="loc-code" required>
              <Input id="loc-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. en-US" />
            </FormField>
            <FormField label="Language" htmlFor="loc-language" required>
              <Input id="loc-language" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="e.g. English" />
            </FormField>
            <FormField label="Native name" htmlFor="loc-native" required>
              <Input id="loc-native" value={nativeName} onChange={(e) => setNativeName(e.target.value)} />
            </FormField>
            <FormField label="Display name" htmlFor="loc-display" required>
              <Input id="loc-display" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </FormField>
            <FormField label="Currency code" htmlFor="loc-currency">
              <Input id="loc-currency" value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} placeholder="e.g. USD" />
            </FormField>
            <FormField label="Timezone" htmlFor="loc-timezone">
              <Input id="loc-timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="e.g. America/New_York" />
            </FormField>
            <FormField label="Fallback locale" htmlFor="loc-fallback">
              <Input id="loc-fallback" value={fallbackLocaleCode} onChange={(e) => setFallbackLocaleCode(e.target.value)} placeholder="e.g. en" />
            </FormField>
            <FormField label="Measurement system" htmlFor="loc-measurement">
              <Select
                id="loc-measurement"
                value={measurementSystem}
                onChange={(e) => setMeasurementSystem(e.target.value as MeasurementSystem)}
                options={[
                  { value: 'METRIC', label: 'Metric' },
                  { value: 'IMPERIAL', label: 'Imperial' },
                ]}
              />
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const payload: CreateLocalePayload = { code, language, nativeName, displayName, currencyCode: currencyCode || undefined, timezone: timezone || undefined, fallbackLocaleCode: fallbackLocaleCode || undefined, measurementSystem };
              createLocale.mutate(payload, { onSuccess: () => onOpenChange(false) });
            }}
            disabled={!code || !language || !nativeName || !displayName || createLocale.isPending}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LanguagesTab() {
  const locales = useLocales(true);
  const enabledLanguages = useEnabledLanguages();
  const preferredLanguages = usePreferredLanguages();
  const setEnabled = useSetEnabledLanguages();
  const setPreferred = useSetPreferredLanguages();

  const [enabledSet, setEnabledSet] = useState<Set<string>>(new Set());
  const [preferredSet, setPreferredSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (enabledLanguages.data) setEnabledSet(new Set(enabledLanguages.data));
  }, [enabledLanguages.data]);

  useEffect(() => {
    if (preferredLanguages.data) setPreferredSet(new Set(preferredLanguages.data));
  }, [preferredLanguages.data]);

  if (locales.isLoading) return <Skeleton className="h-64 w-full" />;

  function toggle(set: Set<string>, setSet: (s: Set<string>) => void, code: string) {
    const next = new Set(set);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setSet(next);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Enabled languages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {(locales.data ?? []).map((l) => (
              <button
                key={l.code}
                onClick={() => toggle(enabledSet, setEnabledSet, l.code)}
                className={
                  enabledSet.has(l.code)
                    ? 'rounded-full border border-primary bg-primary/10 px-2.5 py-1 text-xs text-primary'
                    : 'rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground'
                }
              >
                {l.displayName} ({l.code})
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => setEnabled.mutate({ localeCodes: Array.from(enabledSet) })} disabled={setEnabled.isPending}>
            Save enabled languages
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Preferred languages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {(locales.data ?? []).map((l) => (
              <button
                key={l.code}
                onClick={() => toggle(preferredSet, setPreferredSet, l.code)}
                className={
                  preferredSet.has(l.code)
                    ? 'rounded-full border border-primary bg-primary/10 px-2.5 py-1 text-xs text-primary'
                    : 'rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground'
                }
              >
                {l.displayName} ({l.code})
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => setPreferred.mutate(Array.from(preferredSet))} disabled={setPreferred.isPending}>
            Save preferred languages
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CompletenessTab() {
  const [namespaceKey, setNamespaceKey] = useState('');
  const [localeCode, setLocaleCode] = useState('');
  const [lookup, setLookup] = useState<{ namespaceKey: string; localeCode: string } | null>(null);
  const completeness = useTranslationCompleteness(lookup?.namespaceKey, lookup?.localeCode);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <FormField label="Namespace key" htmlFor="tc-namespace">
          <Input id="tc-namespace" value={namespaceKey} onChange={(e) => setNamespaceKey(e.target.value)} placeholder="e.g. products" className="w-56" />
        </FormField>
        <FormField label="Locale code" htmlFor="tc-locale">
          <Input id="tc-locale" value={localeCode} onChange={(e) => setLocaleCode(e.target.value)} placeholder="e.g. es-MX" className="w-40" />
        </FormField>
        <Button size="sm" onClick={() => setLookup({ namespaceKey, localeCode })} disabled={!namespaceKey || !localeCode}>
          Check completeness
        </Button>
      </div>

      {completeness.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : completeness.data ? (
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 pt-6 text-sm sm:grid-cols-4">
            <Field label="Total keys" value={String(completeness.data.totalKeys)} />
            <Field label="Translated" value={String(completeness.data.translatedKeys)} />
            <Field label="Missing" value={String(completeness.data.missingKeys)} />
            <Field label="Completeness" value={`${completeness.data.completenessPercent.toFixed(1)}%`} />
          </CardContent>
        </Card>
      ) : lookup ? (
        <EmptyState title="No data" description="No completeness data for this namespace/locale combination." />
      ) : null}
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
