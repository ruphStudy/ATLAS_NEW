'use client';

import { useMemo, useState } from 'react';
import { Plus, Archive, ArchiveRestore, Trash2, Pencil, History, Tag as TagIcon, Tags as TagsIcon } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { ActionMenu } from '@/components/ui/action-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  useArchiveTag,
  useBulkAssignTags,
  useCreateTag,
  useCreateTagGroup,
  useDeleteTag,
  useRemoveTagGroup,
  useRestoreTag,
  useTagGroups,
  useTagHistory,
  useTags,
  useUpdateTag,
  useUpdateTagGroup,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import type { CreateTagPayload, Tag, TagFilterParams, TagGroup, TagManagedBy, TagScope, TagStatus } from '@/types';

const SCOPE_OPTIONS: { value: TagScope; label: string }[] = [
  { value: 'GLOBAL', label: 'Global' },
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'WORKSPACE', label: 'Workspace' },
  { value: 'MODULE', label: 'Module' },
];

const STATUS_OPTIONS: { value: TagStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const MANAGED_BY_OPTIONS: { value: TagManagedBy; label: string }[] = [
  { value: 'SYSTEM', label: 'System' },
  { value: 'USER', label: 'User' },
];

export default function TagsManagementPage() {
  return (
    <div>
      <PageHeader title="Tags" description="Tag groups, colors, assignment, filtering and bulk tagging." />
      <Tabs defaultValue="tags">
        <TabsList>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
        </TabsList>
        <TabsContent value="tags">
          <TagsTab />
        </TabsContent>
        <TabsContent value="groups">
          <GroupsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TagsTab() {
  const [scope, setScope] = useState<TagScope | ''>('');
  const [status, setStatus] = useState<TagStatus | ''>('');
  const [managedBy, setManagedBy] = useState<TagManagedBy | ''>('');
  const [groupId, setGroupId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [historyTagId, setHistoryTagId] = useState<string | null>(null);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);

  const params = useMemo<TagFilterParams>(
    () => ({
      scope: scope || undefined,
      status: status || undefined,
      managedBy: managedBy || undefined,
      groupId: groupId || undefined,
      search: search || undefined,
      sortOrder: 'asc',
      page,
      limit,
    }),
    [scope, status, managedBy, groupId, search, page, limit],
  );

  const tags = useTags(params);
  const groups = useTagGroups();
  const archiveTag = useArchiveTag();
  const restoreTag = useRestoreTag();
  const deleteTag = useDeleteTag();

  const rows = tags.data?.data ?? [];
  const hasActiveFilters = !!(scope || status || managedBy || groupId || search);

  return (
    <div>
      <div className="mb-4 flex justify-end gap-2">
        {selected.size > 0 && (
          <Button variant="outline" size="sm" onClick={() => setBulkAssignOpen(true)}>
            <TagsIcon className="h-3.5 w-3.5" />
            Bulk assign ({selected.size})
          </Button>
        )}
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New tag
        </Button>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search tags…"
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setScope('');
          setStatus('');
          setManagedBy('');
          setGroupId('');
          setSearch('');
          setPage(1);
        }}
        className="mb-4"
      >
        <Select value={scope} onChange={(e) => setScope(e.target.value as TagScope | '')} options={[{ value: '', label: 'All scopes' }, ...SCOPE_OPTIONS]} className="h-9 w-40" />
        <Select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          options={[{ value: '', label: 'All groups' }, ...(groups.data ?? []).map((g) => ({ value: g.id, label: g.name }))]}
          className="h-9 w-44"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value as TagStatus | '')} options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]} className="h-9 w-36" />
        <Select value={managedBy} onChange={(e) => setManagedBy(e.target.value as TagManagedBy | '')} options={[{ value: '', label: 'All owners' }, ...MANAGED_BY_OPTIONS]} className="h-9 w-36" />
      </FilterBar>

      {tags.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : tags.isError ? (
        <QueryErrorState refetch={tags.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState title="No tags" description="Create a tag to start organizing records." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={rows.length > 0 && rows.every((t) => selected.has(t.id))}
                    onChange={() => setSelected(rows.every((t) => selected.has(t.id)) ? new Set() : new Set(rows.map((t) => t.id)))}
                  />
                </TableHead>
                <TableHead>Tag</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TagRow
                  key={t.id}
                  tag={t}
                  selected={selected.has(t.id)}
                  onToggle={() =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(t.id)) next.delete(t.id);
                      else next.add(t.id);
                      return next;
                    })
                  }
                  groups={groups.data ?? []}
                  onArchive={() => archiveTag.mutate(t.id)}
                  onRestore={() => restoreTag.mutate(t.id)}
                  onDelete={() => deleteTag.mutate(t.id)}
                  onOpenHistory={() => setHistoryTagId(t.id)}
                />
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={tags.data?.page ?? page}
            limit={tags.data?.limit ?? limit}
            total={tags.data?.total ?? 0}
            totalPages={tags.data?.totalPages ?? 0}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        </>
      )}

      <CreateTagDialog open={createOpen} onOpenChange={setCreateOpen} groups={groups.data ?? []} />
      <TagHistoryDrawer tagId={historyTagId} onClose={() => setHistoryTagId(null)} />
      <BulkAssignDialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen} tagIds={Array.from(selected)} onDone={() => setSelected(new Set())} />
    </div>
  );
}

