import { apiClient } from '@/lib/api/axios';
import type {
  AccessPermission,
  AccessPermissionFilterParams,
  AccessPermissionListResult,
  AccessRole,
  AccessRoleFilterParams,
  AccessRoleListResult,
  AssignmentFilterParams,
  AssignRolePayload,
  CreateAccessPermissionPayload,
  CreateAccessRolePayload,
  GrantRolePermissionPayload,
  RevokeRoleAssignmentPayload,
  RoleAssignment,
  RoleAssignmentHistoryEntry,
  RoleAssignmentListResult,
  RolePermissionGrant,
  RolePermissionHistoryEntry,
  UpdateAccessRolePayload,
} from '@/types';

const BASE = '/roles-permissions';

export async function listRoles(params: AccessRoleFilterParams = {}): Promise<AccessRoleListResult> {
  const { data } = await apiClient.get(`${BASE}/roles`, { params });
  return data;
}

export async function getRoleById(id: string): Promise<AccessRole> {
  const { data } = await apiClient.get(`${BASE}/roles/${id}`);
  return data;
}

export async function createRole(payload: CreateAccessRolePayload): Promise<AccessRole> {
  const { data } = await apiClient.post(`${BASE}/roles`, payload);
  return data;
}

export async function updateRole(id: string, payload: UpdateAccessRolePayload): Promise<AccessRole> {
  const { data } = await apiClient.patch(`${BASE}/roles/${id}`, payload);
  return data;
}

export async function archiveRole(id: string): Promise<AccessRole> {
  const { data } = await apiClient.post(`${BASE}/roles/${id}/archive`);
  return data;
}

export async function listRolePermissions(roleId: string): Promise<RolePermissionGrant[]> {
  const { data } = await apiClient.get(`${BASE}/roles/${roleId}/permissions`);
  return data;
}

export async function grantRolePermission(roleId: string, payload: GrantRolePermissionPayload): Promise<RolePermissionGrant> {
  const { data } = await apiClient.post(`${BASE}/roles/${roleId}/permissions`, payload);
  return data;
}

export async function revokeRolePermission(roleId: string, permissionKey: string): Promise<void> {
  await apiClient.delete(`${BASE}/roles/${roleId}/permissions/${permissionKey}`);
}

export async function getRolePermissionHistory(roleId: string): Promise<RolePermissionHistoryEntry[]> {
  const { data } = await apiClient.get(`${BASE}/roles/${roleId}/permission-history`);
  return data;
}

export async function listPermissionCatalog(params: AccessPermissionFilterParams = {}): Promise<AccessPermissionListResult> {
  const { data } = await apiClient.get(`${BASE}/permissions`, { params });
  return data;
}

export async function getPermissionByKey(key: string): Promise<AccessPermission> {
  const { data } = await apiClient.get(`${BASE}/permissions/${key}`);
  return data;
}

export async function createPermission(payload: CreateAccessPermissionPayload): Promise<AccessPermission> {
  const { data } = await apiClient.post(`${BASE}/permissions`, payload);
  return data;
}

export async function assignRole(payload: AssignRolePayload): Promise<RoleAssignment> {
  const { data } = await apiClient.post(`${BASE}/assignments`, payload);
  return data;
}

export async function listRoleAssignments(params: AssignmentFilterParams = {}): Promise<RoleAssignmentListResult> {
  const { data } = await apiClient.get(`${BASE}/assignments`, { params });
  return data;
}

export async function getRoleAssignmentById(id: string): Promise<RoleAssignment> {
  const { data } = await apiClient.get(`${BASE}/assignments/${id}`);
  return data;
}

export async function revokeRoleAssignment(id: string, payload: RevokeRoleAssignmentPayload = {}): Promise<RoleAssignment> {
  const { data } = await apiClient.post(`${BASE}/assignments/${id}/revoke`, payload);
  return data;
}

export async function getRoleAssignmentHistory(id: string): Promise<RoleAssignmentHistoryEntry[]> {
  const { data } = await apiClient.get(`${BASE}/assignments/${id}/history`);
  return data;
}
