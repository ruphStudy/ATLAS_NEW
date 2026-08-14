'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { isAxiosError } from 'axios';
import { ArrowUpCircle, Ban, Loader2, PauseCircle, Trash2, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ActionMenu } from '@/components/ui/action-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  useActivateWorkspace,
  useArchiveWorkspace,
  useAuditLogs,
  useConfirm,
  useCurrentUser,
  useDeleteWorkspace,
  useInviteMember,
  useOrganizationProfile,
  useRemoveMember,
  useRestoreWorkspace,
  useRevokeInvitation,
  useSuspendWorkspace,
  useSwitchWorkspace,
  useTransferOwnership,
  useUpdateMemberRole,
  useUpdateOrganizationProfile,
  useUpdateWorkspace,
  useWorkspace,
  useWorkspaceInvitations,
  useWorkspaceMembers,
  useWorkspaceProfile,
} from '@/hooks';
import { useWorkspaceStore } from '@/stores';
import { ROUTES } from '@/constants';
import type { WorkspaceMemberRole } from '@/types';

const MEMBER_ROLE_OPTIONS: { value: WorkspaceMemberRole; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MEMBER', label: 'Member' },
  { value: 'SERVICE_ACCOUNT', label: 'Service account' },
];

const ONBOARDING_STEPS: Record<string, number> = { NOT_STARTED: 0, IN_PROGRESS: 50, COMPLETED: 100 };

