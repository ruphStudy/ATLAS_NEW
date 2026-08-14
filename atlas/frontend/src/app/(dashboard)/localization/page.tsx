'use client';

import { useState } from 'react';
import { AlertTriangle, Download, Loader2, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import {
  useArchiveLocale,
  useCreateLocale,
  useCreateNamespace,
  useCreateTranslationKey,
  useDeleteTranslationKey,
  useDisableLocale,
  useEnabledLanguages,
  useEnableLocale,
  useFormatCurrencyPreview,
  useFormatDatePreview,
  useFormatNumberPreview,
  useImportNamespace,
  useLocaleAvailability,
  useLocaleHistory,
  useLocaleSearch,
  useLocales,
  useMissingKeys,
  useNamespaceExport,
  usePreferredLanguages,
  useProviderRequirements,
  useRestoreLocale,
  useSetDefaultLocale,
  useSetEnabledLanguages,
  useSetLocaleAvailability,
  useSetPreferredLanguages,
  useSetProviderRequirement,
  useSetTranslation,
  useTranslationBundle,
  useTranslationCompleteness,
  useTranslationHistory,
  useTranslationIssues,
  useTranslationKeys,
  useTranslationNamespaces,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { CreateLocalePayload, Locale, LocaleDirection, LocaleStatus, MeasurementSystem, TranslationIssueType } from '@/types';

const STATUS_OPTIONS: { value: LocaleStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const MEASUREMENT_SYSTEMS: MeasurementSystem[] = ['METRIC', 'IMPERIAL'];
const ISSUE_TONE: Record<TranslationIssueType, 'danger' | 'warning'> = { MISSING: 'danger', OUTDATED: 'warning', CONFLICTING: 'danger' };

export default function LocalizationPage() {
  return (
    <div>
      <PageHeader title="Localization" description="Locales, translation content, completeness, fallback chains and marketplace locale requirements." />
      <Tabs defaultValue="locales">
        <TabsList>
          <TabsTrigger value="locales">Locales</TabsTrigger>
          <TabsTrigger value="languages">Enabled &amp; Preferred Languages</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="translations">Translations</TabsTrigger>
          <TabsTrigger value="completeness">Completeness</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="requirements">Provider Requirements</TabsTrigger>
          <TabsTrigger value="preview">Formatting Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="locales">
          <LocalesTab />
        </TabsContent>
        <TabsContent value="languages">
          <LanguagesTab />
        </TabsContent>
        <TabsContent value="availability">
          <AvailabilityTab />
        </TabsContent>
        <TabsContent value="translations">
          <TranslationsTab />
        </TabsContent>
        <TabsContent value="completeness">
          <CompletenessTab />
        </TabsContent>
        <TabsContent value="issues">
          <IssuesTab />
        </TabsContent>
        <TabsContent value="requirements">
          <ProviderRequirementsTab />
        </TabsContent>
        <TabsContent value="preview">
          <FormattingPreviewTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LocalesTab() {
  const [status, setStatus] = useState<LocaleStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useLocaleSearch({ status: status || undefined, search: search || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!status || !!search} onClearFilters={() => { setStatus(''); setSearch(''); setPage(1); }} searchValue={search} onSearchChange={(v) => { setSearch(v); setPage(1); }}>
          <Select value={status} onChange={(e) => { setStatus(e.target.value as LocaleStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-36" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create locale
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No locales found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Display name</TableHead>
                <TableHead>Native name</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((l) => (
                <TableRow key={l.id} clickable onClick={() => setSelectedCode(l.code)}>
                  <TableCell className="text-sm font-medium text-foreground">{l.code}</TableCell>
                  <TableCell className="text-sm text-foreground">{l.displayName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.nativeName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.direction}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.isDefault ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <StatusBadge status={l.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <CreateLocaleDialog open={createOpen} onOpenChange={setCreateOpen} />
      <LocaleDetailDialog code={selectedCode} onClose={() => setSelectedCode(null)} />
    </div>
  );
}

function CreateLocaleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateLocale();
  const [form, setForm] = useState<CreateLocalePayload>({ code: '', language: '', nativeName: '', displayName: '' });
  const reset = () => setForm({ code: '', language: '', nativeName: '', displayName: '' });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Create locale</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Code" htmlFor="l-code" required>
            <Input id="l-code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="en-US" />
          </FormField>
          <FormField label="Language" htmlFor="l-language" required>
            <Input id="l-language" value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} placeholder="English" />
          </FormField>
          <FormField label="Display name" htmlFor="l-display" required>
            <Input id="l-display" value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />
          </FormField>
          <FormField label="Native name" htmlFor="l-native" required>
            <Input id="l-native" value={form.nativeName} onChange={(e) => setForm((f) => ({ ...f, nativeName: e.target.value }))} />
          </FormField>
          <FormField label="Direction" htmlFor="l-direction">
            <Select id="l-direction" value={form.direction ?? ''} onChange={(e) => setForm((f) => ({ ...f, direction: (e.target.value || undefined) as LocaleDirection | undefined }))} placeholder="LTR" options={[{ value: 'LTR', label: 'LTR' }, { value: 'RTL', label: 'RTL' }]} />
          </FormField>
          <FormField label="Fallback locale" htmlFor="l-fallback">
            <Input id="l-fallback" value={form.fallbackLocaleCode ?? ''} onChange={(e) => setForm((f) => ({ ...f, fallbackLocaleCode: e.target.value }))} />
          </FormField>
          <FormField label="Currency code" htmlFor="l-currency">
            <Input id="l-currency" value={form.currencyCode ?? ''} onChange={(e) => setForm((f) => ({ ...f, currencyCode: e.target.value.toUpperCase() }))} />
          </FormField>
          <FormField label="Timezone" htmlFor="l-tz">
            <Input id="l-tz" value={form.timezone ?? ''} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.code || !form.language || !form.nativeName || !form.displayName || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LocaleDetailDialog({ code, onClose }: { code: string | null; onClose: () => void }) {
  const { data: locale, isLoading } = useLocales();
  const target = locale?.find((l) => l.code === code);
  const { data: history } = useLocaleHistory(code ?? undefined);
  const enable = useEnableLocale(code ?? '');
  const disable = useDisableLocale(code ?? '');
  const archive = useArchiveLocale(code ?? '');
  const restore = useRestoreLocale(code ?? '');
  const setDefault = useSetDefaultLocale();

  const actions: ActionMenuItem[] = [];
  if (target) {
    if (target.status === 'DISABLED') actions.push({ label: 'Enable', onSelect: () => enable.mutate(undefined) });
    if (target.status === 'ACTIVE') {
      actions.push({ label: 'Disable', onSelect: () => disable.mutate(undefined) });
      if (!target.isDefault) actions.push({ label: 'Set as default', onSelect: () => setDefault.mutate(target.code) });
    }
    if (target.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => archive.mutate(undefined), destructive: true, separatorBefore: true });
    if (target.status === 'ARCHIVED') actions.push({ label: 'Restore', onSelect: () => restore.mutate(undefined) });
  }

  return (
    <Dialog open={!!code} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{target?.displayName ?? 'Locale'}</span>
            {target && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !target ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Code" value={target.code} />
              <Field label="Language" value={target.language} />
              <Field label="Native name" value={target.nativeName} />
              <Field label="Direction" value={target.direction} />
              <Field label="Currency" value={target.currencyCode} />
              <Field label="Timezone" value={target.timezone} />
              <Field label="Date format" value={target.dateFormat} />
              <Field label="Fallback locale" value={target.fallbackLocaleCode ?? '—'} />
              <Field label="Measurement" value={target.measurementSystem} />
              <Field label="Status" value={target.status} />
              <Field label="Default" value={target.isDefault ? 'Yes' : 'No'} />
              <Field label="Version" value={String(target.version)} />
            </div>

            <FallbackChain locales={locale ?? []} start={target} />

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

function FallbackChain({ locales, start }: { locales: Locale[]; start: Locale }) {
  const byCode = new Map(locales.map((l) => [l.code, l]));
  const chain: Locale[] = [start];
  const seen = new Set([start.code]);
  let cursor = start;
  let cycleDetected = false;
  let invalidTarget: string | null = null;

  for (let depth = 0; depth < 10 && cursor.fallbackLocaleCode; depth++) {
    const next = byCode.get(cursor.fallbackLocaleCode);
    if (!next) {
      invalidTarget = cursor.fallbackLocaleCode;
      break;
    }
    if (seen.has(next.code)) {
      cycleDetected = true;
      break;
    }
    chain.push(next);
    seen.add(next.code);
    cursor = next;
  }

  if (chain.length === 1 && !invalidTarget) return null;

  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fallback chain</p>
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        {chain.map((l, i) => (
          <span key={l.code} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-muted-foreground">→</span>}
            <Badge variant="secondary">{l.code}</Badge>
          </span>
        ))}
        {cycleDetected && (
          <span className="ml-1 flex items-center gap-1 text-xs text-danger">
            <AlertTriangle className="h-3.5 w-3.5" />
            Cycle detected
          </span>
        )}
        {invalidTarget && (
          <span className="ml-1 flex items-center gap-1 text-xs text-danger">
            <AlertTriangle className="h-3.5 w-3.5" />
            Points to unknown locale &quot;{invalidTarget}&quot;
          </span>
        )}
      </div>
    </div>
  );
}

function LanguagesTab() {
  const { data: allLocales } = useLocales(true);
  const { data: enabled, isLoading: enabledLoading } = useEnabledLanguages();
  const { data: preferred, isLoading: preferredLoading } = usePreferredLanguages();
  const setEnabled = useSetEnabledLanguages();
  const setPreferred = useSetPreferredLanguages();
  const [enabledSel, setEnabledSel] = useState<string[]>([]);
  const [preferredSel, setPreferredSel] = useState<string[]>([]);

  const enabledCodes = enabledSel.length > 0 ? enabledSel : enabled?.localeCodes ?? [];
  const preferredCodes = preferredSel.length > 0 ? preferredSel : preferred?.localeCodes ?? [];

  if (enabledLoading || preferredLoading) return <Skeleton className="h-48 w-full" />;
  if (!allLocales || allLocales.length === 0) return <EmptyState title="No locales available" description="Create a locale first." />;

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Enabled languages (workspace)</p>
        <div className="space-y-2">
          {allLocales.map((l) => (
            <label key={l.code} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={enabledCodes.includes(l.code)}
                onChange={(e) => {
                  const next = e.target.checked ? [...enabledCodes, l.code] : enabledCodes.filter((c) => c !== l.code);
                  setEnabledSel(next);
                }}
              />
              {l.displayName} ({l.code})
            </label>
          ))}
        </div>
        <Button size="sm" className="mt-3" onClick={() => setEnabled.mutate({ localeCodes: enabledCodes, scope: 'WORKSPACE' })} disabled={setEnabled.isPending}>
          Save enabled languages
        </Button>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Preferred languages</p>
        <div className="space-y-2">
          {allLocales.map((l) => (
            <label key={l.code} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={preferredCodes.includes(l.code)}
                onChange={(e) => {
                  const next = e.target.checked ? [...preferredCodes, l.code] : preferredCodes.filter((c) => c !== l.code);
                  setPreferredSel(next);
                }}
              />
              {l.displayName} ({l.code})
            </label>
          ))}
        </div>
        <Button size="sm" className="mt-3" onClick={() => setPreferred.mutate(preferredCodes)} disabled={setPreferred.isPending}>
          Save preferred languages
        </Button>
      </div>
    </div>
  );
}

function AvailabilityTab() {
  const { data, isLoading } = useLocaleAvailability();
  const setAvailability = useSetLocaleAvailability();
  const [localeCode, setLocaleCode] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [marketplaceKey, setMarketplaceKey] = useState('');

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius)] border border-border p-4">
        <p className="mb-3 text-sm font-medium text-foreground">Set locale availability</p>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Locale code" htmlFor="av-locale" required>
            <Input id="av-locale" value={localeCode} onChange={(e) => setLocaleCode(e.target.value)} />
          </FormField>
          <FormField label="Country code" htmlFor="av-country">
            <Input id="av-country" value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase())} />
          </FormField>
          <FormField label="Marketplace key" htmlFor="av-marketplace">
            <Input id="av-marketplace" value={marketplaceKey} onChange={(e) => setMarketplaceKey(e.target.value)} />
          </FormField>
        </div>
        <Button
          size="sm"
          className="mt-3"
          onClick={() =>
            setAvailability.mutate(
              { localeCode, countryCode: countryCode || undefined, marketplaceKey: marketplaceKey || undefined, isEnabled: true },
              { onSuccess: () => { setLocaleCode(''); setCountryCode(''); setMarketplaceKey(''); } },
            )
          }
          disabled={!localeCode || setAvailability.isPending}
        >
          {setAvailability.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Enable availability
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No availability rules configured" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Locale</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Marketplace</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Preferred</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="text-sm font-medium text-foreground">{a.localeCode}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.countryCode ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.marketplaceKey ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.isEnabled ? 'Yes' : 'No'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.isDefault ? 'Yes' : 'No'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.isPreferred ? 'Yes' : 'No'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

/* ───────────────────────── Translations ───────────────────────── */

function TranslationsTab() {
  const { data: namespaces, isLoading } = useTranslationNamespaces();
  const [namespaceKey, setNamespaceKey] = useState('');
  const [createNsOpen, setCreateNsOpen] = useState(false);
  const [createKeyOpen, setCreateKeyOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<{ key: string; description?: string | null } | null>(null);
  const { data: keys, isLoading: keysLoading } = useTranslationKeys(namespaceKey || undefined);
  const deleteKey = useDeleteTranslationKey(namespaceKey);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FormField label="Namespace" htmlFor="ns-select">
          <Select id="ns-select" value={namespaceKey} onChange={(e) => setNamespaceKey(e.target.value)} placeholder={isLoading ? 'Loading…' : 'Select a namespace'} options={(namespaces ?? []).map((n) => ({ value: n.key, label: n.module ? `${n.key} (${n.module})` : n.key }))} className="w-64" />
        </FormField>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCreateNsOpen(true)}>
            <Plus className="h-4 w-4" />
            New namespace
          </Button>
          {namespaceKey && (
            <Button onClick={() => setCreateKeyOpen(true)}>
              <Plus className="h-4 w-4" />
              New key
            </Button>
          )}
        </div>
      </div>

      {!namespaceKey ? (
        <EmptyState title="Select a namespace to manage its translation keys" />
      ) : keysLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : !keys || keys.length === 0 ? (
        <EmptyState title="No translation keys in this namespace yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Default value</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((k) => (
              <TableRow key={k.id} clickable onClick={() => setSelectedKey(k)}>
                <TableCell className="text-sm font-medium text-foreground">{k.key}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{k.description ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{k.defaultValue ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Delete key"
                    onClick={(e) => { e.stopPropagation(); deleteKey.mutate(k.key); }}
                    disabled={deleteKey.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {namespaceKey && <NamespaceImportExport namespaceKey={namespaceKey} />}

      <CreateNamespaceDialog open={createNsOpen} onOpenChange={setCreateNsOpen} onCreated={setNamespaceKey} />
      {namespaceKey && <CreateKeyDialog namespaceKey={namespaceKey} open={createKeyOpen} onOpenChange={setCreateKeyOpen} />}
      {namespaceKey && selectedKey && <TranslationKeyDialog namespaceKey={namespaceKey} translationKey={selectedKey.key} onClose={() => setSelectedKey(null)} />}
    </div>
  );
}

function CreateNamespaceDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (key: string) => void }) {
  const create = useCreateNamespace();
  const [form, setForm] = useState({ key: '', module: '', description: '' });
  const reset = () => setForm({ key: '', module: '', description: '' });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Create namespace</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Key" htmlFor="ns-key" required hint="lowercase-hyphenated, e.g. notifications">
            <Input id="ns-key" value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} />
          </FormField>
          <FormField label="Module (optional)" htmlFor="ns-module">
            <Input id="ns-module" value={form.module} onChange={(e) => setForm((f) => ({ ...f, module: e.target.value }))} />
          </FormField>
          <FormField label="Description (optional)" htmlFor="ns-desc">
            <Input id="ns-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() =>
              create.mutate(
                { key: form.key, module: form.module || undefined, description: form.description || undefined },
                { onSuccess: (ns) => { onOpenChange(false); reset(); onCreated(ns.key); } },
              )
            }
            disabled={!form.key || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateKeyDialog({ namespaceKey, open, onOpenChange }: { namespaceKey: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateTranslationKey(namespaceKey);
  const [form, setForm] = useState({ key: '', description: '', defaultValue: '' });
  const reset = () => setForm({ key: '', description: '', defaultValue: '' });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Create translation key</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Key" htmlFor="tk-key" required hint="dot-separated, e.g. order.created.title">
            <Input id="tk-key" value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} />
          </FormField>
          <FormField label="Description (optional)" htmlFor="tk-desc">
            <Input id="tk-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </FormField>
          <FormField label="Default value (optional)" htmlFor="tk-default">
            <Input id="tk-default" value={form.defaultValue} onChange={(e) => setForm((f) => ({ ...f, defaultValue: e.target.value }))} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() =>
              create.mutate(
                { key: form.key, description: form.description || undefined, defaultValue: form.defaultValue || undefined },
                { onSuccess: () => { onOpenChange(false); reset(); } },
              )
            }
            disabled={!form.key || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TranslationKeyDialog({ namespaceKey, translationKey, onClose }: { namespaceKey: string; translationKey: string; onClose: () => void }) {
  const { data: locales } = useLocales(true);
  const [selectedLocales, setSelectedLocales] = useState<string[]>(() => (locales ?? []).slice(0, 2).map((l) => l.code));

  const toggleLocale = (code: string) => setSelectedLocales((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));

  return (
    <Dialog open={!!translationKey} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>{translationKey}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Compare across locales</p>
            <div className="flex flex-wrap gap-3">
              {(locales ?? []).map((l) => (
                <label key={l.code} className="flex items-center gap-1.5 text-sm text-foreground">
                  <Checkbox checked={selectedLocales.includes(l.code)} onChange={() => toggleLocale(l.code)} />
                  {l.code}
                </label>
              ))}
            </div>
          </div>

          {selectedLocales.length === 0 ? (
            <EmptyState title="Select at least one locale to view or edit this translation" className="border-none py-8" />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {selectedLocales.map((code) => (
                <LocaleTranslationEditor key={code} namespaceKey={namespaceKey} translationKey={translationKey} localeCode={code} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LocaleTranslationEditor({ namespaceKey, translationKey, localeCode }: { namespaceKey: string; translationKey: string; localeCode: string }) {
  const { data: bundle, isLoading } = useTranslationBundle(namespaceKey, localeCode);
  const { data: history } = useTranslationHistory(namespaceKey, translationKey, localeCode);
  const setTranslation = useSetTranslation(namespaceKey, translationKey, localeCode);
  const [historyOpen, setHistoryOpen] = useState(false);
  const currentValue = bundle?.[translationKey];
  const [draft, setDraft] = useState(currentValue ?? '');
  const [touched, setTouched] = useState(false);

  const value = touched ? draft : (currentValue ?? '');

  return (
    <div className="rounded-[var(--radius)] border border-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <Badge variant="secondary">{localeCode}</Badge>
        {history && history.length > 0 && (
          <button type="button" className="text-xs text-primary hover:underline" onClick={() => setHistoryOpen((o) => !o)}>
            {historyOpen ? 'Hide history' : `History (${history.length})`}
          </button>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : (
        <>
          <Textarea
            value={value}
            onChange={(e) => { setDraft(e.target.value); setTouched(true); }}
            rows={3}
            placeholder={currentValue == null ? 'No translation yet — inherited/fallback value may apply at runtime' : undefined}
          />
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              onClick={() => setTranslation.mutate({ value }, { onSuccess: () => setTouched(false) })}
              disabled={!touched || !value || setTranslation.isPending}
            >
              {setTranslation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save override
            </Button>
          </div>
        </>
      )}
      {historyOpen && history && (
        <ul className="mt-2 space-y-1 border-t border-border pt-2">
          {history.map((h) => (
            <li key={h.id} className="text-xs text-muted-foreground">
              v{h.version} · {formatDate(h.createdAt)} — {h.newValue}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NamespaceImportExport({ namespaceKey }: { namespaceKey: string }) {
  const { data: locales } = useLocales(true);
  const [localeCode, setLocaleCode] = useState('');
  const { data: exported } = useNamespaceExport(namespaceKey, localeCode || undefined);
  const { data: missing } = useMissingKeys(namespaceKey, localeCode || undefined);
  const importTranslations = useImportNamespace(namespaceKey, localeCode);
  const [importText, setImportText] = useState('');

  const download = () => {
    if (!exported) return;
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${namespaceKey}.${localeCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">Import / Export &amp; missing keys</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField label="Locale" htmlFor="ie-locale">
          <Select id="ie-locale" value={localeCode} onChange={(e) => setLocaleCode(e.target.value)} placeholder="Select a locale" options={(locales ?? []).map((l) => ({ value: l.code, label: l.code }))} className="w-48" />
        </FormField>

        {localeCode && (
          <>
            {missing && missing.missingKeys.length > 0 && (
              <p className="text-xs text-warning">{missing.missingKeys.length} key(s) missing for {localeCode}: {missing.missingKeys.slice(0, 10).join(', ')}{missing.missingKeys.length > 10 ? '…' : ''}</p>
            )}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={download} disabled={!exported}>
                <Download className="h-3.5 w-3.5" />
                Export {localeCode} as JSON
              </Button>
            </div>
            <FormField label="Import translations (JSON object of key → value)" htmlFor="ie-import">
              <Textarea id="ie-import" value={importText} onChange={(e) => setImportText(e.target.value)} rows={4} placeholder='{"order.created.title": "Order created"}' />
            </FormField>
            <Button
              size="sm"
              onClick={() => {
                try {
                  const parsed = JSON.parse(importText);
                  importTranslations.mutate({ translations: parsed }, { onSuccess: () => setImportText('') });
                } catch {
                  // invalid JSON — no-op
                }
              }}
              disabled={!importText || importTranslations.isPending}
            >
              {importTranslations.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Import
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ───────────────────────── Completeness ───────────────────────── */

function CompletenessTab() {
  const { data: namespaces } = useTranslationNamespaces();
  const { data: locales } = useLocales(true);
  const [namespaceKey, setNamespaceKey] = useState('');

  return (
    <div>
      <FormField label="Namespace" htmlFor="cp-ns" className="mb-4 max-w-xs">
        <Select id="cp-ns" value={namespaceKey} onChange={(e) => setNamespaceKey(e.target.value)} placeholder="Select a namespace" options={(namespaces ?? []).map((n) => ({ value: n.key, label: n.key }))} />
      </FormField>

      {!namespaceKey ? (
        <EmptyState title="Select a namespace to see translation completeness by language" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(locales ?? []).map((l) => (
            <CompletenessCard key={l.code} namespaceKey={namespaceKey} localeCode={l.code} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompletenessCard({ namespaceKey, localeCode }: { namespaceKey: string; localeCode: string }) {
  const { data, isLoading } = useTranslationCompleteness(namespaceKey, localeCode);
  if (isLoading || !data) return <Skeleton className="h-24 w-full" />;
  const tone = data.completenessPercent >= 100 ? 'success' : data.completenessPercent >= 50 ? 'warning' : 'danger';
  return (
    <Card>
      <CardContent className="space-y-2 py-4">
        <div className="flex items-center justify-between">
          <Badge variant="secondary">{localeCode}</Badge>
          <StatusBadge status={`${Math.round(data.completenessPercent)}%`} tone={tone} />
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className={`h-full rounded-full ${tone === 'success' ? 'bg-success' : tone === 'warning' ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${Math.min(100, data.completenessPercent)}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{data.translatedKeys} / {data.totalKeys} translated · {data.missingKeys} missing</p>
      </CardContent>
    </Card>
  );
}

/* ───────────────────────── Issues ───────────────────────── */

function IssuesTab() {
  const { data: namespaces } = useTranslationNamespaces();
  const { data: locales } = useLocales(true);
  const [namespaceKey, setNamespaceKey] = useState('');
  const [localeCode, setLocaleCode] = useState('');
  const { data: issues, isLoading } = useTranslationIssues(namespaceKey || undefined, localeCode || undefined);

  return (
    <div>
      <div className="mb-4 flex gap-3">
        <FormField label="Namespace" htmlFor="is-ns">
          <Select id="is-ns" value={namespaceKey} onChange={(e) => setNamespaceKey(e.target.value)} placeholder="Select a namespace" options={(namespaces ?? []).map((n) => ({ value: n.key, label: n.key }))} className="w-56" />
        </FormField>
        <FormField label="Locale" htmlFor="is-locale">
          <Select id="is-locale" value={localeCode} onChange={(e) => setLocaleCode(e.target.value)} placeholder="Select a locale" options={(locales ?? []).map((l) => ({ value: l.code, label: l.code }))} className="w-40" />
        </FormField>
      </div>

      {!namespaceKey || !localeCode ? (
        <EmptyState title="Select a namespace and locale to detect missing, outdated or conflicting translations" />
      ) : isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !issues || issues.length === 0 ? (
        <EmptyState title="No issues detected" />
      ) : (
        <div className="space-y-2">
          {issues.map((issue, i) => (
            <div key={i} className={`flex items-start gap-3 rounded-[var(--radius)] border p-3 text-sm ${ISSUE_TONE[issue.type] === 'danger' ? 'border-danger/20 bg-danger/5' : 'border-warning/20 bg-warning/5'}`}>
              <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${ISSUE_TONE[issue.type] === 'danger' ? 'text-danger' : 'text-warning'}`} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{issue.key}</span>
                  <Badge variant={ISSUE_TONE[issue.type]}>{issue.type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{issue.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Provider Requirements ───────────────────────── */

function ProviderRequirementsTab() {
  const { data: requirements, isLoading } = useProviderRequirements();
  const setRequirement = useSetProviderRequirement();
  const [form, setForm] = useState({ marketplaceKey: '', countryCode: '', requiredLocaleCode: '', requiredCurrencyCode: '', requiredTimezone: '', requiredMeasurementSystem: '' as MeasurementSystem | '' });
  const reset = () => setForm({ marketplaceKey: '', countryCode: '', requiredLocaleCode: '', requiredCurrencyCode: '', requiredTimezone: '', requiredMeasurementSystem: '' });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Set a marketplace locale requirement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <FormField label="Marketplace key" htmlFor="pr-marketplace" required>
              <Input id="pr-marketplace" value={form.marketplaceKey} onChange={(e) => setForm((f) => ({ ...f, marketplaceKey: e.target.value }))} />
            </FormField>
            <FormField label="Country (optional)" htmlFor="pr-country">
              <Input id="pr-country" value={form.countryCode} onChange={(e) => setForm((f) => ({ ...f, countryCode: e.target.value.toUpperCase() }))} />
            </FormField>
            <FormField label="Required locale" htmlFor="pr-locale" required>
              <Input id="pr-locale" value={form.requiredLocaleCode} onChange={(e) => setForm((f) => ({ ...f, requiredLocaleCode: e.target.value }))} />
            </FormField>
            <FormField label="Required currency (optional)" htmlFor="pr-currency">
              <Input id="pr-currency" value={form.requiredCurrencyCode} onChange={(e) => setForm((f) => ({ ...f, requiredCurrencyCode: e.target.value.toUpperCase() }))} />
            </FormField>
            <FormField label="Required timezone (optional)" htmlFor="pr-tz">
              <Input id="pr-tz" value={form.requiredTimezone} onChange={(e) => setForm((f) => ({ ...f, requiredTimezone: e.target.value }))} />
            </FormField>
            <FormField label="Measurement system (optional)" htmlFor="pr-measure">
              <Select id="pr-measure" value={form.requiredMeasurementSystem} onChange={(e) => setForm((f) => ({ ...f, requiredMeasurementSystem: e.target.value as MeasurementSystem | '' }))} placeholder="Not specified" options={MEASUREMENT_SYSTEMS.map((m) => ({ value: m, label: m }))} />
            </FormField>
          </div>
          <Button
            size="sm"
            onClick={() =>
              setRequirement.mutate(
                {
                  marketplaceKey: form.marketplaceKey,
                  countryCode: form.countryCode || undefined,
                  requiredLocaleCode: form.requiredLocaleCode,
                  requiredCurrencyCode: form.requiredCurrencyCode || undefined,
                  requiredTimezone: form.requiredTimezone || undefined,
                  requiredMeasurementSystem: form.requiredMeasurementSystem || undefined,
                },
                { onSuccess: reset },
              )
            }
            disabled={!form.marketplaceKey || !form.requiredLocaleCode || setRequirement.isPending}
          >
            {setRequirement.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save requirement
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !requirements || requirements.length === 0 ? (
        <EmptyState title="No marketplace locale requirements configured" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Marketplace</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Required locale</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Timezone</TableHead>
              <TableHead>Measurement</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requirements.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-sm font-medium text-foreground">{r.marketplaceKey}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.countryCode ?? 'All'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.requiredLocaleCode}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.requiredCurrencyCode ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.requiredTimezone ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.requiredMeasurementSystem ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

/* ───────────────────────── Formatting Preview ───────────────────────── */

function FormattingPreviewTab() {
  const { data: locales } = useLocales(true);
  const [localeCode, setLocaleCode] = useState('');
  const locale = (locales ?? []).find((l) => l.code === localeCode);
  const [numberValue, setNumberValue] = useState('1234.5');
  const [currencyValue, setCurrencyValue] = useState('99.99');
  const formatDatePreview = useFormatDatePreview();
  const formatNumberPreview = useFormatNumberPreview();
  const formatCurrencyPreview = useFormatCurrencyPreview();

  return (
    <div className="space-y-4">
      <FormField label="Locale" htmlFor="fp-locale" className="max-w-xs">
        <Select id="fp-locale" value={localeCode} onChange={(e) => setLocaleCode(e.target.value)} placeholder="Select a locale" options={(locales ?? []).map((l) => ({ value: l.code, label: `${l.displayName} (${l.code})` }))} />
      </FormField>

      {!localeCode ? (
        <EmptyState title="Select a locale to preview its formatting and direction" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {locale && (
            <Card className="sm:col-span-2">
              <CardContent className="py-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Direction preview ({locale.direction})</p>
                <p dir={locale.direction === 'RTL' ? 'rtl' : 'ltr'} className="rounded-[var(--radius)] border border-border bg-secondary/30 p-3 text-sm text-foreground">
                  {locale.nativeName} — {locale.displayName}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm">Date</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button size="sm" variant="outline" onClick={() => formatDatePreview.mutate({ date: new Date().toISOString(), localeCode })} disabled={formatDatePreview.isPending}>
                {formatDatePreview.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Preview today&apos;s date
              </Button>
              {formatDatePreview.data && <p className="text-sm text-foreground">{formatDatePreview.data}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Number</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Input value={numberValue} onChange={(e) => setNumberValue(e.target.value)} className="w-32" />
              <Button size="sm" variant="outline" onClick={() => formatNumberPreview.mutate({ value: Number(numberValue), localeCode })} disabled={!numberValue || formatNumberPreview.isPending}>
                {formatNumberPreview.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Preview
              </Button>
              {formatNumberPreview.data && <p className="text-sm text-foreground">{formatNumberPreview.data}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Currency</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Input value={currencyValue} onChange={(e) => setCurrencyValue(e.target.value)} className="w-32" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => formatCurrencyPreview.mutate({ value: Number(currencyValue), localeCode, currencyCode: locale?.currencyCode })}
                disabled={!currencyValue || formatCurrencyPreview.isPending}
              >
                {formatCurrencyPreview.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Preview
              </Button>
              {formatCurrencyPreview.data && <p className="text-sm text-foreground">{formatCurrencyPreview.data}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Measurement system</CardTitle></CardHeader>
            <CardContent>
              {locale && <p className="text-sm text-foreground">{locale.measurementSystem}</p>}
            </CardContent>
          </Card>
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
