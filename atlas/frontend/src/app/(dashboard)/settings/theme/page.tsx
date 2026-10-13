'use client';

import { useMemo, useState } from 'react';
import { Plus, Check, Archive, ArchiveRestore, History, Star, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
  useArchiveTheme,
  useCreateTheme,
  useEffectiveTheme,
  usePublishTheme,
  useRestoreTheme,
  useRollbackTheme,
  useSetActiveTheme,
  useTheme,
  useThemeHistory,
  useThemes,
  useValidateThemeTokens,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { CreateThemePayload, ThemeFilterParams, ThemeModeTokens, ThemeScope, ThemeStatus, ThemeTokens } from '@/types';

const SCOPE_OPTIONS: { value: ThemeScope; label: string }[] = [
  { value: 'GLOBAL', label: 'Global' },
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'WORKSPACE', label: 'Workspace' },
];

const STATUS_OPTIONS: { value: ThemeStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

function defaultModeTokens(): ThemeModeTokens {
  return { colors: { background: '', surface: '', text: '', primary: '', onPrimary: '', secondary: '', onSecondary: '', border: '' } };
}

export default function ThemeManagementPage() {
  const [scope, setScope] = useState<ThemeScope | ''>('');
  const [status, setStatus] = useState<ThemeStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const effective = useEffectiveTheme();

  const params = useMemo<ThemeFilterParams>(() => ({ scope: scope || undefined, status: status || undefined, search: search || undefined, page, limit }), [scope, status, search, page, limit]);
  const themes = useThemes(params);
  const rows = themes.data?.data ?? [];
  const hasActiveFilters = !!(scope || status || search);

  return (
    <div>
      <PageHeader
        title="Theme & Branding"
        description="Light/dark/system mode, logo, accent color, typography and density."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New theme
          </Button>
        }
      />

      {effective.data && (
        <Card className="mb-4">
          <CardContent className="flex flex-wrap items-center gap-4 pt-6 text-sm">
            <span className="text-muted-foreground">Active theme:</span>
            <span className="font-medium text-foreground">{effective.data.theme.name}</span>
            <Badge variant="secondary" className="text-[10px]">
              {effective.data.mode}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {effective.data.density}
            </Badge>
            <Badge variant="info" className="text-[10px]">
              {effective.data.source}
            </Badge>
          </CardContent>
        </Card>
      )}

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search themes…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setScope('');
          setStatus('');
          setSearch('');
          setPage(1);
        }}
        className="mb-4"
      >
        <Select value={scope} onChange={(e) => setScope(e.target.value as ThemeScope | '')} options={[{ value: '', label: 'All scopes' }, ...SCOPE_OPTIONS]} className="h-9 w-40" />
        <Select value={status} onChange={(e) => setStatus(e.target.value as ThemeStatus | '')} options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]} className="h-9 w-40" />
      </FilterBar>

      {themes.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : themes.isError ? (
        <QueryErrorState refetch={themes.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No themes yet" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Theme</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Branded</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => setSelectedId(t.id)}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {t.accentColor && <span className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: t.accentColor }} />}
                      <div>
                        <p className="text-sm font-medium text-foreground">{t.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{t.key}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {t.scope}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.isBranded ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={themes.data?.page ?? page}
            limit={themes.data?.limit ?? limit}
            total={themes.data?.total ?? 0}
            totalPages={themes.data?.totalPages ?? 0}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </>
      )}

      <CreateThemeDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ThemeDetailDrawer id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function ColorFieldGroup({ label, tokens, onChange }: { label: string; tokens: ThemeModeTokens; onChange: (t: ThemeModeTokens) => void }) {
  const fields: Array<keyof ThemeModeTokens['colors']> = ['background', 'surface', 'text', 'primary', 'onPrimary', 'secondary', 'onSecondary', 'border'];
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="grid grid-cols-4 gap-2">
        {fields.map((f) => (
          <FormField key={f} label={String(f)} htmlFor={`${label}-${f}`}>
            <Input
              id={`${label}-${f}`}
              type="color"
              value={tokens.colors[f] || '#000000'}
              onChange={(e) => onChange({ ...tokens, colors: { ...tokens.colors, [f]: e.target.value } })}
              className="h-9 w-full p-1"
            />
          </FormField>
        ))}
      </div>
    </div>
  );
}

function CreateThemeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const createTheme = useCreateTheme();
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<ThemeScope>('WORKSPACE');
  const [isBranded, setIsBranded] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [accentColor, setAccentColor] = useState('#6366f1');
  const [light, setLight] = useState<ThemeModeTokens>(defaultModeTokens());
  const [dark, setDark] = useState<ThemeModeTokens>(defaultModeTokens());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>New theme</DialogTitle>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Key" htmlFor="theme-key" required>
              <Input id="theme-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. acme-branded" />
            </FormField>
            <FormField label="Name" htmlFor="theme-name" required>
              <Input id="theme-name" value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Description" htmlFor="theme-description">
              <Input id="theme-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </FormField>
            <FormField label="Scope" htmlFor="theme-scope">
              <Select id="theme-scope" value={scope} onChange={(e) => setScope(e.target.value as ThemeScope)} options={SCOPE_OPTIONS} />
            </FormField>
            <FormField label="Logo URL" htmlFor="theme-logo">
              <Input id="theme-logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
            </FormField>
            <FormField label="Accent color" htmlFor="theme-accent">
              <Input id="theme-accent" type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-9 w-full p-1" />
            </FormField>
          </div>
          <label className="flex items-center gap-3 text-sm text-foreground">
            <Switch checked={isBranded} onChange={(e) => setIsBranded(e.target.checked)} />
            Branded theme
          </label>

          <ColorFieldGroup label="Light mode colors" tokens={light} onChange={setLight} />
          <ColorFieldGroup label="Dark mode colors" tokens={dark} onChange={setDark} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const tokens: ThemeTokens = { light, dark };
              const payload: CreateThemePayload = { key, name, description: description || undefined, scope, isBranded, logoUrl: logoUrl || undefined, accentColor, tokens };
              createTheme.mutate(payload, { onSuccess: () => onOpenChange(false) });
            }}
            disabled={!key || !name || createTheme.isPending}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ThemeDetailDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: theme, isLoading } = useTheme(id ?? undefined);
  const publish = usePublishTheme(id ?? '');
  const archive = useArchiveTheme(id ?? '');
  const restore = useRestoreTheme(id ?? '');
  const setActive = useSetActiveTheme();
  const validateTokens = useValidateThemeTokens();
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <Drawer open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent size="lg">
        <DrawerHeader>
          <DrawerTitle>{theme?.name ?? 'Theme'}</DrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          {isLoading || !theme ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={theme.status} />
                <ActionMenu
                  items={[
                    { label: 'Set as active', icon: Star, onSelect: () => setActive.mutate({ themeKey: theme.key, scope: theme.scope }) },
                    ...(theme.status === 'DRAFT' ? [{ label: 'Publish', icon: Check, onSelect: () => publish.mutate() }] : []),
                    { label: 'Check contrast', icon: AlertTriangle, onSelect: () => validateTokens.mutate(theme.tokens) },
                    ...(theme.status !== 'ARCHIVED' ? [{ label: 'Archive', icon: Archive, onSelect: () => archive.mutate(), destructive: true, separatorBefore: true }] : []),
                    ...(theme.status === 'ARCHIVED' ? [{ label: 'Restore', icon: ArchiveRestore, onSelect: () => restore.mutate() }] : []),
                    { label: 'History', icon: History, onSelect: () => setHistoryOpen(true) },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Key" value={theme.key} />
                <Field label="Scope" value={theme.scope} />
                <Field label="Branded" value={theme.isBranded ? 'Yes' : 'No'} />
                <Field label="Version" value={`v${theme.version}`} />
                <Field label="Accent color" value={theme.accentColor ?? '—'} />
                <Field label="Published" value={theme.publishedAt ? formatDate(theme.publishedAt) : '—'} />
              </div>

              {validateTokens.data && validateTokens.data.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contrast warnings</p>
                  {validateTokens.data.map((w, i) => (
                    <div key={i} className="flex items-center justify-between rounded-[var(--radius)] border border-warning/40 p-2 text-xs">
                      <span className="text-foreground">
                        {w.pair} ({w.mode})
                      </span>
                      <span className="text-warning">
                        {w.ratio.toFixed(2)} / {w.minimumRequired} required
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {validateTokens.data && validateTokens.data.length === 0 && <Badge variant="success">No contrast issues</Badge>}

              <div className="grid grid-cols-2 gap-4">
                <ColorSwatches title="Light" colors={theme.tokens.light.colors} />
                <ColorSwatches title="Dark" colors={theme.tokens.dark.colors} />
              </div>
            </div>
          )}
        </DrawerBody>
      </DrawerContent>

      {id && theme && <ThemeHistoryDialog id={id} open={historyOpen} onOpenChange={setHistoryOpen} />}
    </Drawer>
  );
}

function ColorSwatches({ title, colors }: { title: string; colors: Record<string, string | undefined> }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(colors)
          .filter(([, v]) => !!v)
          .map(([k, v]) => (
            <div key={k} className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px]">
              <span className="h-2.5 w-2.5 rounded-full border border-border" style={{ backgroundColor: v }} />
              {k}
            </div>
          ))}
      </div>
    </div>
  );
}

function ThemeHistoryDialog({ id, open, onOpenChange }: { id: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const history = useThemeHistory(id);
  const rollback = useRollbackTheme(id);
  const [historyId, setHistoryId] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Theme history</DialogTitle>
        </DialogHeader>
        {!history.data || history.data.length === 0 ? (
          <EmptyState title="No history yet" className="border-none py-8" />
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {history.data.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-2.5 text-sm">
                <div>
                  <p className="text-foreground">
                    v{h.version} · {(h.fromStatus ?? 'created').toLowerCase()} → {h.toStatus.toLowerCase()}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(h.createdAt)}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setHistoryId(h.id)}>
                  Select
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 border-t border-border pt-3">
          <FormField label="Selected history ID" htmlFor="theme-rollback-id">
            <Input id="theme-rollback-id" value={historyId} onChange={(e) => setHistoryId(e.target.value)} placeholder="Click Select above, or paste an ID" />
          </FormField>
          <Button variant="outline" size="sm" onClick={() => rollback.mutate({ historyId }, { onSuccess: () => setHistoryId('') })} disabled={!historyId || rollback.isPending}>
            Roll back
          </Button>
        </div>
      </DialogContent>
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