export default function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useCurrentUser();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const isActiveWorkspace = id === activeWorkspaceId;
  const { data: workspace, isLoading, isError, error, refetch } = useWorkspace(id);
  const { data: profile } = useWorkspaceProfile(id);

  const activate = useActivateWorkspace();
  const suspend = useSuspendWorkspace();
  const archive = useArchiveWorkspace();
  const restore = useRestoreWorkspace();
  const deleteWorkspace = useDeleteWorkspace();
  const confirm = useConfirm();

  const isForbidden = isAxiosError(error) && error.response?.status === 403;
  const isNotFound = isAxiosError(error) && error.response?.status === 404;

  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description={isNotFound ? 'This workspace could not be found.' : "We couldn't load this workspace."} />;

  if (isLoading || !workspace) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const isOwner = workspace.ownerId === currentUser?.id;

  const handleSuspend = async () => {
    const ok = await confirm({ title: 'Suspend this workspace?', description: 'Members will lose access until it is reactivated.', confirmLabel: 'Suspend', variant: 'danger' });
    if (ok) suspend.mutate({ id: workspace.id });
  };

  const handleArchive = async () => {
    const ok = await confirm({ title: 'Archive this workspace?', description: 'The workspace will be hidden and read-only until restored.', confirmLabel: 'Archive', variant: 'danger' });
    if (ok) archive.mutate({ id: workspace.id });
  };

  const handleDelete = async () => {
    const ok = await confirm({ title: 'Delete this workspace?', description: 'This permanently removes the workspace. This cannot be undone.', confirmLabel: 'Delete', variant: 'danger' });
    if (ok) deleteWorkspace.mutate(workspace.id);
  };

  const lifecycleActions: { label: string; icon: React.ElementType; onClick: () => void; pending: boolean }[] = [];
  if (workspace.status === 'ACTIVE' || workspace.status === 'TRIAL') {
    lifecycleActions.push({ label: 'Suspend', icon: PauseCircle, onClick: handleSuspend, pending: suspend.isPending });
    lifecycleActions.push({ label: 'Archive', icon: Ban, onClick: handleArchive, pending: archive.isPending });
  } else if (workspace.status === 'SUSPENDED') {
    lifecycleActions.push({ label: 'Activate', icon: ArrowUpCircle, onClick: () => activate.mutate({ id: workspace.id }), pending: activate.isPending });
    lifecycleActions.push({ label: 'Archive', icon: Ban, onClick: handleArchive, pending: archive.isPending });
  } else if (workspace.status === 'ARCHIVED') {
    lifecycleActions.push({ label: 'Restore', icon: ArrowUpCircle, onClick: () => restore.mutate({ id: workspace.id }), pending: restore.isPending });
  } else if (workspace.status === 'CANCELLED') {
    lifecycleActions.push({ label: 'Archive', icon: Ban, onClick: handleArchive, pending: archive.isPending });
  }

  return (
    <div>
      <PageHeader
        title={workspace.name}
        breadcrumbs={[{ label: 'Workspaces', href: ROUTES.WORKSPACES }, { label: workspace.name }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {lifecycleActions.map((action) => (
              <Button key={action.label} variant="outline" onClick={action.onClick} disabled={action.pending}>
                {action.pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <action.icon className="h-4 w-4" />}
                {action.label}
              </Button>
            ))}
            {isOwner && (
              <Button variant="danger" onClick={handleDelete} disabled={deleteWorkspace.isPending}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge status={workspace.status} />
        <Badge variant="outline" className="capitalize">
          {workspace.plan.toLowerCase()} plan
        </Badge>
        {workspace.onboardingStatus && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Onboarding</span>
            <Progress value={ONBOARDING_STEPS[workspace.onboardingStatus] ?? 0} className="w-24" />
            <span className="text-xs capitalize text-muted-foreground">{workspace.onboardingStatus.toLowerCase().replace(/_/g, ' ')}</span>
          </div>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab workspaceId={workspace.id} description={workspace.description} logoUrl={workspace.logoUrl} profile={profile} isOwner={isOwner} />
        </TabsContent>

        <TabsContent value="members">
          <MembersTab workspaceId={workspace.id} currentUserId={currentUser?.id} isOwner={isOwner} />
        </TabsContent>

        <TabsContent value="invitations">
          <InvitationsTab workspaceId={workspace.id} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab isActiveWorkspace={isActiveWorkspace} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTab isActiveWorkspace={isActiveWorkspace} workspaceId={workspace.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────

function OverviewTab({
  workspaceId,
  description,
  logoUrl,
  profile,
  isOwner,
}: {
  workspaceId: string;
  description?: string | null;
  logoUrl?: string | null;
  profile?: { timezone: string; locale: string; currency: string; contactEmail?: string | null; contactPhone?: string | null };
  isOwner: boolean;
}) {
  const updateWorkspace = useUpdateWorkspace(workspaceId);
  const [transferOpen, setTransferOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { isDirty } } = useForm({ defaultValues: { description: description ?? '', logoUrl: logoUrl ?? '' } });

  useEffect(() => {
    reset({ description: description ?? '', logoUrl: logoUrl ?? '' });
  }, [description, logoUrl, reset]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Workspace details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((values) => updateWorkspace.mutate({ description: values.description || undefined, logoUrl: values.logoUrl || undefined }))}
            className="space-y-4"
          >
            <FormField label="Description" htmlFor="ws-description">
              <Textarea id="ws-description" rows={3} {...register('description')} />
            </FormField>
            <FormField label="Logo URL" htmlFor="ws-logo">
              <Input id="ws-logo" {...register('logoUrl')} />
            </FormField>
            <div className="flex justify-end">
              <Button type="submit" disabled={!isDirty || updateWorkspace.isPending}>
                {updateWorkspace.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regional</CardTitle>
          <CardDescription>Resolved from organization settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {profile ? (
            <>
              <p>Timezone: {profile.timezone}</p>
              <p>Locale: {profile.locale}</p>
              <p>Currency: {profile.currency}</p>
              {profile.contactEmail && <p>Contact: {profile.contactEmail}</p>}
            </>
          ) : (
            <Skeleton className="h-16 w-full" />
          )}
        </CardContent>
        {isOwner && (
          <CardContent className="pt-0">
            <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)}>
              Transfer ownership
            </Button>
          </CardContent>
        )}
      </Card>

      <TransferOwnershipDialog workspaceId={workspaceId} open={transferOpen} onOpenChange={setTransferOpen} />
    </div>
  );
}

function TransferOwnershipDialog({ workspaceId, open, onOpenChange }: { workspaceId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data } = useWorkspaceMembers(open ? workspaceId : undefined, { status: 'ACTIVE', limit: 100 });
  const transferOwnership = useTransferOwnership(workspaceId);
  const [selected, setSelected] = useState('');

  const candidates = (data?.items ?? []).filter((m) => m.role !== 'OWNER');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Transfer ownership</DialogTitle>
          <DialogDescription>You will become an admin; the selected member becomes the owner.</DialogDescription>
        </DialogHeader>
        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No other active members to transfer to yet.</p>
        ) : (
          <FormField label="New owner" htmlFor="new-owner" required>
            <Select
              id="new-owner"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              placeholder="Select a member"
              options={candidates.map((m) => ({ value: m.userId, label: m.userId }))}
            />
          </FormField>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={!selected || transferOwnership.isPending}
            onClick={() =>
              transferOwnership.mutate(selected, {
                onSuccess: () => onOpenChange(false),
              })
            }
          >
            {transferOwnership.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Members ───────────────────────────────────────────────────

function MembersTab({ workspaceId, currentUserId, isOwner }: { workspaceId: string; currentUserId?: string; isOwner: boolean }) {
  const { data, isLoading } = useWorkspaceMembers(workspaceId, { limit: 50 });
  const updateRole = useUpdateMemberRole(workspaceId);
  const removeMember = useRemoveMember(workspaceId);
  const confirm = useConfirm();

  const handleRemove = async (memberId: string) => {
    const ok = await confirm({ title: 'Remove this member?', description: 'They will lose access to this workspace.', confirmLabel: 'Remove', variant: 'danger' });
    if (ok) removeMember.mutate(memberId);
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data || data.items.length === 0) return <EmptyState title="No members yet" description="Invite teammates from the Users page." />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.items.map((member) => {
          const isSelf = member.userId === currentUserId;
          return (
            <TableRow key={member.id}>
              <TableCell className="text-sm text-foreground">
                {member.userId} {isSelf && <span className="text-muted-foreground">(you)</span>}
              </TableCell>
              <TableCell>
                {member.role === 'OWNER' ? (
                  <Badge variant="outline" className="capitalize">
                    Owner
                  </Badge>
                ) : (
                  <Select
                    value={member.role}
                    onChange={(e) => updateRole.mutate({ memberId: member.id, role: e.target.value as WorkspaceMemberRole })}
                    options={MEMBER_ROLE_OPTIONS}
                    className="h-8 w-36 text-xs"
                    disabled={!isOwner || updateRole.isPending}
                  />
                )}
              </TableCell>
              <TableCell>
                <StatusBadge status={member.status} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{new Date(member.joinedAt).toLocaleDateString()}</TableCell>
              <TableCell>
                {member.role !== 'OWNER' && !isSelf && (
                  <ActionMenu items={[{ label: 'Remove', onSelect: () => handleRemove(member.id), destructive: true }]} />
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ── Invitations ───────────────────────────────────────────────

function InvitationsTab({ workspaceId }: { workspaceId: string }) {
  const { data, isLoading } = useWorkspaceInvitations(workspaceId, { limit: 50 });
  const revokeInvitation = useRevokeInvitation(workspaceId);
  const inviteMember = useInviteMember(workspaceId);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceMemberRole>('MEMBER');

  const handleInvite = () => {
    inviteMember.mutate(
      { email, role },
      { onSuccess: () => { setInviteOpen(false); setEmail(''); setRole('MEMBER'); } },
    );
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Invite
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No invitations" description="Pending and past invitations will appear here." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((invitation) => (
              <TableRow key={invitation.id}>
                <TableCell className="text-sm text-foreground">{invitation.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {invitation.role.toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <StatusBadge status={invitation.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(invitation.expiresAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  {invitation.status === 'PENDING' && (
                    <ActionMenu items={[{ label: 'Revoke', onSelect: () => revokeInvitation.mutate(invitation.id), destructive: true }]} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Invite a member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Email" htmlFor="inv-email" required>
              <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" />
            </FormField>
            <FormField label="Role" htmlFor="inv-role" required>
              <Select id="inv-role" value={role} onChange={(e) => setRole(e.target.value as WorkspaceMemberRole)} options={MEMBER_ROLE_OPTIONS} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={!email || inviteMember.isPending}>
              {inviteMember.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Switch-to-view notice (shown for tabs whose API is scoped to the caller's *active* JWT workspace, not the `:id` in the URL) ──

function SwitchToViewNotice({ workspaceId }: { workspaceId: string }) {
  const switchWorkspace = useSwitchWorkspace();
  return (
    <EmptyState
      title="Switch to this workspace to view this tab"
      description="This data is scoped to whichever workspace you're currently working in."
      action={{ label: switchWorkspace.isPending ? 'Switching…' : 'Switch to this workspace', onClick: () => switchWorkspace.mutate(workspaceId) }}
    />
  );
}

// ── Settings (organization profile) ──────────────────────────

function SettingsTab({ workspaceId, isActiveWorkspace }: { workspaceId: string; isActiveWorkspace: boolean }) {
  const { data, isLoading } = useOrganizationProfile(isActiveWorkspace);
  const updateProfile = useUpdateOrganizationProfile();
  const { register, handleSubmit, reset, formState: { isDirty } } = useForm({
    defaultValues: { name: '', legalName: '', logoUrl: '', contactEmail: '', contactPhone: '' },
  });

  useEffect(() => {
    if (data) {
      reset({
        name: String(data['name']?.value ?? ''),
        legalName: String(data['legalName']?.value ?? ''),
        logoUrl: String(data['logoUrl']?.value ?? ''),
        contactEmail: String(data['contactEmail']?.value ?? ''),
        contactPhone: String(data['contactPhone']?.value ?? ''),
      });
    }
  }, [data, reset]);

  if (!isActiveWorkspace) return <SwitchToViewNotice workspaceId={workspaceId} />;
  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization profile</CardTitle>
        <CardDescription>Legal and contact details used across ATLAS.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((values) =>
            updateProfile.mutate({
              name: values.name || undefined,
              legalName: values.legalName || undefined,
              logoUrl: values.logoUrl || undefined,
              contactEmail: values.contactEmail || undefined,
              contactPhone: values.contactPhone || undefined,
            }),
          )}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Organization name" htmlFor="org-name">
              <Input id="org-name" {...register('name')} />
            </FormField>
            <FormField label="Legal name" htmlFor="org-legal-name">
              <Input id="org-legal-name" {...register('legalName')} />
            </FormField>
          </div>
          <FormField label="Logo URL" htmlFor="org-logo">
            <Input id="org-logo" {...register('logoUrl')} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Contact email" htmlFor="org-contact-email">
              <Input id="org-contact-email" type="email" {...register('contactEmail')} />
            </FormField>
            <FormField label="Contact phone" htmlFor="org-contact-phone">
              <Input id="org-contact-phone" {...register('contactPhone')} />
            </FormField>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={!isDirty || updateProfile.isPending}>
              {updateProfile.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Activity ──────────────────────────────────────────────────

function ActivityTab({ isActiveWorkspace, workspaceId }: { isActiveWorkspace: boolean; workspaceId: string }) {
  const { data, isLoading, isError, error, refetch } = useAuditLogs({ limit: 30, sortOrder: 'desc' }, isActiveWorkspace);
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  if (!isActiveWorkspace) return <SwitchToViewNotice workspaceId={workspaceId} />;
  if (isForbidden) return <UnauthorizedState />;
  if (isError) return <QueryErrorState refetch={refetch} description="We couldn't load workspace activity." />;
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data || data.data.length === 0) return <EmptyState title="No activity yet" description="Actions taken in this workspace will show up here." />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Action</TableHead>
          <TableHead>Module</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Outcome</TableHead>
          <TableHead>When</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.data.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="text-sm text-foreground">{entry.action}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{entry.module}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{entry.actorName ?? entry.actorId ?? entry.actorType}</TableCell>
            <TableCell>
              <StatusBadge status={entry.outcome} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
