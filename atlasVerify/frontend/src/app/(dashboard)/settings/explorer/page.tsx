'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
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
import { Check, Ban, Archive, RotateCcw, History, KeyRound } from 'lucide-react';
import {
  useArchiveSettingValue,
  useCreateSettingValue,
  useDisableSettingValue,
  useEnableSettingValue,
  usePublishSettingValue,
  useResetSettingValue,
  useResolveSettings,
  useRollbackSettingValue,
  useSettingDefinitions,
  useSettingValueHistory,
  useSettingValues,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { SettingDefinition, SettingDefinitionFilterParams, SettingDefinitionStatus, SettingScope, SettingValue } from '@/types';

const STATUS_OPTIONS: { value: SettingDefinitionStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DEPRECATED', label: 'Deprecated' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const SCOPE_OPTIONS: { value: SettingScope; label: string }[] = [
  { value: 'GLOBAL', label: 'Global' },
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'WORKSPACE', label: 'Workspace' },
  { value: 'MODULE', label: 'Module' },
  { value: 'USER', label: 'User' },
];

export default function SettingsExplorerPage() {
  const [category, setCategory] = useState('');
  const [module, setModule] = useState('');
  const [status, setStatus] = useState<SettingDefinitionStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const params = useMemo<SettingDefinitionFilterParams>(
    () => ({ category: category || undefined, module: module || undefined, status: status || undefined, search: search || undefined, page, limit }),
    [category, module, status, search, page, limit],
  );

  const definitions = useSettingDefinitions(params);
  const rows = definitions.data?.data ?? [];
  const hasActiveFilters = !!(category || module || status || search);

  return (
    <div>
      <PageHeader title="Settings Explorer" description="Every setting definition — inherited vs. overridden values, precedence and history." />

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search settings…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setCategory('');
          setModule('');
          setStatus('');
          setSearch('');
          setPage(1);
        }}
        className="mb-4"
      >
        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="h-9 w-40" />
        <Input value={module} onChange={(e) => setModule(e.target.value)} placeholder="Module" className="h-9 w-40" />
        <Select value={status} onChange={(e) => setStatus(e.target.value as SettingDefinitionStatus | '')} options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]} className="h-9 w-40" />
      </FilterBar>

      {definitions.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : definitions.isError ? (
        <QueryErrorState refetch={definitions.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No settings found" description="Nothing matches these filters." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Allowed scopes</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.id} className="cursor-pointer" onClick={() => setSelectedKey(d.key)}>
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">{d.label}</p>
                    <p className="font-mono text-xs text-muted-foreground">{d.key}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.category}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {d.isSecretRef ? 'SECRET' : d.valueType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.allowedScopes.join(', ')}</TableCell>
                  <TableCell>
                    <StatusBadge status={d.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={definitions.data?.page ?? page}
            limit={definitions.data?.limit ?? limit}
            total={definitions.data?.total ?? 0}
            totalPages={definitions.data?.totalPages ?? 0}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </>
      )}

      <SettingDetailDrawer definitionKey={selectedKey} definitions={rows} onClose={() => setSelectedKey(null)} />
    </div>
  );
}

