import { apiClient } from '@/lib/api/axios';
import type {
  AuthResponse,
  CreateWorkspacePayload,
  InvitationFilterParams,
  InviteMemberPayload,
  MemberFilterParams,
  PaginatedWorkspaceInvitations,
  PaginatedWorkspaceMembers,
  PaginationParams,
  UpdateWorkspacePayload,
  Workspace,
  WorkspaceInvitation,
  WorkspaceListResult,
  WorkspaceMember,
  WorkspaceMemberRole,
  WorkspaceProfile,
} from '@/types';

export async function listMyWorkspaces(params: PaginationParams = {}): Promise<WorkspaceListResult> {
  const { data } = await apiClient.get<WorkspaceListResult>('/workspaces', { params });
  return data;
}

export async function getWorkspaceById(id: string): Promise<Workspace> {
  const { data } = await apiClient.get<Workspace>(`/workspaces/${id}`);
  return data;
}

export async function getWorkspaceProfile(id: string): Promise<WorkspaceProfile> {
  const { data } = await apiClient.get<WorkspaceProfile>(`/workspaces/${id}/profile`);
  return data;
}

export async function createWorkspace(payload: CreateWorkspacePayload): Promise<Workspace> {
  const { data } = await apiClient.post<Workspace>('/workspaces', payload);
  return data;
}

export async function updateWorkspace(id: string, payload: UpdateWorkspacePayload): Promise<Workspace> {
  const { data } = await apiClient.patch<Workspace>(`/workspaces/${id}`, payload);
  return data;
}

export async function deleteWorkspace(id: string): Promise<void> {
  await apiClient.delete(`/workspaces/${id}`);
}

export async function activateWorkspace(id: string): Promise<Workspace> {
  const { data } = await apiClient.post<Workspace>(`/workspaces/${id}/activate`);
  return data;
}

export async function suspendWorkspace(id: string, reason?: string): Promise<Workspace> {
  const { data } = await apiClient.post<Workspace>(`/workspaces/${id}/suspend`, { reason });
  return data;
}

export async function archiveWorkspace(id: string): Promise<Workspace> {
  const { data } = await apiClient.post<Workspace>(`/workspaces/${id}/archive`);
  return data;
}

export async function restoreWorkspace(id: string): Promise<Workspace> {
  const { data } = await apiClient.post<Workspace>(`/workspaces/${id}/restore`);
  return data;
}

export async function transferOwnership(id: string, newOwnerUserId: string): Promise<Workspace> {
  const { data } = await apiClient.post<Workspace>(`/workspaces/${id}/transfer-ownership`, { newOwnerUserId });
  return data;
}

/** Switching workspace context re-mints the JWT pair (workspace context is a JWT claim, not a header) — the caller must replace stored tokens with the returned ones. */
export async function switchWorkspace(id: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>(`/workspaces/${id}/switch`);
  return data;
}

// ── Members ──────────────────────────────────────────────────

export async function listWorkspaceMembers(id: string, params: MemberFilterParams = {}): Promise<PaginatedWorkspaceMembers> {
  const { data } = await apiClient.get<PaginatedWorkspaceMembers>(`/workspaces/${id}/members`, { params });
  return data;
}

export async function updateMemberRole(id: string, memberId: string, role: WorkspaceMemberRole): Promise<WorkspaceMember> {
  const { data } = await apiClient.patch<WorkspaceMember>(`/workspaces/${id}/members/${memberId}`, { role });
  return data;
}

export async function removeMember(id: string, memberId: string): Promise<void> {
  await apiClient.delete(`/workspaces/${id}/members/${memberId}`);
}

// ── Invitations ──────────────────────────────────────────────

export async function inviteMember(id: string, payload: InviteMemberPayload): Promise<WorkspaceInvitation> {
  const { data } = await apiClient.post<WorkspaceInvitation>(`/workspaces/${id}/invitations`, payload);
  return data;
}

export async function listInvitations(id: string, params: InvitationFilterParams = {}): Promise<PaginatedWorkspaceInvitations> {
  const { data } = await apiClient.get<PaginatedWorkspaceInvitations>(`/workspaces/${id}/invitations`, { params });
  return data;
}

export async function revokeInvitation(id: string, invitationId: string): Promise<void> {
  await apiClient.delete(`/workspaces/${id}/invitations/${invitationId}`);
}

export async function acceptInvitation(token: string): Promise<WorkspaceMember> {
  const { data } = await apiClient.post<WorkspaceMember>('/workspaces/invitations/accept', null, { params: { token } });
  return data;
}