function TagRow({
  tag,
  selected,
  onToggle,
  groups,
  onArchive,
  onRestore,
  onDelete,
  onOpenHistory,
}: {
  tag: Tag;
  selected: boolean;
  onToggle: () => void;
  groups: TagGroup[];
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onOpenHistory: () => void;
}) {
  const updateTag = useUpdateTag(tag.id);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color ?? '#6366f1');
  const [category, setCategory] = useState(tag.category ?? '');
  const [groupId, setGroupId] = useState(tag.groupId ?? '');

  const group = groups.find((g) => g.id === tag.groupId);

  return (
    <TableRow>
      <TableCell>
        <Checkbox checked={selected} onChange={onToggle} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 shrink-0 rounded-full border border-border" style={{ backgroundColor: tag.color ?? undefined }} />
          <div>
            <p className="text-sm font-medium text-foreground">{tag.name}</p>
            <p className="text-xs text-muted-foreground">{group ? group.name : tag.slug}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground capitalize">{tag.scope.toLowerCase()}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{tag.category ?? '—'}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{tag.usageCount}</TableCell>
      <TableCell>
        <StatusBadge status={tag.status} />
      </TableCell>
      <TableCell>
        <ActionMenu
          items={[
            { label: 'Edit', icon: Pencil, onSelect: () => setEditOpen(true) },
            { label: 'History', icon: History, onSelect: onOpenHistory },
            ...(tag.status === 'ARCHIVED'
              ? [{ label: 'Restore', icon: ArchiveRestore, onSelect: onRestore, separatorBefore: true }]
              : [{ label: 'Archive', icon: Archive, onSelect: onArchive, separatorBefore: true }]),
            ...(!tag.isSystem ? [{ label: 'Delete', icon: Trash2, onSelect: onDelete, destructive: true }] : []),
          ]}
        />
      </TableCell>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Edit tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Name" htmlFor="tag-edit-name" required>
              <Input id="tag-edit-name" value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Color" htmlFor="tag-edit-color">
                <Input id="tag-edit-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-full p-1" />
              </FormField>
              <FormField label="Category" htmlFor="tag-edit-category">
                <Input id="tag-edit-category" value={category} onChange={(e) => setCategory(e.target.value)} />
              </FormField>
            </div>
            <FormField label="Group" htmlFor="tag-edit-group">
              <Select id="tag-edit-group" value={groupId} onChange={(e) => setGroupId(e.target.value)} options={[{ value: '', label: 'No group' }, ...groups.map((g) => ({ value: g.id, label: g.name }))]} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                updateTag.mutate(
                  { name, color, category: category || undefined, groupId: groupId || null },
                  { onSuccess: () => setEditOpen(false) },
                )
              }
              disabled={!name || updateTag.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TableRow>
  );
}

