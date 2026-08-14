'use client';

import { useParams, useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { useConfirm, useCurrentUser, useDeleteUser, useUpdateUser, useUser } from '@/hooks';
import { ROUTES } from '@/constants';
import type { UserRole, UserStatus } from '@/types';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'OPERATOR', label: 'Operator' },
  { value: 'ANALYST', label: 'Analyst' },
  { value: 'VIEWER', label: 'Viewer' },
];

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'PENDING_VERIFICATION', label: 'Pending verification' },
];

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { data: user, isLoading, isError, error, refetch } = useUser(id);
  const updateUser = useUpdateUser(id);
  const deleteUser = useDeleteUser();
  const confirm = useConfirm();

  const isForbidden = isAxiosError(error) && error.response?.status === 403;
  const isNotFound = isAxiosError(error) && error.response?.status === 404;
  const isSelf = user?.id === currentUser?.id;

  const handleRemove = async () => {
    if (!user) return;
    const ok = await confirm({
      title: 'Remove this user?',
      description: `${user.firstName} ${user.lastName} will be removed from the workspace. This cannot be undone.`,
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (ok) deleteUser.mutate(user.id);
  };

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description={isNotFound ? 'This user could not be found.' : "We couldn't load this user."} />;

  if (isLoading || !user) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  return (
    <div>
      <PageHeader
        title={`${user.firstName} ${user.lastName}`}
        breadcrumbs={[{ label: 'Users', href: ROUTES.USERS }, { label: `${user.firstName} ${user.lastName}` }]}
        actions={
          !isSelf && (
            <Button variant="danger" onClick={handleRemove} disabled={deleteUser.isPending}>
              <Trash2 className="h-4 w-4" />
              Remove user
            </Button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-16 w-16">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} />}
                <AvatarFallback className="text-base">{initials}</AvatarFallback>
              </Avatar>
              <CardTitle className="mt-3">
                {user.firstName} {user.lastName}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-3 flex items-center gap-2">
                <StatusBadge status={user.status} />
                <Badge variant="outline" className="capitalize">
                  {user.role.toLowerCase()}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Phone: {user.phone ?? '—'}</p>
            <p>Timezone: {user.timezone}</p>
            <p>Locale: {user.locale}</p>
            <p>Email {user.emailVerified ? 'verified' : 'not verified'}</p>
            <p>Last login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</p>
            <p>Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Role &amp; access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSelf ? (
              <p className="text-sm text-muted-foreground">You cannot change your own role or status here.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Role</label>
                  <Select
                    value={user.role}
                    onChange={(e) => updateUser.mutate({ role: e.target.value as UserRole })}
                    options={ROLE_OPTIONS}
                    disabled={updateUser.isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Status</label>
                  <Select
                    value={user.status}
                    onChange={(e) => updateUser.mutate({ status: e.target.value as UserStatus })}
                    options={STATUS_OPTIONS}
                    disabled={updateUser.isPending}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
