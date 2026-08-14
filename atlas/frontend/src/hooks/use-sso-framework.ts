import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ssoService from '@/services/sso-framework.service';
import { QUERY_KEYS } from '@/constants';
import type {
  CreateSsoGroupRoleMappingPayload,
  RegisterSsoConnectionPayload,
  RotateSsoCertificatePayload,
  RotateSsoClientSecretPayload,
  SsoConnectionFilterParams,
  UpdateSsoConnectionPayload,
  UpdateSsoGroupRoleMappingPayload,
} from '@/types';
import { useToast } from './use-toast';

export function useSsoConnections(params: SsoConnectionFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.SSO_CONNECTIONS, params],
    queryFn: () => ssoService.listSsoConnections(params),
    staleTime: 30 * 1000,
  });
}

export function useSsoConnection(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.SSO_CONNECTIONS, id],
    queryFn: () => ssoService.getSsoConnectionById(id as string),
    enabled: !!id,
  });
}

export function useSsoConnectionHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.SSO_CONNECTIONS, id, 'history'],
    queryFn: () => ssoService.getSsoConnectionHistory(id as string),
    enabled: !!id,
  });
}

export function useRegisterSsoConnection() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RegisterSsoConnectionPayload) => ssoService.registerSsoConnection(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SSO_CONNECTIONS] });
      toast.success('SSO connection registered');
    },
    onError: () => toast.error('Could not register connection', 'Please try again.'),
  });
}

export function useUpdateSsoConnection(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateSsoConnectionPayload) => ssoService.updateSsoConnection(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SSO_CONNECTIONS] });
      toast.success('SSO connection updated');
    },
    onError: () => toast.error('Could not update connection', 'Please try again.'),
  });
}

export function useEnableSsoConnection(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => ssoService.enableSsoConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SSO_CONNECTIONS] });
      toast.success('Connection enabled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useDisableSsoConnection(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => ssoService.disableSsoConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SSO_CONNECTIONS] });
      toast.success('Connection disabled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useRevokeSsoConnection(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason?: string) => ssoService.revokeSsoConnection(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SSO_CONNECTIONS] });
      toast.success('Connection revoked');
    },
    onError: () => toast.error('Could not revoke connection', 'Please try again.'),
  });
}

export function useArchiveSsoConnection(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => ssoService.archiveSsoConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SSO_CONNECTIONS] });
      toast.success('Connection archived');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useRotateSsoCertificate(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RotateSsoCertificatePayload) => ssoService.rotateSsoCertificate(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SSO_CONNECTIONS] });
      toast.success('Certificate rotated');
    },
    onError: () => toast.error('Could not rotate certificate', 'Please try again.'),
  });
}

export function useRotateSsoClientSecret(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RotateSsoClientSecretPayload) => ssoService.rotateSsoClientSecret(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SSO_CONNECTIONS] });
      toast.success('Client secret rotated');
    },
    onError: () => toast.error('Could not rotate secret', 'Please try again.'),
  });
}

export function useRefreshSsoMetadata(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => ssoService.refreshSsoMetadata(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SSO_CONNECTIONS] });
      toast.success('Metadata refreshed');
    },
    onError: () => toast.error('Could not refresh metadata', 'Please try again.'),
  });
}

export function useSsoGroupRoleMappings(connectionId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.SSO_GROUP_ROLE_MAPPINGS, connectionId],
    queryFn: () => ssoService.listSsoGroupRoleMappings(connectionId as string),
    enabled: !!connectionId,
  });
}

export function useCreateSsoGroupRoleMapping(connectionId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateSsoGroupRoleMappingPayload) => ssoService.createSsoGroupRoleMapping(connectionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SSO_GROUP_ROLE_MAPPINGS, connectionId] });
      toast.success('Group mapping created');
    },
    onError: () => toast.error('Could not create mapping', 'Please try again.'),
  });
}

export function useUpdateSsoGroupRoleMapping(connectionId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ mappingId, payload }: { mappingId: string; payload: UpdateSsoGroupRoleMappingPayload }) =>
      ssoService.updateSsoGroupRoleMapping(connectionId, mappingId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SSO_GROUP_ROLE_MAPPINGS, connectionId] });
      toast.success('Group mapping updated');
    },
    onError: () => toast.error('Could not update mapping', 'Please try again.'),
  });
}

export function useDeleteSsoGroupRoleMapping(connectionId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (mappingId: string) => ssoService.deleteSsoGroupRoleMapping(connectionId, mappingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SSO_GROUP_ROLE_MAPPINGS, connectionId] });
      toast.success('Group mapping deleted');
    },
    onError: () => toast.error('Could not delete mapping', 'Please try again.'),
  });
}
