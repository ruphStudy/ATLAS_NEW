'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Check } from 'lucide-react';
import { isAxiosError } from 'axios';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateWorkspace, useMyWorkspaces, useSwitchWorkspace } from '@/hooks';
import { useWorkspaceStore } from '@/stores';
import { ROUTES } from '@/constants';

function CreateWorkspaceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createWorkspace = useCreateWorkspace();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    createWorkspace.mutate(
      { name, description: description || undefined },
      {
        onSuccess: () => {
          onOpenChange(false);
          setName('');
          setDescription('');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Create a workspace</DialogTitle>
          <DialogDescription>Workspaces isolate your data, members and settings.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Name" htmlFor="workspace-name" required>
            <Input id="workspace-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" />
          </FormField>
          <FormField label="Description" htmlFor="workspace-description">
            <Textarea id="workspace-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" rows={3} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name || createWorkspace.isPending}>
            {createWorkspace.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WorkspacesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, isError, error, refetch } = useMyWorkspaces();
  const switchWorkspace = useSwitchWorkspace();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const isForbidden = isAxiosError(error) && error.response?.status === 403;
  const filtered = (data?.items ?? []).filter((w) => w.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Workspaces"
        description="Workspaces you belong to."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New workspace
          </Button>
        }
      />

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search workspaces…" className="mb-4" />

      {isForbidden ? null : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load your workspaces." />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No workspaces found" description={search ? 'Try a different search term.' : 'Create your first workspace.'} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((workspace) => {
            const isActive = workspace.id === activeWorkspaceId;
            return (
              <Card key={workspace.id} hover className="cursor-pointer" onClick={() => router.push(`${ROUTES.WORKSPACES}/${workspace.id}`)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-brand text-sm font-bold text-white">
                      {workspace.name.slice(0, 2).toUpperCase()}
                    </div>
                    {isActive && (
                      <Badge variant="success" className="shrink-0">
                        <Check className="h-3 w-3" />
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="mt-3 truncate text-sm font-semibold text-foreground">{workspace.name}</p>
                  {workspace.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{workspace.description}</p>}
                  <div className="mt-3 flex items-center justify-between">
                    <StatusBadge status={workspace.status} />
                    {!isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={switchWorkspace.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          switchWorkspace.mutate(workspace.id);
                        }}
                      >
                        Switch
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
