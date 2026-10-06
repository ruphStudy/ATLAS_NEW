'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Loader2 } from 'lucide-react';
import { isAxiosError } from 'axios';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { ActionMenu } from '@/components/ui/action-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useCurrentUser, useDeleteUser, useInviteMember, useUpdateUser, useUsers } from '@/hooks';
import { useConfirm } from '@/hooks';
import { useWorkspaceStore } from '@/stores';
import { ROUTES } from '@/constants';
import type { User, UserRole, WorkspaceMemberRole } from '@/types';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'OPERATOR', label: 'Operator' },
  { value: 'ANALYST', label: 'Analyst' },
  { value: 'VIEWER', label: 'Viewer' },
];

const INVITABLE_ROLE_OPTIONS: { value: WorkspaceMemberRole; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MEMBER', label: 'Member' },
  { value: 'SERVICE_ACCOUNT', label: 'Service account' },
];

function InviteUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const inviteMember = useInviteMember(activeWorkspaceId ?? '');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceMemberRole>('MEMBER');

  const handleInvite = () => {
    inviteMember.mutate(
      { email, role },
      {
        onSuccess: () => {
          onOpenChange(false);
          setEmail('');
          setRole('MEMBER');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Invite a user</DialogTitle>
          <DialogDescription>They&apos;ll receive access to this workspace once they accept the invitation.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Email" htmlFor="invite-email" required>
            <Input id="invite-email" type="email" placeholder="teammate@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <FormField label="Role" htmlFor="invite-role" required>
            <Select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as WorkspaceMemberRole)} options={INVITABLE_ROLE_OPTIONS} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={!email || inviteMember.isPending}>
            {inviteMember.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Send invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useUsers({ search: search || undefined, page, limit });
  const deleteUser = useDeleteUser();
  const confirm = useConfirm();

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  const handleRemove = async (user: User) => {
    const ok = await confirm({
      title: 'Remove this user?',
      description: `${user.firstName} ${user.lastName} will be removed from the workspace. This cannot be undone.`,
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (!ok) return;
    deleteUser.mutate(user.id);
  };

  return (
    <div>
      <PageHeader
        title="Users"
        description="Everyone with access to this workspace."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Invite user
          </Button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search users…"
        className="mb-4"
      />

      {isForbidden ? (
        <UnauthorizedState />
      ) : isError ? (
        <QueryErrorState refetch={refetch} description="We couldn't load users for this workspace." />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No users found" description={search ? 'Try a different search term.' : 'Invite your first teammate to get started.'} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((user) => (
              <UserRow key={user.id} user={user} currentUserId={currentUser?.id} onRemove={handleRemove} />
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Pagination
          page={page}
          limit={limit}
          total={data.total}
          totalPages={Math.ceil(data.total / limit)}
          onPageChange={setPage}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
        />
      )}

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}

function UserRow({ user, currentUserId, onRemove }: { user: User; currentUserId?: string; onRemove: (user: User) => void }) {
  const router = useRouter();
  const updateUser = useUpdateUser(user.id);
  const isSelf = user.id === currentUserId;
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  return (
    <TableRow clickable onClick={() => router.push(`${ROUTES.USERS}/${user.id}`)}>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {user.firstName} {user.lastName} {isSelf && <span className="text-muted-foreground">(you)</span>}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Select
          value={user.role}
          onChange={(e) => updateUser.mutate({ role: e.target.value as UserRole })}
          options={ROLE_OPTIONS}
          className="h-8 w-32 text-xs"
          disabled={updateUser.isPending || isSelf}
          onClick={(e) => e.stopPropagation()}
        />
      </TableCell>
      <TableCell>
        <StatusBadge status={user.status} />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}</TableCell>
      <TableCell>
        <ActionMenu
          items={[
            {
              label: user.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
              onSelect: () => updateUser.mutate({ status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
              disabled: isSelf,
            },
            { label: 'Remove', onSelect: () => onRemove(user), destructive: true, disabled: isSelf },
          ]}
        />
      </TableCell>
    </TableRow>
  );
}
