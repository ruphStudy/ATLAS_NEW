'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Copy, Loader2, Plus } from 'lucide-react';
import { QUERY_KEYS } from '@/constants';
import * as rpService from '@/services/roles-permissions.service';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/action-menu';
import { ReasonDialog } from '@/components/suppliers/reason-dialog';
import {
  useArchiveRole,
  useAssignRole,
  useCreatePermission,
  useCreateRole,
  useEffectivePermissions,
  useGrantRolePermission,
  usePermissionCatalog,
  usePermissionChecks,
  useRevokeRoleAssignment,
  useRevokeRolePermission,
  useRole,
  useRoleAssignment,
  useRoleAssignmentHistory,
  useRoleAssignments,
  useRolePermissionHistory,
  useRolePermissions,
  useRoles,
  useToast,
  useUpdateRole,
  useUsers,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type {
  AccessRole,
  AssignmentStatus,
  AssignRolePayload,
  AssignmentScopeType,
  CreateAccessPermissionPayload,
  CreateAccessRolePayload,
  PermissionAction,
  PermissionEffect,
  PermissionScope,
  PrincipalType,
  RoleStatus,
  RoleType,
} from '@/types';

const ROLE_TYPE_OPTIONS: { value: RoleType; label: string }[] = [
  { value: 'SYSTEM', label: 'System' },
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'WORKSPACE', label: 'Workspace' },
  { value: 'CUSTOM', label: 'Custom' },
];

const ROLE_STATUS_OPTIONS: { value: RoleStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const PERMISSION_ACTION_OPTIONS: { value: PermissionAction; label: string }[] = [
  { value: 'VIEW', label: 'View' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'APPROVE', label: 'Approve' },
  { value: 'PUBLISH', label: 'Publish' },
  { value: 'EXPORT', label: 'Export' },
  { value: 'MANAGE', label: 'Manage' },
  { value: 'ADMIN', label: 'Admin' },
];

const PERMISSION_SCOPE_OPTIONS: { value: PermissionScope; label: string }[] = [
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'WORKSPACE', label: 'Workspace' },
  { value: 'MARKETPLACE', label: 'Marketplace' },
  { value: 'WAREHOUSE', label: 'Warehouse' },
  { value: 'ENTITY', label: 'Entity' },
];

const PRINCIPAL_TYPE_OPTIONS: { value: PrincipalType; label: string }[] = [
  { value: 'USER', label: 'User' },
  { value: 'TEAM', label: 'Team' },
  { value: 'SERVICE_ACCOUNT', label: 'Service account' },
];

const ASSIGNMENT_SCOPE_OPTIONS: { value: AssignmentScopeType; label: string }[] = [
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'WORKSPACE', label: 'Workspace' },
  { value: 'MARKETPLACE', label: 'Marketplace' },
  { value: 'WAREHOUSE', label: 'Warehouse' },
  { value: 'ENTITY', label: 'Entity' },
];

const ASSIGNMENT_STATUS_OPTIONS: { value: AssignmentStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'REVOKED', label: 'Revoked' },
];

const EFFECT_TONE: Record<PermissionEffect, StatusTone> = { ALLOW: 'success', DENY: 'danger' };

