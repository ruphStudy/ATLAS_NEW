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
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useActivateMultiBrand,
  useArchiveMultiBrand,
  useChangeBrandOwnership,
  useCreateMultiBrand,
  useDeactivateMultiBrand,
  useLinkBrandEntity,
  useMultiBrand,
  useMultiBrandHistory,
  useMultiBrandLinks,
  useMultiBrands,
  useRestoreMultiBrand,
  useSetDefaultMultiBrand,
  useUnlinkBrandEntity,
  useUpdateMultiBrand,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import type { CreateMultiBrandPayload, MultiBrandStatus } from '@/types';

const STATUS_OPTIONS: { value: MultiBrandStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ARCHIVED', label: 'Archived' },
];

function useWorkspaceId() {
  return useAuthStore((s) => s.user?.workspaceId);
}

export default function BrandsPage() {
  const [status, setStatus] = useState<MultiBrandStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useMultiBrands({ status: status || undefined, search: search || undefined, page, limit: 20 });

  return (
    <div>
      <PageHeader
        title="Brands"
        description="Multi-brand profiles, ownership, product/marketplace/country associations and lifecycle status."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create brand
          </Button>
        }
      />

      <FilterBar hasActiveFilters={!!status || !!search} onClearFilters={() => { setStatus(''); setSearch(''); setPage(1); }} searchValue={search} onSearchChange={(v) => { setSearch(v); setPage(1); }}>
        <Select value={status} onChange={(e) => { setStatus(e.target.value as MultiBrandStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-36" />
      </FilterBar>

      {isLoading ? (
        <Skeleton className="mt-4 h-64 w-full" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No brands found" className="mt-4" />
      ) : (
        <>
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Countries</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((b) => (
                <TableRow key={b.id} clickable onClick={() => setSelectedId(b.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{b.code}</TableCell>
                  <TableCell className="text-sm text-foreground">{b.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.legalOwner ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.countryCodes.join(', ') || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.isDefault ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <StatusBadge status={b.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <CreateBrandDialog open={createOpen} onOpenChange={setCreateOpen} />
      <BrandDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreateBrandDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const workspaceId = useWorkspaceId();
  const create = useCreateMultiBrand();
  const [form, setForm] = useState<Omit<CreateMultiBrandPayload, 'workspaceId'>>({ code: '', name: '' });
  const reset = () => setForm({ code: '', name: '' });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Create brand</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Code" htmlFor="b-code" required>
            <Input id="b-code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          </FormField>
          <FormField label="Name" htmlFor="b-name" required>
            <Input id="b-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Legal owner" htmlFor="b-owner">
            <Input id="b-owner" value={form.legalOwner ?? ''} onChange={(e) => setForm((f) => ({ ...f, legalOwner: e.target.value }))} />
          </FormField>
          <FormField label="Logo URL" htmlFor="b-logo">
            <Input id="b-logo" value={form.logoUrl ?? ''} onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))} />
          </FormField>
          <FormField label="Country codes (comma-separated)" htmlFor="b-countries">
            <Input id="b-countries" value={(form.countryCodes ?? []).join(', ')} onChange={(e) => setForm((f) => ({ ...f, countryCodes: e.target.value.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) }))} />
          </FormField>
          <FormField label="Locale code" htmlFor="b-locale">
            <Input id="b-locale" value={form.localeCode ?? ''} onChange={(e) => setForm((f) => ({ ...f, localeCode: e.target.value }))} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => workspaceId && create.mutate({ ...form, workspaceId }, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!workspaceId || !form.code || !form.name || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BrandDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: brand, isLoading } = useMultiBrand(id ?? undefined);
  const activate = useActivateMultiBrand(id ?? '');
  const deactivate = useDeactivateMultiBrand(id ?? '');
  const archive = useArchiveMultiBrand(id ?? '');
  const restore = useRestoreMultiBrand(id ?? '');
  const setDefault = useSetDefaultMultiBrand(id ?? '');
  const update = useUpdateMultiBrand(id ?? '');
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editName, setEditName] = useState('');

  const actions: ActionMenuItem[] = [];
  if (brand) {
    if (brand.status !== 'ACTIVE') actions.push({ label: 'Activate', onSelect: () => activate.mutate(undefined) });
    if (brand.status === 'ACTIVE') {
      actions.push({ label: 'Deactivate', onSelect: () => setDeactivateOpen(true) });
      if (!brand.isDefault) actions.push({ label: 'Set as default', onSelect: () => setDefault.mutate() });
    }
    if (brand.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => setArchiveOpen(true), destructive: true, separatorBefore: true });
    if (brand.status === 'ARCHIVED') actions.push({ label: 'Restore', onSelect: () => restore.mutate(undefined) });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{brand?.name ?? 'Brand'}</span>
            {brand && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !brand ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="ownership">Ownership</TabsTrigger>
              <TabsTrigger value="links">Entity Links</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <Field label="Code" value={brand.code} />
                <Field label="Legal owner" value={brand.legalOwner ?? '—'} />
                <Field label="Status" value={brand.status} />
                <Field label="Default" value={brand.isDefault ? 'Yes' : 'No'} />
                <Field label="Priority" value={String(brand.priority)} />
                <Field label="Version" value={String(brand.version)} />
                <Field label="Locale" value={brand.localeCode ?? '—'} />
                <Field label="Tax jurisdiction" value={brand.taxJurisdictionCode ?? '—'} />
                <Field label="Compliance profile" value={brand.complianceProfileKey ?? '—'} />
              </div>
              {brand.description && <p className="mt-4 text-sm text-muted-foreground">{brand.description}</p>}
              {brand.countryCodes.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Countries</p>
                  <p className="text-sm text-foreground">{brand.countryCodes.join(', ')}</p>
                </div>
              )}
              {brand.currencyCodes.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Currencies</p>
                  <p className="text-sm text-foreground">{brand.currencyCodes.join(', ')}</p>
                </div>
              )}
              {brand.marketplaceAccountIds.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Marketplace accounts</p>
                  <p className="text-sm text-foreground">{brand.marketplaceAccountIds.join(', ')}</p>
                </div>
              )}
              <div className="mt-4 flex items-end gap-2">
                <FormField label="Rename brand" htmlFor="b-rename">
                  <Input id="b-rename" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={brand.name} className="h-9 w-64" />
                </FormField>
                <Button size="sm" onClick={() => update.mutate({ name: editName }, { onSuccess: () => setEditName('') })} disabled={!editName || update.isPending}>
                  Save
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="ownership">
              <OwnershipTab id={brand.id} currentOwner={brand.legalOwner} />
            </TabsContent>
            <TabsContent value="links">
              <LinksTab brandId={brand.id} />
            </TabsContent>
            <TabsContent value="history">
              <HistoryTab id={brand.id} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
      <ReasonDialog open={deactivateOpen} onOpenChange={setDeactivateOpen} title="Deactivate this brand" confirmLabel="Deactivate" variant="danger" pending={deactivate.isPending} onSubmit={(reason) => deactivate.mutate(reason, { onSuccess: () => setDeactivateOpen(false) })} />
      <ReasonDialog open={archiveOpen} onOpenChange={setArchiveOpen} title="Archive this brand" confirmLabel="Archive" variant="danger" pending={archive.isPending} onSubmit={(reason) => archive.mutate(reason, { onSuccess: () => setArchiveOpen(false) })} />
    </Dialog>
  );
}

function OwnershipTab({ id, currentOwner }: { id: string; currentOwner?: string | null }) {
  const change = useChangeBrandOwnership(id);
  const [legalOwner, setLegalOwner] = useState('');
  const [reason, setReason] = useState('');

  return (
    <div className="max-w-md space-y-4">
      <p className="text-sm text-muted-foreground">Current legal owner: {currentOwner ?? 'Not set'}</p>
      <FormField label="New legal owner" htmlFor="own-owner" required>
        <Input id="own-owner" value={legalOwner} onChange={(e) => setLegalOwner(e.target.value)} />
      </FormField>
      <FormField label="Reason" htmlFor="own-reason">
        <Input id="own-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      </FormField>
      <Button
        size="sm"
        onClick={() => change.mutate({ legalOwner, reason: reason || undefined }, { onSuccess: () => { setLegalOwner(''); setReason(''); } })}
        disabled={!legalOwner || change.isPending}
      >
        {change.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Change ownership
      </Button>
    </div>
  );
}

function LinksTab({ brandId }: { brandId: string }) {
  const { data: links, isLoading } = useMultiBrandLinks(brandId);
  const link = useLinkBrandEntity(brandId);
  const unlink = useUnlinkBrandEntity(brandId);
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <FormField label="Entity type" htmlFor="link-type">
          <Input id="link-type" value={entityType} onChange={(e) => setEntityType(e.target.value)} className="h-9 w-40" />
        </FormField>
        <FormField label="Entity ID" htmlFor="link-id">
          <Input id="link-id" value={entityId} onChange={(e) => setEntityId(e.target.value)} className="h-9 w-56" />
        </FormField>
        <Button
          size="sm"
          onClick={() => link.mutate({ entityType, entityId }, { onSuccess: () => { setEntityType(''); setEntityId(''); } })}
          disabled={!entityType || !entityId || link.isPending}
        >
          Link
        </Button>
      </div>
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !links || links.length === 0 ? (
        <EmptyState title="No linked entities" className="border-none py-8" />
      ) : (
        <ul className="space-y-2">
          {links.map((l) => (
            <li key={l.id} className="flex items-center justify-between rounded-[var(--radius)] border border-border p-2 text-sm">
              <span className="text-foreground">
                {l.entityType} · {l.entityId} {l.isPrimary ? '(primary)' : ''} {l.isShared ? '(shared)' : ''}
              </span>
              <Button size="sm" variant="ghost" onClick={() => unlink.mutate({ entityType: l.entityType, entityId: l.entityId })} disabled={unlink.isPending}>
                Unlink
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HistoryTab({ id }: { id: string }) {
  const { data, isLoading } = useMultiBrandHistory(id);

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
