import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as workspacesService from '@/services/workspaces.service';
import { QUERY_KEYS, ROUTES } from '@/constants';
import { useAuthStore, useWorkspaceStore } from '@/stores';
import type { CreateWorkspacePayload, InvitationFilterParams, InviteMemberPayload, MemberFilterParams, UpdateWorkspacePayload, WorkspaceMemberRole } from '@/types';
import { useToast } from './use-toast';

export function useMyWorkspaces() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setWorkspaces = useWorkspaceStore((s) => s.setWorkspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);
  const user = useAuthStore((s) => s.user);

  const query = useQuery({
    queryKey: [QUERY_KEYS.WORKSPACES],
    queryFn: () => workspacesService.listMyWorkspaces({ limit: 100 }),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data?.items) {
      setWorkspaces(query.data.items);
      // Default the active workspace to whatever the current JWT says, if nothing is set yet.
      if (!activeWorkspaceId && user?.workspaceId) {
        setActiveWorkspaceId(user.workspaceId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  return query;
}

export function useWorkspace(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.WORKSPACE, id],
    queryFn: () => workspacesService.getWorkspaceById(id as string),
    enabled: !!id,
  });
}

export function useWorkspaceProfile(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.WORKSPACE, id, 'profile'],
    queryFn: () => workspacesService.getWorkspaceProfile(id as string),
    enabled: !!id,
  });
}

export function useSwitchWorkspace() {
  const setSession = useAuthStore((s) => s.setSession);
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (workspaceId: string) => workspacesService.switchWorkspace(workspaceId),
    onSuccess: (data) => {
      setSession(data);
      setActiveWorkspaceId(data.user.workspaceId);
      queryClient.invalidateQueries();
      toast.success('Workspace switched', `You're now working in a different workspace.`);
    },
    onError: () => {
      toast.error('Could not switch workspace', 'Please try again.');
    },
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateWorkspacePayload) => workspacesService.createWorkspace(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKSPACES] });
      toast.success('Workspace created');
    },
    onError: () => toast.error('Could not create workspace', 'Please try again.'),
  });
}

export function useUpdateWorkspace(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateWorkspacePayload) => workspacesService.updateWorkspace(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKSPACES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKSPACE, id] });
      toast.success('Workspace updated');
    },
    onError: () => toast.error('Could not update workspace', 'Please try again.'),
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => workspacesService.deleteWorkspace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKSPACES] });
      toast.success('Workspace deleted');
      router.push(ROUTES.WORKSPACES);
    },
    onError: () => toast.error('Could not delete workspace', 'Please try again.'),
  });
}

function useWorkspaceLifecycleAction(action: (id: string, reason?: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => action(id, reason),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKSPACES] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKSPACE, id] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useActivateWorkspace() {
  return useWorkspaceLifecycleAction((id) => workspacesService.activateWorkspace(id), 'Workspace activated');
}

export function useSuspendWorkspace() {
  return useWorkspaceLifecycleAction((id, reason) => workspacesService.suspendWorkspace(id, reason), 'Workspace suspended');
}

export function useArchiveWorkspace() {
  return useWorkspaceLifecycleAction((id) => workspacesService.archiveWorkspace(id), 'Workspace archived');
}

export function useRestoreWorkspace() {
  return useWorkspaceLifecycleAction((id) => workspacesService.restoreWorkspace(id), 'Workspace restored');
}

export function useTransferOwnership(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (newOwnerUserId: string) => workspacesService.transferOwnership(id, newOwnerUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKSPACE, id] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKSPACE, id, 'members'] });
      toast.success('Ownership transferred');
    },
    onError: () => toast.error('Could not transfer ownership', 'Please try again.'),
  });
}

// ── Members ──────────────────────────────────────────────────

export function useWorkspaceMembers(id: string | undefined, filter: MemberFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.WORKSPACE, id, 'members', filter],
    queryFn: () => workspacesService.listWorkspaceMembers(id as string, filter),
    enabled: !!id,
  });
}

export function useUpdateMemberRole(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: WorkspaceMemberRole }) => workspacesService.updateMemberRole(id, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKSPACE, id, 'members'] });
      toast.success('Member role updated');
    },
    onError: () => toast.error('Could not update member role', 'Please try again.'),
  });
}

export function useRemoveMember(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (memberId: string) => workspacesService.removeMember(id, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKSPACE, id, 'members'] });
      toast.success('Member removed');
    },
    onError: () => toast.error('Could not remove member', 'Please try again.'),
  });
}

// ── Invitations ──────────────────────────────────────────────

export function useInviteMember(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: InviteMemberPayload) => workspacesService.inviteMember(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKSPACE, id, 'invitations'] });
      toast.success('Invitation sent');
    },
    onError: () => toast.error('Could not send invitation', 'Please try again.'),
  });
}

export function useWorkspaceInvitations(id: string | undefined, filter: InvitationFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.WORKSPACE, id, 'invitations', filter],
    queryFn: () => workspacesService.listInvitations(id as string, filter),
    enabled: !!id,
  });
}

export function useRevokeInvitation(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (invitationId: string) => workspacesService.revokeInvitation(id, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKSPACE, id, 'invitations'] });
      toast.success('Invitation revoked');
    },
    onError: () => toast.error('Could not revoke invitation', 'Please try again.'),
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (token: string) => workspacesService.acceptInvitation(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKSPACES] });
      toast.success('Invitation accepted', "You've joined the workspace.");
    },
    onError: () => toast.error('Could not accept invitation', 'The link may be invalid or expired.'),
  });
}