export default function RolesPermissionsPage() {
  return (
    <div>
      <PageHeader title="Roles & Permissions" description="Role definitions, permission catalog, assignments and effective-access visibility." />
      <Tabs defaultValue="my-access">
        <TabsList>
          <TabsTrigger value="my-access">My Access</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="catalog">Permission Catalog</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="compare">Compare Roles</TabsTrigger>
        </TabsList>
        <TabsContent value="my-access">
          <MyAccessTab />
        </TabsContent>
        <TabsContent value="roles">
          <RolesTab />
        </TabsContent>
        <TabsContent value="catalog">
          <CatalogTab />
        </TabsContent>
        <TabsContent value="assignments">
          <AssignmentsTab />
        </TabsContent>
        <TabsContent value="compare">
          <CompareTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function useRoleNameMap() {
  const { data } = useRoles({ limit: 200 });
  return useMemo(() => {
    const map = new Map<string, string>();
    for (const r of data?.data ?? []) map.set(r.id, r.name);
    return map;
  }, [data]);
}

function MyAccessTab() {
  const { data, isLoading } = useEffectivePermissions();
  const roleNames = useRoleNameMap();

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data || data.permissions.length === 0) return <EmptyState title="No effective permissions found" description="You have no resolved permissions in this workspace." />;

  const grouped = new Map<string, typeof data.permissions>();
  for (const p of data.permissions) {
    const module = p.key.split('.')[0] ?? 'other';
    if (!grouped.has(module)) grouped.set(module, []);
    grouped.get(module)!.push(p);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Your resolved permissions for the current workspace, grouped by module. Each entry shows the closest role in your assignment chain that decided it.</p>
      {[...grouped.entries()].map(([module, perms]) => (
        <Card key={module}>
          <CardHeader>
            <CardTitle className="text-sm capitalize">{module}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {perms.map((p) => (
                <div key={p.key} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{p.key}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{roleNames.get(p.sourceRoleId) ?? p.sourceRoleId}</span>
                    <StatusBadge status={p.effect} tone={EFFECT_TONE[p.effect]} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RolesTab() {
  const [type, setType] = useState<RoleType | ''>('');
  const [status, setStatus] = useState<RoleStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [cloneFrom, setCloneFrom] = useState<AccessRole | null>(null);
  const { data, isLoading } = useRoles({ type: type || undefined, status: status || undefined, search: search || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar
          hasActiveFilters={!!type || !!status || !!search}
          onClearFilters={() => { setType(''); setStatus(''); setSearch(''); setPage(1); }}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
        >
          <Select value={type} onChange={(e) => { setType(e.target.value as RoleType | ''); setPage(1); }} placeholder="All types" options={ROLE_TYPE_OPTIONS} className="h-9 w-40" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as RoleStatus | ''); setPage(1); }} placeholder="All statuses" options={ROLE_STATUS_OPTIONS} className="h-9 w-36" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create role
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No roles found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>System</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((r) => (
                <TableRow key={r.id} clickable onClick={() => setSelectedId(r.id)}>
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.key}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.isSystem ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => setCloneFrom(r)}>
                      <Copy className="h-3.5 w-3.5" />
                      Clone
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <CreateRoleDialog open={createOpen} onOpenChange={setCreateOpen} cloneFrom={null} />
      <CreateRoleDialog open={!!cloneFrom} onOpenChange={(o) => !o && setCloneFrom(null)} cloneFrom={cloneFrom} />
      <RoleDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CreateRoleDialog({ open, onOpenChange, cloneFrom }: { open: boolean; onOpenChange: (o: boolean) => void; cloneFrom: AccessRole | null }) {
  const create = useCreateRole();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: sourcePermissions } = useRolePermissions(cloneFrom?.id);
  const [form, setForm] = useState<CreateAccessRolePayload>({ key: '', name: '', type: 'CUSTOM' });
  const [cloning, setCloning] = useState(false);

  const effectiveForm: CreateAccessRolePayload = cloneFrom
    ? { key: form.key || `${cloneFrom.key}-copy`, name: form.name || `${cloneFrom.name} (copy)`, type: cloneFrom.type === 'SYSTEM' ? 'CUSTOM' : cloneFrom.type, description: form.description || cloneFrom.description || undefined }
    : form;

  const reset = () => setForm({ key: '', name: '', type: 'CUSTOM' });

  const handleCreate = async () => {
    const created = await create.mutateAsync(effectiveForm);
    if (cloneFrom && sourcePermissions && sourcePermissions.length > 0) {
      setCloning(true);
      try {
        for (const p of sourcePermissions) {
          // eslint-disable-next-line no-await-in-loop
          await rpService.grantRolePermission(created.id, { permissionKey: p.permissionKey, effect: p.effect });
        }
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCESS_ROLE_PERMISSIONS, created.id] });
      } catch {
        toast.error('Role cloned, but not all permissions could be copied', 'Review the new role’s permissions and grant any missing ones manually.');
      } finally {
        setCloning(false);
      }
    }
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{cloneFrom ? `Clone "${cloneFrom.name}"` : 'Create role'}</DialogTitle>
        </DialogHeader>
        {cloneFrom && (
          <p className="mb-2 text-xs text-muted-foreground">
            Creates a new role and copies {sourcePermissions?.length ?? 0} of this role&apos;s own permission grant{sourcePermissions?.length === 1 ? '' : 's'}. Inherited permissions from its parent are not copied (the new role has no parent).
          </p>
        )}
        <div className="space-y-4">
          <FormField label="Key" htmlFor="role-key" required>
            <Input id="role-key" value={effectiveForm.key} onChange={(e) => setForm((f) => ({ ...effectiveForm, ...f, key: e.target.value }))} placeholder="regional-manager" />
          </FormField>
          <FormField label="Name" htmlFor="role-name" required>
            <Input id="role-name" value={effectiveForm.name} onChange={(e) => setForm((f) => ({ ...effectiveForm, ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Description" htmlFor="role-desc">
            <Textarea id="role-desc" rows={2} value={effectiveForm.description ?? ''} onChange={(e) => setForm((f) => ({ ...effectiveForm, ...f, description: e.target.value }))} />
          </FormField>
          {!cloneFrom && (
            <FormField label="Type" htmlFor="role-type" required>
              <Select id="role-type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as RoleType }))} options={ROLE_TYPE_OPTIONS.filter((o) => o.value !== 'SYSTEM')} />
            </FormField>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!effectiveForm.key || !effectiveForm.name || create.isPending || cloning}>
            {(create.isPending || cloning) && <Loader2 className="h-4 w-4 animate-spin" />}
            {cloneFrom ? 'Clone role' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoleDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: role, isLoading } = useRole(id ?? undefined);
  const archive = useArchiveRole(id ?? '');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const roleNames = useRoleNameMap();

  const actions: ActionMenuItem[] = [];
  if (role && role.status === 'ACTIVE' && !role.isSystem) {
    actions.push({ label: 'Archive', onSelect: () => setArchiveOpen(true), destructive: true });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{role?.name ?? 'Role'}</span>
            {role && actions.length > 0 && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !role ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <Field label="Key" value={role.key} />
                <Field label="Type" value={role.type} />
                <Field label="System role" value={role.isSystem ? 'Yes' : 'No'} />
                <Field label="Status" value={role.status} />
                <Field label="Parent role" value={role.parentRoleId ? (roleNames.get(role.parentRoleId) ?? role.parentRoleId) : 'None'} />
                <Field label="Organization" value={role.organizationId ?? '—'} />
              </div>
              {role.description && <p className="mt-4 text-sm text-muted-foreground">{role.description}</p>}
              {!role.isSystem && <EditRolePanel role={role} />}
            </TabsContent>
            <TabsContent value="permissions">
              <RolePermissionsPanel role={role} />
            </TabsContent>
            <TabsContent value="history">
              <RoleHistoryPanel roleId={role.id} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
      <ReasonDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive this role"
        label="Reason (optional context, not stored)"
        confirmLabel="Archive"
        variant="danger"
        pending={archive.isPending}
        onSubmit={() => archive.mutate(undefined, { onSuccess: () => setArchiveOpen(false) })}
      />
    </Dialog>
  );
}

function EditRolePanel({ role }: { role: AccessRole }) {
  const update = useUpdateRole(role.id);
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? '');

  const dirty = name !== role.name || description !== (role.description ?? '');

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Edit</p>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Name" htmlFor="edit-role-name">
          <Input id="edit-role-name" value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label="Description" htmlFor="edit-role-desc">
          <Input id="edit-role-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
      </div>
      <Button size="sm" onClick={() => update.mutate({ name, description })} disabled={!dirty || !name || update.isPending}>
        {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save changes
      </Button>
    </div>
  );
}

function RolePermissionsPanel({ role }: { role: AccessRole }) {
  const { data: ownGrants, isLoading } = useRolePermissions(role.id);
  const { data: parentGrants } = useRolePermissions(role.parentRoleId ?? undefined);
  const grant = useGrantRolePermission(role.id);
  const revoke = useRevokeRolePermission(role.id);
  const { data: catalog } = usePermissionCatalog({ limit: 200 });
  const { hasPermission } = usePermissionChecks();
  const [permissionKey, setPermissionKey] = useState('');
  const [effect, setEffect] = useState<PermissionEffect>('ALLOW');

  const ownKeys = new Set((ownGrants ?? []).map((g) => g.permissionKey));
  const inheritedOnly = (parentGrants ?? []).filter((g) => !ownKeys.has(g.permissionKey));

  const grantableOptions = (catalog?.data ?? [])
    .filter((p) => hasPermission(p.key))
    .map((p) => ({ value: p.key, label: `${p.key} (${p.action})` }));

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      {!role.isSystem && (
        <div className="rounded-[var(--radius)] border border-border p-3">
          <p className="mb-2 text-sm font-medium text-foreground">Grant a permission</p>
          <div className="flex flex-wrap items-end gap-2">
            <FormField label="Permission" htmlFor="grant-key">
              <Select id="grant-key" value={permissionKey} onChange={(e) => setPermissionKey(e.target.value)} placeholder="Select a permission" options={grantableOptions} className="h-9 w-72" />
            </FormField>
            <FormField label="Effect" htmlFor="grant-effect">
              <Select id="grant-effect" value={effect} onChange={(e) => setEffect(e.target.value as PermissionEffect)} options={[{ value: 'ALLOW', label: 'Allow' }, { value: 'DENY', label: 'Deny' }]} className="h-9 w-32" />
            </FormField>
            <Button
              size="sm"
              onClick={() => grant.mutate({ permissionKey, effect }, { onSuccess: () => setPermissionKey('') })}
              disabled={!permissionKey || grant.isPending}
            >
              {grant.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Grant
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Only permissions within your own effective authority are selectable here — the server independently re-validates this.</p>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Own grants</p>
        {!ownGrants || ownGrants.length === 0 ? (
          <p className="text-sm text-muted-foreground">No permissions granted directly on this role.</p>
        ) : (
          <div className="space-y-1.5">
            {ownGrants.map((g) => (
              <div key={g.permissionKey} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{g.permissionKey}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={g.effect} tone={EFFECT_TONE[g.effect]} />
                  {!role.isSystem && (
                    <Button variant="ghost" size="sm" onClick={() => revoke.mutate(g.permissionKey)} disabled={revoke.isPending}>
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {role.parentRoleId && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inherited from parent (not overridden here)</p>
          {inheritedOnly.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing inherited, or every parent grant is already overridden by this role.</p>
          ) : (
            <div className="space-y-1.5">
              {inheritedOnly.map((g) => (
                <div key={g.permissionKey} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{g.permissionKey}</span>
                  <StatusBadge status={g.effect} tone={EFFECT_TONE[g.effect]} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RoleHistoryPanel({ roleId }: { roleId: string }) {
  const { data, isLoading } = useRolePermissionHistory(roleId);

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data || data.length === 0) return <EmptyState title="No permission history yet" className="border-none py-8" />;

  return (
    <ul className="space-y-2">
      {data.map((h) => (
        <li key={h.id} className="rounded-[var(--radius)] border border-border p-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">
              {h.permissionKey} · {h.action}
            </span>
            <span className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
          </div>
          {h.changedBy && <p className="mt-1 text-xs text-muted-foreground">by {h.changedBy}</p>}
        </li>
      ))}
    </ul>
  );
}

function CatalogTab() {
  const [module, setModule] = useState('');
  const [action, setAction] = useState<PermissionAction | ''>('');
  const [scope, setScope] = useState<PermissionScope | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = usePermissionCatalog({ module: module || undefined, action: action || undefined, scope: scope || undefined, search: search || undefined, page, limit: 20 });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar
          hasActiveFilters={!!module || !!action || !!scope || !!search}
          onClearFilters={() => { setModule(''); setAction(''); setScope(''); setSearch(''); setPage(1); }}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
        >
          <Input value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }} placeholder="Module" className="h-9 w-36" />
          <Select value={action} onChange={(e) => { setAction(e.target.value as PermissionAction | ''); setPage(1); }} placeholder="All actions" options={PERMISSION_ACTION_OPTIONS} className="h-9 w-36" />
          <Select value={scope} onChange={(e) => { setScope(e.target.value as PermissionScope | ''); setPage(1); }} placeholder="All scopes" options={PERMISSION_SCOPE_OPTIONS} className="h-9 w-36" />
        </FilterBar>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create permission
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No permissions found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Scope</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm font-medium text-foreground">{p.key}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.module}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.resource}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.action} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.scope}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <CreatePermissionDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CreatePermissionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreatePermission();
  const [form, setForm] = useState<CreateAccessPermissionPayload>({ key: '', module: '', resource: '', action: 'VIEW', scope: 'WORKSPACE' });
  const reset = () => setForm({ key: '', module: '', resource: '', action: 'VIEW', scope: 'WORKSPACE' });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Create permission</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <FormField label="Key" htmlFor="perm-key" required>
              <Input id="perm-key" value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} placeholder="inventory.item.approve" />
            </FormField>
          </div>
          <FormField label="Module" htmlFor="perm-module" required>
            <Input id="perm-module" value={form.module} onChange={(e) => setForm((f) => ({ ...f, module: e.target.value }))} />
          </FormField>
          <FormField label="Resource" htmlFor="perm-resource" required>
            <Input id="perm-resource" value={form.resource} onChange={(e) => setForm((f) => ({ ...f, resource: e.target.value }))} />
          </FormField>
          <FormField label="Action" htmlFor="perm-action" required>
            <Select id="perm-action" value={form.action} onChange={(e) => setForm((f) => ({ ...f, action: e.target.value as PermissionAction }))} options={PERMISSION_ACTION_OPTIONS} />
          </FormField>
          <FormField label="Scope" htmlFor="perm-scope" required>
            <Select id="perm-scope" value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as PermissionScope }))} options={PERMISSION_SCOPE_OPTIONS} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.key || !form.module || !form.resource || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignmentsTab() {
  const [principalType, setPrincipalType] = useState<PrincipalType | ''>('');
  const [status, setStatus] = useState<AssignmentStatus | ''>('');
  const [scopeType, setScopeType] = useState<AssignmentScopeType | ''>('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const { data, isLoading } = useRoleAssignments({ principalType: principalType || undefined, status: status || undefined, scopeType: scopeType || undefined, page, limit: 20 });
  const roleNames = useRoleNameMap();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <FilterBar hasActiveFilters={!!principalType || !!status || !!scopeType} onClearFilters={() => { setPrincipalType(''); setStatus(''); setScopeType(''); setPage(1); }}>
          <Select value={principalType} onChange={(e) => { setPrincipalType(e.target.value as PrincipalType | ''); setPage(1); }} placeholder="All principal types" options={PRINCIPAL_TYPE_OPTIONS} className="h-9 w-44" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value as AssignmentStatus | ''); setPage(1); }} placeholder="All statuses" options={ASSIGNMENT_STATUS_OPTIONS} className="h-9 w-36" />
          <Select value={scopeType} onChange={(e) => { setScopeType(e.target.value as AssignmentScopeType | ''); setPage(1); }} placeholder="All scope types" options={ASSIGNMENT_SCOPE_OPTIONS} className="h-9 w-40" />
        </FilterBar>
        <Button onClick={() => setAssignOpen(true)}>
          <Plus className="h-4 w-4" />
          Assign role
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No role assignments found" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Effective window</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((a) => (
                <TableRow key={a.id} clickable onClick={() => setSelectedId(a.id)}>
                  <TableCell className="text-sm font-medium text-foreground">{roleNames.get(a.roleId) ?? a.roleId}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.principalType} · {a.principalId}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.scopeType}{a.scopeId ? ` · ${a.scopeId}` : ''}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.effectiveFrom ? formatDate(a.effectiveFrom) : 'Immediate'} → {a.effectiveTo ? formatDate(a.effectiveTo) : 'No expiry'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={a.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > 0 && <Pagination page={page} limit={20} total={data.total} totalPages={data.totalPages} onPageChange={setPage} onLimitChange={() => {}} />}
        </>
      )}

      <AssignRoleDialog open={assignOpen} onOpenChange={setAssignOpen} />
      <AssignmentDetailDialog id={selectedId} onClose={() => setSelectedId(null)} roleNames={roleNames} />
    </div>
  );
}

function AssignRoleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const assign = useAssignRole();
  const { data: roles } = useRoles({ status: 'ACTIVE', limit: 200 });
  const { data: users } = useUsers({ limit: 100 });
  const [form, setForm] = useState<AssignRolePayload>({ roleId: '', principalType: 'USER', principalId: '' });
  const reset = () => setForm({ roleId: '', principalType: 'USER', principalId: '' });

  const roleOptions = (roles?.data ?? []).map((r) => ({ value: r.id, label: r.name }));
  const userOptions = (users?.items ?? []).map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }));

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Assign role</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Role" htmlFor="assign-role" required>
            <Select id="assign-role" value={form.roleId} onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))} placeholder="Select a role" options={roleOptions} />
          </FormField>
          <FormField label="Principal type" htmlFor="assign-ptype" required>
            <Select id="assign-ptype" value={form.principalType} onChange={(e) => setForm((f) => ({ ...f, principalType: e.target.value as PrincipalType, principalId: '' }))} options={PRINCIPAL_TYPE_OPTIONS} />
          </FormField>
          <div className="col-span-2">
            <FormField label="Principal" htmlFor="assign-principal" required>
              {form.principalType === 'USER' ? (
                <Select id="assign-principal" value={form.principalId} onChange={(e) => setForm((f) => ({ ...f, principalId: e.target.value }))} placeholder="Select a user" options={userOptions} />
              ) : (
                <Input id="assign-principal" value={form.principalId} onChange={(e) => setForm((f) => ({ ...f, principalId: e.target.value }))} placeholder={`${form.principalType} ID`} />
              )}
            </FormField>
          </div>
          <FormField label="Scope type" htmlFor="assign-scope-type">
            <Select id="assign-scope-type" value={form.scopeType ?? ''} onChange={(e) => setForm((f) => ({ ...f, scopeType: (e.target.value || undefined) as AssignmentScopeType | undefined }))} placeholder="Workspace (default)" options={ASSIGNMENT_SCOPE_OPTIONS} />
          </FormField>
          <FormField label="Scope ID" htmlFor="assign-scope-id">
            <Input id="assign-scope-id" value={form.scopeId ?? ''} onChange={(e) => setForm((f) => ({ ...f, scopeId: e.target.value || undefined }))} />
          </FormField>
          <FormField label="Effective from" htmlFor="assign-from">
            <Input id="assign-from" type="date" value={form.effectiveFrom ?? ''} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value || undefined }))} />
          </FormField>
          <FormField label="Effective to (temporary if set)" htmlFor="assign-to">
            <Input id="assign-to" type="date" value={form.effectiveTo ?? ''} onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value || undefined }))} />
          </FormField>
          <div className="col-span-2">
            <FormField label="Reason" htmlFor="assign-reason">
              <Textarea id="assign-reason" rows={2} value={form.reason ?? ''} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value || undefined }))} />
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => assign.mutate(form, { onSuccess: () => { onOpenChange(false); reset(); } })}
            disabled={!form.roleId || !form.principalId || assign.isPending}
          >
            {assign.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignmentDetailDialog({ id, onClose, roleNames }: { id: string | null; onClose: () => void; roleNames: Map<string, string> }) {
  const { data: assignment, isLoading } = useRoleAssignment(id ?? undefined);
  const { data: history } = useRoleAssignmentHistory(id ?? undefined);
  const revoke = useRevokeRoleAssignment(id ?? '');
  const [revokeOpen, setRevokeOpen] = useState(false);

  const actions: ActionMenuItem[] = [];
  if (assignment && assignment.status === 'ACTIVE') {
    actions.push({ label: 'Revoke', onSelect: () => setRevokeOpen(true), destructive: true });
  }

  return (
    <Dialog open={!!id} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{assignment ? roleNames.get(assignment.roleId) ?? assignment.roleId : 'Assignment'}</span>
            {assignment && <ActionMenu items={actions} />}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !assignment ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Field label="Principal" value={`${assignment.principalType} · ${assignment.principalId}`} />
              <Field label="Scope" value={`${assignment.scopeType}${assignment.scopeId ? ` · ${assignment.scopeId}` : ''}`} />
              <Field label="Status" value={assignment.status} />
              <Field label="Effective from" value={assignment.effectiveFrom ? formatDate(assignment.effectiveFrom) : 'Immediate'} />
              <Field label="Effective to" value={assignment.effectiveTo ? formatDate(assignment.effectiveTo) : 'No expiry'} />
              <Field label="Assigned by" value={assignment.assignedBy ?? '—'} />
              {assignment.revokedBy && <Field label="Revoked by" value={assignment.revokedBy} />}
              {assignment.revokedAt && <Field label="Revoked at" value={formatDate(assignment.revokedAt)} />}
            </div>
            {history && history.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</p>
                <ul className="space-y-2">
                  {history.map((h) => (
                    <li key={h.id} className="rounded-[var(--radius)] border border-border p-2 text-sm">
                      <span className="font-medium text-foreground">
                        {h.fromStatus ?? '—'} → {h.toStatus}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
                      {h.reason && <p className="mt-1 text-muted-foreground">{h.reason}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
      <ReasonDialog open={revokeOpen} onOpenChange={setRevokeOpen} title="Revoke this assignment" confirmLabel="Revoke" variant="danger" pending={revoke.isPending} onSubmit={(reason) => revoke.mutate({ reason }, { onSuccess: () => setRevokeOpen(false) })} />
    </Dialog>
  );
}

function CompareTab() {
  const { data: roles } = useRoles({ limit: 200 });
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');
  const { data: leftGrants } = useRolePermissions(leftId || undefined);
  const { data: rightGrants } = useRolePermissions(rightId || undefined);

  const roleOptions = (roles?.data ?? []).map((r) => ({ value: r.id, label: r.name }));
  const leftRole = roles?.data.find((r) => r.id === leftId);
  const rightRole = roles?.data.find((r) => r.id === rightId);

  const allKeys = Array.from(new Set([...(leftGrants ?? []).map((g) => g.permissionKey), ...(rightGrants ?? []).map((g) => g.permissionKey)])).sort();
  const leftMap = new Map((leftGrants ?? []).map((g) => [g.permissionKey, g.effect]));
  const rightMap = new Map((rightGrants ?? []).map((g) => [g.permissionKey, g.effect]));

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-4">
        <FormField label="Role A" htmlFor="compare-left">
          <Select id="compare-left" value={leftId} onChange={(e) => setLeftId(e.target.value)} placeholder="Select a role" options={roleOptions} />
        </FormField>
        <FormField label="Role B" htmlFor="compare-right">
          <Select id="compare-right" value={rightId} onChange={(e) => setRightId(e.target.value)} placeholder="Select a role" options={roleOptions} />
        </FormField>
      </div>

      {!leftId || !rightId ? (
        <EmptyState title="Select two roles to compare" />
      ) : allKeys.length === 0 ? (
        <EmptyState title="Neither role has any direct permission grants" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Permission</TableHead>
              <TableHead>{leftRole?.name ?? 'Role A'}</TableHead>
              <TableHead>{rightRole?.name ?? 'Role B'}</TableHead>
              <TableHead>Conflict</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allKeys.map((key) => {
              const l = leftMap.get(key);
              const r = rightMap.get(key);
              const conflict = !!l && !!r && l !== r;
              return (
                <TableRow key={key}>
                  <TableCell className="text-sm text-foreground">{key}</TableCell>
                  <TableCell>{l ? <StatusBadge status={l} tone={EFFECT_TONE[l]} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{r ? <StatusBadge status={r} tone={EFFECT_TONE[r]} /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    {conflict && (
                      <span className="flex items-center gap-1 text-xs text-warning">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Differs
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