function SettingDetailDrawer({ definitionKey, definitions, onClose }: { definitionKey: string | null; definitions: SettingDefinition[]; onClose: () => void }) {
  const definition = definitions.find((d) => d.key === definitionKey);
  const resolved = useResolveSettings(undefined, undefined, definitionKey ? [definitionKey] : undefined, !!definitionKey);
  const values = useSettingValues(definitionKey ? { definitionKey } : {}, !!definitionKey);
  const [createOpen, setCreateOpen] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);

  const resolvedEntry = definitionKey ? resolved.data?.[definitionKey] : undefined;

  return (
    <Drawer open={!!definitionKey} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent size="lg">
        <DrawerHeader>
          <DrawerTitle>{definition?.label ?? definitionKey}</DrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          {!definition ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="space-y-6">
              {definition.description && <p className="text-sm text-muted-foreground">{definition.description}</p>}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Category" value={definition.category} />
                <Field label="Module" value={definition.module ?? '—'} />
                <Field label="Value type" value={definition.isSecretRef ? 'SECRET (masked)' : definition.valueType} />
                <Field label="Default value" value={definition.isSecretRef ? '••••••••' : JSON.stringify(definition.defaultValue ?? null)} />
              </div>

              <div className="rounded-[var(--radius)] border border-border p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resolved (effective) value</p>
                {resolved.isLoading ? (
                  <Skeleton className="h-8 w-full" />
                ) : resolvedEntry ? (
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-foreground">
                      {definition.isSecretRef ? '••••••••' : JSON.stringify(resolvedEntry.value)}
                    </span>
                    <Badge variant={resolvedEntry.source === 'DEFAULT' ? 'secondary' : 'info'} className="text-[10px]">
                      {resolvedEntry.source}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No value resolved.</p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Values by scope</p>
                  <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
                    <KeyRound className="h-3.5 w-3.5" />
                    Set value
                  </Button>
                </div>
                {values.isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : !values.data || values.data.data.length === 0 ? (
                  <EmptyState title="No values set" className="border-none py-6" />
                ) : (
                  <div className="space-y-2">
                    {values.data.data.map((v) => (
                      <SettingValueRow key={v.id} value={v} isSecretRef={definition.isSecretRef} onOpenHistory={() => setHistoryId(v.id)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DrawerBody>
      </DrawerContent>

      {definition && <CreateSettingValueDialog open={createOpen} onOpenChange={setCreateOpen} definition={definition} />}
      <SettingValueHistoryDrawer valueId={historyId} onClose={() => setHistoryId(null)} />
    </Drawer>
  );
}

function SettingValueRow({ value, isSecretRef, onOpenHistory }: { value: SettingValue; isSecretRef: boolean; onOpenHistory: () => void }) {
  const publish = usePublishSettingValue(value.id);
  const enable = useEnableSettingValue(value.id);
  const disable = useDisableSettingValue(value.id);
  const archive = useArchiveSettingValue(value.id);
  const reset = useResetSettingValue(value.id);

  return (
    <div className="rounded-[var(--radius)] border border-border p-3 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {value.scope}
          </Badge>
          <StatusBadge status={value.status} />
        </div>
        <ActionMenu
          items={[
            ...(value.status === 'DRAFT' ? [{ label: 'Publish', icon: Check, onSelect: () => publish.mutate() }] : []),
            ...(value.status !== 'DISABLED' && value.status !== 'ARCHIVED' ? [{ label: 'Disable', icon: Ban, onSelect: () => disable.mutate() }] : []),
            ...(value.status === 'DISABLED' ? [{ label: 'Enable', icon: Check, onSelect: () => enable.mutate() }] : []),
            { label: 'History', icon: History, onSelect: onOpenHistory, separatorBefore: true },
            { label: 'Reset to default', icon: RotateCcw, onSelect: () => reset.mutate() },
            ...(value.status !== 'ARCHIVED' ? [{ label: 'Archive', icon: Archive, onSelect: () => archive.mutate(), destructive: true }] : []),
          ]}
        />
      </div>
      <p className="mt-1 font-mono text-xs text-foreground">{isSecretRef ? '••••••••' : JSON.stringify(value.value)}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        v{value.version} · updated {formatDate(value.updatedAt)}
        {value.effectiveFrom && ` · effective from ${formatDate(value.effectiveFrom)}`}
        {value.effectiveTo && ` to ${formatDate(value.effectiveTo)}`}
      </p>
      {value.changeReason && <p className="mt-1 text-xs text-muted-foreground">{value.changeReason}</p>}
    </div>
  );
}

function CreateSettingValueDialog({ open, onOpenChange, definition }: { open: boolean; onOpenChange: (o: boolean) => void; definition: SettingDefinition }) {
  const createValue = useCreateSettingValue();
  const [scope, setScope] = useState<SettingScope>(definition.allowedScopes[0] ?? 'WORKSPACE');
  const [moduleKey, setModuleKey] = useState('');
  const [rawValue, setRawValue] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [changeReason, setChangeReason] = useState('');

  function parseValue(): unknown {
    if (definition.valueType === 'BOOLEAN') return rawValue === 'true';
    if (definition.valueType === 'NUMBER') return Number(rawValue);
    if (definition.valueType === 'JSON' || definition.valueType === 'LIST') {
      try {
        return JSON.parse(rawValue);
      } catch {
        return rawValue;
      }
    }
    return rawValue;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Set value — {definition.label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Scope" htmlFor="sv-scope">
            <Select
              id="sv-scope"
              value={scope}
              onChange={(e) => setScope(e.target.value as SettingScope)}
              options={definition.allowedScopes.map((s) => ({ value: s, label: s }))}
            />
          </FormField>
          {scope === 'MODULE' && (
            <FormField label="Module key" htmlFor="sv-module" required>
              <Input id="sv-module" value={moduleKey} onChange={(e) => setModuleKey(e.target.value)} />
            </FormField>
          )}

          {definition.valueType === 'BOOLEAN' ? (
            <FormField label="Value" htmlFor="sv-value">
              <Select id="sv-value" value={rawValue} onChange={(e) => setRawValue(e.target.value)} options={[{ value: 'true', label: 'True' }, { value: 'false', label: 'False' }]} placeholder="Select" />
            </FormField>
          ) : definition.valueType === 'ENUM' ? (
            <FormField label="Value" htmlFor="sv-value">
              <Select id="sv-value" value={rawValue} onChange={(e) => setRawValue(e.target.value)} options={definition.enumOptions.map((o) => ({ value: o, label: o }))} placeholder="Select" />
            </FormField>
          ) : definition.valueType === 'JSON' || definition.valueType === 'LIST' ? (
            <FormField label="Value (JSON)" htmlFor="sv-value">
              <Textarea id="sv-value" value={rawValue} onChange={(e) => setRawValue(e.target.value)} rows={4} />
            </FormField>
          ) : (
            <FormField label="Value" htmlFor="sv-value">
              <Input id="sv-value" type={definition.isSecretRef ? 'password' : definition.valueType === 'NUMBER' ? 'number' : 'text'} value={rawValue} onChange={(e) => setRawValue(e.target.value)} />
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Effective from" htmlFor="sv-from">
              <Input id="sv-from" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
            </FormField>
            <FormField label="Effective to" htmlFor="sv-to">
              <Input id="sv-to" type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Change reason" htmlFor="sv-reason">
            <Input id="sv-reason" value={changeReason} onChange={(e) => setChangeReason(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              createValue.mutate(
                {
                  definitionKey: definition.key,
                  scope,
                  moduleKey: scope === 'MODULE' ? moduleKey : undefined,
                  value: parseValue(),
                  effectiveFrom: effectiveFrom || undefined,
                  effectiveTo: effectiveTo || undefined,
                  changeReason: changeReason || undefined,
                },
                { onSuccess: () => onOpenChange(false) },
              )
            }
            disabled={!rawValue || createValue.isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingValueHistoryDrawer({ valueId, onClose }: { valueId: string | null; onClose: () => void }) {
  const history = useSettingValueHistory(valueId ?? undefined);
  const rollback = useRollbackSettingValue(valueId ?? '');

  return (
    <Drawer open={!!valueId} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent size="sm">
        <DrawerHeader>
          <DrawerTitle>Value history</DrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          {history.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !history.data || history.data.length === 0 ? (
            <EmptyState title="No history yet" className="border-none py-8" />
          ) : (
            <div className="space-y-2">
              {history.data.map((h) => (
                <div key={h.id} className="rounded-[var(--radius)] border border-border p-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-foreground">
                      v{h.version} · {h.fromStatus?.toLowerCase() ?? 'created'} → {h.toStatus.toLowerCase()}
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => rollback.mutate({ historyId: h.id })} disabled={rollback.isPending}>
                      Roll back
                    </Button>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{JSON.stringify(h.toValue)}</p>
                  {h.changeReason && <p className="mt-1 text-xs text-muted-foreground">{h.changeReason}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(h.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
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
