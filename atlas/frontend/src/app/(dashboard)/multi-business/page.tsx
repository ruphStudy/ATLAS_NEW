'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Plus } from 'lucide-react';
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
  useActivateMultiBusiness,
  useArchiveMultiBusiness,
  useChangeBusinessOwnership,
  useCreateMultiBusiness,
  useLinkBusinessEntity,
  useMultiBusiness,
  useMultiBusinessChildren,
  useMultiBusinessHistory,
  useMultiBusinesses,
  useMultiBusinessLinks,
  useRestoreMultiBusiness,
  useSetDefaultMultiBusiness,
  useSetParentBusiness,
  useSuspendMultiBusiness,
  useUnlinkBusinessEntity,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import type { CreateMultiBusinessPayload, MultiBusiness, MultiBusinessStatus } from '@/types';

const STATUS_OPTIONS: { value: MultiBusinessStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'ARCHIVED', label: 'Archived' },
];

function useWorkspaceId() {
  return useAuthStore((s) => s.user?.workspaceId);
}

export default function BusinessesPage() {
  return (
    <div>
      <PageHeader title="Businesses & Enterprise Structure" description="Legal entities, hierarchy, tax identifiers, ownership and the organization → business → brand structure tree." />
      <Tabs defaultValue="businesses">
        <TabsList>
          <TabsTrigger value="businesses">Businesses</TabsTrigger>
          <TabsTrigger value="structure">Enterprise Structure</TabsTrigger>
        </TabsList>
        <TabsContent value="businesses">
          <BusinessesTab />
        </TabsContent>
        <TabsContent value="structure">
          <StructureTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BusinessesTab() {
  const [status, setStatus] = useState<MultiBusinessStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useMultiBusinesses({ status: status || undefined, search: search || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!status || !!search} onClearFilters={() => { setStatus(''); setSearch(''); setPage(1); }} searchValue={search} onSearchChange={(v) => { setSearch(v); setPage(1); }}>
          <Select value={status} onChange={(e) => { setStatus(e.target.value as MultiBusinessStatus | ''); setPage(1); }} placeholder="All statuses" options={STATUS_OPTIONS} className="h-9 w-36" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create business
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No businesses found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Legal name</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((b) => (
                <TableRow key={b.id} clickable onClick={() => setSelectedId(b.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{b.code}</TableCell>
                  <TableCell className="text-sm text-foreground">{b.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.legalName ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.countryCode ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.currencyCode ?? '—'}</TableCell>
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

      <CreateBusinessDialog open={createOpen} onOpenChange={setCreateOpen} />
      <BusinessDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreateBusinessDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const workspaceId = useWorkspaceId();
  const create = useCreateMultiBusiness();
  const [form, setForm] = useState<Omit<CreateMultiBusinessPayload, 'workspaceId'>>({ code: '', name: '' });
  const reset = () => setForm({ code: '', name: '' });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Create business</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Code" htmlFor="bu-code" required>
            <Input id="bu-code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          </FormField>
          <FormField label="Name" htmlFor="bu-name" required>
            <Input id="bu-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Legal name" htmlFor="bu-legal">
            <Input id="bu-legal" value={form.legalName ?? ''} onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))} />
          </FormField>
          <FormField label="Business type" htmlFor="bu-type">
            <Input id="bu-type" value={form.businessType ?? ''} onChange={(e) => setForm((f) => ({ ...f, businessType: e.target.value }))} />
          </FormField>
          <FormField label="Registration number" htmlFor="bu-reg">
            <Input id="bu-reg" value={form.registrationNumber ?? ''} onChange={(e) => setForm((f) => ({ ...f, registrationNumber: e.target.value }))} />
          </FormField>
          <FormField label="Tax identifier" htmlFor="bu-tax">
            <Input id="bu-tax" value={form.taxIdentifier ?? ''} onChange={(e) => setForm((f) => ({ ...f, taxIdentifier: e.target.value }))} />
          </FormField>
          <FormField label="Country code" htmlFor="bu-country">
            <Input id="bu-country" value={form.countryCode ?? ''} onChange={(e) => setForm((f) => ({ ...f, countryCode: e.target.value.toUpperCase() }))} />
          </FormField>
          <FormField label="Currency code" htmlFor="bu-currency">
            <Input id="bu-currency" value={form.currencyCode ?? ''} onChange={(e) => setForm((f) => ({ ...f, currencyCode: e.target.value.toUpperCase() }))} />
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

function BusinessDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: business, isLoading } = useMultiBusiness(id ?? undefined);
  const activate = useActivateMultiBusiness(id ?? '');
  const restore = useRestoreMultiBusiness(id ?? '');
  const setDefault = useSetDefaultMultiBusiness(id ?? '');
  const suspend = useSuspendMultiBusiness(id ?? '');
  const archive = useArchiveMultiBusiness(id ?? '');
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const actions: ActionMenuItem[] = [];
  if (business) {
    if (business.status !== 'ACTIVE') actions.push({ label: 'Activate', onSelect: () => activate.mutate(undefined) });
    if (business.status === 'ACTIVE') {
      actions.push({ label: 'Suspend', onSelect: () => setSuspendOpen(true) });
      if (!business.isDefault) actions.push({ label: 'Set as default', onSelect: () => setDefault.mutate() });
    }
    if (business.status !== 'ARCHIVED') actions.push({ label: 'Archive', onSelect: () => setArchiveOpen(true), destructive: true, separatorBefore: true });
    if (business.status === 'ARCHIVED') actions.push({ label: 'Restore', onSelect: () => restore.mutate(undefined) });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{business?.name ?? 'Business'}</span>
            {business && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !business ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
              <TabsTrigger value="ownership">Ownership</TabsTrigger>
              <TabsTrigger value="links">Entity Links</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <Field label="Code" value={business.code} />
                <Field label="Legal name" value={business.legalName ?? '—'} />
                <Field label="Business type" value={business.businessType ?? '—'} />
                <Field label="Registration #" value={business.registrationNumber ?? '—'} />
                <Field label="Tax identifier" value={business.taxIdentifier ?? '—'} />
                <Field label="Country" value={business.countryCode ?? '—'} />
                <Field label="Currency" value={business.currencyCode ?? '—'} />
                <Field label="Timezone" value={business.timezone ?? '—'} />
                <Field label="Status" value={business.status} />
                <Field label="Default" value={business.isDefault ? 'Yes' : 'No'} />
                <Field label="Visibility" value={business.visibilityScope} />
                <Field label="Version" value={String(business.version)} />
              </div>
              {business.contacts.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contacts</p>
                  <ul className="space-y-1 text-sm text-foreground">
                    {business.contacts.map((c, i) => (
                      <li key={i}>
                        {c.name} {c.role ? `(${c.role})` : ''} {c.email ? `· ${c.email}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {business.brandIds.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Brands</p>
                  <p className="text-sm text-foreground">{business.brandIds.join(', ')}</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="hierarchy">
              <HierarchyTab business={business} />
            </TabsContent>
            <TabsContent value="ownership">
              <OwnershipTab id={business.id} />
            </TabsContent>
            <TabsContent value="links">
              <LinksTab businessId={business.id} />
            </TabsContent>
            <TabsContent value="history">
              <HistoryTab id={business.id} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
      <ReasonDialog open={suspendOpen} onOpenChange={setSuspendOpen} title="Suspend this business" confirmLabel="Suspend" variant="danger" pending={suspend.isPending} onSubmit={(reason) => suspend.mutate(reason, { onSuccess: () => setSuspendOpen(false) })} />
      <ReasonDialog open={archiveOpen} onOpenChange={setArchiveOpen} title="Archive this business" confirmLabel="Archive" variant="danger" pending={archive.isPending} onSubmit={(reason) => archive.mutate(reason, { onSuccess: () => setArchiveOpen(false) })} />
    </Dialog>
  );
}

function HierarchyTab({ business }: { business: MultiBusiness }) {
  const setParent = useSetParentBusiness(business.id);
  const { data: children } = useMultiBusinessChildren(business.id);
  const [parentId, setParentId] = useState('');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <Field label="Parent business" value={business.parentBusinessId ?? 'None (top-level)'} />
      </div>
      <div className="flex items-end gap-2">
        <FormField label="Set parent business ID" htmlFor="parent-id">
          <Input id="parent-id" value={parentId} onChange={(e) => setParentId(e.target.value)} className="h-9 w-72" />
        </FormField>
        <Button size="sm" onClick={() => setParent.mutate({ parentBusinessId: parentId || undefined }, { onSuccess: () => setParentId('') })} disabled={setParent.isPending}>
          Set parent
        </Button>
        {business.parentBusinessId && (
          <Button size="sm" variant="outline" onClick={() => setParent.mutate({ parentBusinessId: undefined })} disabled={setParent.isPending}>
            Detach
          </Button>
        )}
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Direct children</p>
        {!children || children.length === 0 ? (
          <p className="text-sm text-muted-foreground">No child businesses.</p>
        ) : (
          <ul className="space-y-1 text-sm text-foreground">
            {children.map((c) => (
              <li key={c.id}>
                {c.name} ({c.code}) · <StatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function OwnershipTab({ id }: { id: string }) {
  const change = useChangeBusinessOwnership(id);
  const [legalName, setLegalName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [taxIdentifier, setTaxIdentifier] = useState('');

  return (
    <div className="max-w-md space-y-4">
      <FormField label="Legal name" htmlFor="own-legal">
        <Input id="own-legal" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
      </FormField>
      <FormField label="Registration number" htmlFor="own-reg">
        <Input id="own-reg" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
      </FormField>
      <FormField label="Tax identifier" htmlFor="own-tax">
        <Input id="own-tax" value={taxIdentifier} onChange={(e) => setTaxIdentifier(e.target.value)} />
      </FormField>
      <Button
        size="sm"
        onClick={() =>
          change.mutate(
            { legalName: legalName || undefined, registrationNumber: registrationNumber || undefined, taxIdentifier: taxIdentifier || undefined },
            { onSuccess: () => { setLegalName(''); setRegistrationNumber(''); setTaxIdentifier(''); } },
          )
        }
        disabled={(!legalName && !registrationNumber && !taxIdentifier) || change.isPending}
      >
        {change.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Update ownership
      </Button>
    </div>
  );
}

function LinksTab({ businessId }: { businessId: string }) {
  const { data: links, isLoading } = useMultiBusinessLinks(businessId);
  const link = useLinkBusinessEntity(businessId);
  const unlink = useUnlinkBusinessEntity(businessId);
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <FormField label="Entity type" htmlFor="blink-type">
          <Input id="blink-type" value={entityType} onChange={(e) => setEntityType(e.target.value)} className="h-9 w-40" />
        </FormField>
        <FormField label="Entity ID" htmlFor="blink-id">
          <Input id="blink-id" value={entityId} onChange={(e) => setEntityId(e.target.value)} className="h-9 w-56" />
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
  const { data, isLoading } = useMultiBusinessHistory(id);

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

function StructureTab() {
  const { data, isLoading } = useMultiBusinesses({ limit: 100 });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data || data.items.length === 0) return <EmptyState title="No businesses to display" description="Create a business to see the enterprise structure tree." />;

  const roots = data.items.filter((b) => !b.parentBusinessId);
  const byParent = new Map<string, MultiBusiness[]>();
  for (const b of data.items) {
    if (b.parentBusinessId) {
      const list = byParent.get(b.parentBusinessId) ?? [];
      list.push(b);
      byParent.set(b.parentBusinessId, list);
    }
  }

  return (
    <div className="rounded-[var(--radius)] border border-border p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Organization → Business → Brand / Workspace</p>
      {roots.length === 0 ? (
        <p className="text-sm text-muted-foreground">No top-level businesses found.</p>
      ) : (
        <ul>
          {roots.map((b) => (
            <TreeNode key={b.id} business={b} byParent={byParent} depth={0} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TreeNode({ business, byParent, depth }: { business: MultiBusiness; byParent: Map<string, MultiBusiness[]>; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const children = byParent.get(business.id) ?? [];

  return (
    <li className="text-sm">
      <div className="flex items-center gap-1 py-1" style={{ paddingLeft: depth * 20 }}>
        {children.length > 0 ? (
          <button onClick={() => setExpanded((e) => !e)} className="text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-3.5" />
        )}
        <span className="font-medium text-foreground">{business.name}</span>
        <span className="text-xs text-muted-foreground">({business.code})</span>
        <StatusBadge status={business.status} />
        {business.countryCode && <span className="text-xs text-muted-foreground">{business.countryCode}</span>}
        {business.brandIds.length > 0 && <span className="text-xs text-muted-foreground">· {business.brandIds.length} brand(s)</span>}
        {business.workspaceIds.length > 0 && <span className="text-xs text-muted-foreground">· {business.workspaceIds.length} workspace(s)</span>}
      </div>
      {expanded && children.length > 0 && (
        <ul>
          {children.map((c) => (
            <TreeNode key={c.id} business={c} byParent={byParent} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
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
