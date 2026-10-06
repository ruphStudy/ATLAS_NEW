import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as rpService from '@/services/roles-permissions.service';
import { QUERY_KEYS } from '@/constants';
import { useToast } from './use-toast';
import type {
  AccessPermissionFilterParams,
  AccessRoleFilterParams,
  AssignmentFilterParams,
  AssignRolePayload,
  CreateAccessPermissionPayload,
  CreateAccessRolePayload,
  GrantRolePermissionPayload,
  RevokeRoleAssignmentPayload,
  UpdateAccessRolePayload,
} from '@/types';

export function useRoles(params: AccessRoleFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.ACCESS_ROLES, params],
    queryFn: () => rpService.listRoles(params),
    staleTime: 30 * 1000,
  });
}

export function useRole(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.ACCESS_ROLES, id],
    queryFn: () => rpService.getRoleById(id as string),
    enabled: !!id,
  });
}

function invalidateRoles(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCESS_ROLES] });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateAccessRolePayload) => rpService.createRole(payload),
    onSuccess: () => {
      invalidateRoles(queryClient);
      toast.success('Role created');
    },
    onError: () => toast.error('Could not create role', 'Please try again.'),
  });
}

export function useUpdateRole(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateAccessRolePayload) => rpService.updateRole(id, payload),
    onSuccess: () => {
      invalidateRoles(queryClient);
      toast.success('Role updated');
    },
    onError: () => toast.error('Could not update role', 'Please try again.'),
  });
}

export function useArchiveRole(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => rpService.archiveRole(id),
    onSuccess: () => {
      invalidateRoles(queryClient);
      toast.success('Role archived');
    },
    onError: () => toast.error('Could not archive role', 'Please try again.'),
  });
}

export function useRolePermissions(roleId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.ACCESS_ROLE_PERMISSIONS, roleId],
    queryFn: () => rpService.listRolePermissions(roleId as string),
    enabled: !!roleId,
  });
}

export function useRolePermissionHistory(roleId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.ACCESS_ROLE_PERMISSIONS, roleId, 'history'],
    queryFn: () => rpService.getRolePermissionHistory(roleId as string),
    enabled: !!roleId,
  });
}

export function useGrantRolePermission(roleId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: GrantRolePermissionPayload) => rpService.grantRolePermission(roleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCESS_ROLE_PERMISSIONS, roleId] });
      toast.success('Permission granted');
    },
    onError: () => toast.error('Could not grant permission', 'This may exceed your own effective permissions.'),
  });
}

export function useRevokeRolePermission(roleId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (permissionKey: string) => rpService.revokeRolePermission(roleId, permissionKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCESS_ROLE_PERMISSIONS, roleId] });
      toast.success('Permission revoked');
    },
    onError: () => toast.error('Could not revoke permission', 'Please try again.'),
  });
}

export function usePermissionCatalog(params: AccessPermissionFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.ACCESS_PERMISSION_CATALOG, params],
    queryFn: () => rpService.listPermissionCatalog(params),
    staleTime: 60 * 1000,
  });
}

export function useCreatePermission() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateAccessPermissionPayload) => rpService.createPermission(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCESS_PERMISSION_CATALOG] });
      toast.success('Permission created');
    },
    onError: () => toast.error('Could not create permission', 'Please try again.'),
  });
}

export function useRoleAssignments(params: AssignmentFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.ACCESS_ASSIGNMENTS, params],
    queryFn: () => rpService.listRoleAssignments(params),
    staleTime: 15 * 1000,
  });
}

export function useRoleAssignment(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.ACCESS_ASSIGNMENTS, id],
    queryFn: () => rpService.getRoleAssignmentById(id as string),
    enabled: !!id,
  });
}

export function useRoleAssignmentHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.ACCESS_ASSIGNMENTS, id, 'history'],
    queryFn: () => rpService.getRoleAssignmentHistory(id as string),
    enabled: !!id,
  });
}

function invalidateAssignments(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACCESS_ASSIGNMENTS] });
}

export function useAssignRole() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: AssignRolePayload) => rpService.assignRole(payload),
    onSuccess: () => {
      invalidateAssignments(queryClient);
      toast.success('Role assigned');
    },
    onError: () => toast.error('Could not assign role', 'Please try again.'),
  });
}

export function useRevokeRoleAssignment(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RevokeRoleAssignmentPayload = {}) => rpService.revokeRoleAssignment(id, payload),
    onSuccess: () => {
      invalidateAssignments(queryClient);
      toast.success('Assignment revoked');
    },
    onError: () => toast.error('Could not revoke assignment', 'Please try again.'),
  });
}
