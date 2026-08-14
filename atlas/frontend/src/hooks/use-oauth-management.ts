import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as oauthService from '@/services/oauth-management.service';
import { QUERY_KEYS } from '@/constants';
import type {
  AuthorizeOAuthConnectionPayload,
  ConnectOAuthClientCredentialsPayload,
  OAuthClientFilterParams,
  OAuthConnectionFilterParams,
  RegisterOAuthClientPayload,
  UpdateOAuthClientPayload,
} from '@/types';
import { useToast } from './use-toast';

export function useOAuthClients(params: OAuthClientFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.OAUTH_CLIENTS, params],
    queryFn: () => oauthService.listOAuthClients(params),
    staleTime: 30 * 1000,
  });
}

export function useOAuthClient(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.OAUTH_CLIENTS, id],
    queryFn: () => oauthService.getOAuthClientById(id as string),
    enabled: !!id,
  });
}

export function useOAuthClientHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.OAUTH_CLIENTS, id, 'history'],
    queryFn: () => oauthService.getOAuthClientHistory(id as string),
    enabled: !!id,
  });
}

export function useRegisterOAuthClient() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RegisterOAuthClientPayload) => oauthService.registerOAuthClient(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.OAUTH_CLIENTS] });
      toast.success('OAuth client registered');
    },
    onError: () => toast.error('Could not register client', 'Please try again.'),
  });
}

export function useUpdateOAuthClient(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateOAuthClientPayload) => oauthService.updateOAuthClient(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.OAUTH_CLIENTS] });
      toast.success('OAuth client updated');
    },
    onError: () => toast.error('Could not update client', 'Please try again.'),
  });
}

export function useEnableOAuthClient(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => oauthService.enableOAuthClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.OAUTH_CLIENTS] });
      toast.success('Client enabled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useDisableOAuthClient(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => oauthService.disableOAuthClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.OAUTH_CLIENTS] });
      toast.success('Client disabled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useRotateOAuthClientSecret(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (clientSecret: string) => oauthService.rotateOAuthClientSecret(id, clientSecret),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.OAUTH_CLIENTS] });
      toast.success('Client secret rotated');
    },
    onError: () => toast.error('Could not rotate secret', 'Please try again.'),
  });
}

export function useRevokeOAuthClient(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason?: string) => oauthService.revokeOAuthClient(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.OAUTH_CLIENTS] });
      toast.success('Client revoked');
    },
    onError: () => toast.error('Could not revoke client', 'Please try again.'),
  });
}

export function useArchiveOAuthClient(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => oauthService.archiveOAuthClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.OAUTH_CLIENTS] });
      toast.success('Client archived');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useAuthorizeOAuthConnection(clientId: string) {
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: AuthorizeOAuthConnectionPayload) => oauthService.authorizeOAuthConnection(clientId, payload),
    onError: () => toast.error('Could not start authorization', 'Please try again.'),
  });
}

export function useConnectOAuthClientCredentials(clientId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ConnectOAuthClientCredentialsPayload) => oauthService.connectOAuthClientCredentials(clientId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.OAUTH_CONNECTIONS] });
      toast.success('Connected');
    },
    onError: () => toast.error('Could not connect', 'Please try again.'),
  });
}

export function useOAuthConnections(params: OAuthConnectionFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.OAUTH_CONNECTIONS, params],
    queryFn: () => oauthService.listOAuthConnections(params),
    staleTime: 30 * 1000,
  });
}

export function useOAuthConnection(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.OAUTH_CONNECTIONS, id],
    queryFn: () => oauthService.getOAuthConnectionById(id as string),
    enabled: !!id,
  });
}

export function useOAuthConnectionHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.OAUTH_CONNECTIONS, id, 'history'],
    queryFn: () => oauthService.getOAuthConnectionHistory(id as string),
    enabled: !!id,
  });
}

export function useRefreshOAuthConnection(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => oauthService.refreshOAuthConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.OAUTH_CONNECTIONS] });
      toast.success('Connection refreshed');
    },
    onError: () => toast.error('Could not refresh connection', 'Please try again.'),
  });
}

export function useRevokeOAuthConnection(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason?: string) => oauthService.revokeOAuthConnection(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.OAUTH_CONNECTIONS] });
      toast.success('Connection revoked');
    },
    onError: () => toast.error('Could not revoke connection', 'Please try again.'),
  });
}

export function useDisconnectOAuthConnection(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => oauthService.disconnectOAuthConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.OAUTH_CONNECTIONS] });
      toast.success('Disconnected');
    },
    onError: () => toast.error('Could not disconnect', 'Please try again.'),
  });
}

export function useTestOAuthConnection(id: string) {
  const toast = useToast();
  return useMutation({
    mutationFn: () => oauthService.testOAuthConnection(id),
    onError: () => toast.error('Test failed', 'Please try again.'),
  });
}