function CreateTagDialog({ open, onOpenChange, groups }: { open: boolean; onOpenChange: (o: boolean) => void; groups: TagGroup[] }) {
  const createTag = useCreateTag();
  const [name, setName] = useState('');
  const [scope, setScope] = useState<TagScope>('WORKSPACE');
  const [color, setColor] = useState('#6366f1');
  const [category, setCategory] = useState('');
  const [groupId, setGroupId] = useState('');

  function reset() {
    setName('');
    setScope('WORKSPACE');
    setColor('#6366f1');
    setCategory('');
    setGroupId('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>New tag</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Name" htmlFor="tag-name" required>
            <Input id="tag-name" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Scope" htmlFor="tag-scope">
              <Select id="tag-scope" value={scope} onChange={(e) => setScope(e.target.value as TagScope)} options={SCOPE_OPTIONS} />
            </FormField>
            <FormField label="Color" htmlFor="tag-color">
              <Input id="tag-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-full p-1" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Category" htmlFor="tag-category">
              <Input id="tag-category" value={category} onChange={(e) => setCategory(e.target.value)} />
            </FormField>
            <FormField label="Group" htmlFor="tag-group">
              <Select id="tag-group" value={groupId} onChange={(e) => setGroupId(e.target.value)} options={[{ value: '', label: 'No group' }, ...groups.map((g) => ({ value: g.id, label: g.name }))]} />
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const payload: CreateTagPayload = { name, scope, color, category: category || undefined, groupId: groupId || undefined };
              createTag.mutate(payload, {
                onSuccess: () => {
                  reset();
                  onOpenChange(false);
                },
              });
            }}
            disabled={!name || createTag.isPending}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TagHistoryDrawer({ tagId, onClose }: { tagId: string | null; onClose: () => void }) {
  const history = useTagHistory(tagId ?? undefined);

  return (
    <Drawer open={!!tagId} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent size="sm">
        <DrawerHeader>
          <DrawerTitle>Tag history</DrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          {history.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !history.data || history.data.length === 0 ? (
            <EmptyState title="No status changes yet" className="border-none py-8" />
          ) : (
            <div className="space-y-2">
              {history.data.map((h) => (
                <div key={h.id} className="rounded-[var(--radius)] border border-border p-2.5 text-sm">
                  <p className="text-foreground">
                    {(h.fromStatus ?? 'created').toLowerCase()} → {h.toStatus.toLowerCase()}
                  </p>
                  {h.reason && <p className="mt-1 text-xs text-muted-foreground">{h.reason}</p>}
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

function BulkAssignDialog({ open, onOpenChange, tagIds, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; tagIds: string[]; onDone: () => void }) {
  const bulkAssign = useBulkAssignTags();
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Bulk assign {tagIds.length} tag(s)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Entity type" htmlFor="bulk-entity-type" required>
            <Input id="bulk-entity-type" value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="e.g. supplier, product" />
          </FormField>
          <FormField label="Entity ID" htmlFor="bulk-entity-id" required>
            <Input id="bulk-entity-id" value={entityId} onChange={(e) => setEntityId(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              bulkAssign.mutate(
                { tagIds, entityType, entityId },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                    onDone();
                  },
                },
              )
            }
            disabled={!entityType || !entityId || bulkAssign.isPending}
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GroupsTab() {
  const groups = useTagGroups();
  const createGroup = useCreateTagGroup();
  const removeGroup = useRemoveTagGroup();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New group
        </Button>
      </div>

      {groups.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !groups.data || groups.data.length === 0 ? (
        <EmptyState title="No tag groups" icon={TagIcon} />
      ) : (
        <div className="space-y-2">
          {groups.data.map((g) => (
            <GroupRow key={g.id} group={g} onRemove={() => removeGroup.mutate(g.id)} />
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>New tag group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Name" htmlFor="group-name" required>
              <Input id="group-name" value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Description" htmlFor="group-description">
              <Input id="group-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                createGroup.mutate(
                  { name, description: description || undefined },
                  {
                    onSuccess: () => {
                      setName('');
                      setDescription('');
                      setCreateOpen(false);
                    },
                  },
                )
              }
              disabled={!name || createGroup.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GroupRow({ group, onRemove }: { group: TagGroup; onRemove: () => void }) {
  const updateGroup = useUpdateTagGroup(group.id);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');

  return (
    <div className="flex items-center justify-between rounded-[var(--radius)] border border-border p-3 text-sm">
      <div>
        <p className="font-medium text-foreground">{group.name}</p>
        {group.description && <p className="text-xs text-muted-foreground">{group.description}</p>}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Edit group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Name" htmlFor="group-edit-name" required>
              <Input id="group-edit-name" value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Description" htmlFor="group-edit-description">
              <Input id="group-edit-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => updateGroup.mutate({ name, description: description || undefined }, { onSuccess: () => setEditOpen(false) })} disabled={!name || updateGroup.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
