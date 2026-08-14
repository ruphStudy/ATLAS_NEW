import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as apiKeyService from '@/services/api-key-management.service';
import { QUERY_KEYS } from '@/constants';
import type { ApiKeyFilterParams, CreateApiKeyPayload, UpdateApiKeyPayload } from '@/types';
import { useToast } from './use-toast';

export function useApiKeys(params: ApiKeyFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.API_KEYS, params],
    queryFn: () => apiKeyService.listApiKeys(params),
    staleTime: 30 * 1000,
  });
}

export function useApiKey(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.API_KEYS, id],
    queryFn: () => apiKeyService.getApiKeyById(id as string),
    enabled: !!id,
  });
}

export function useApiKeyHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.API_KEYS, id, 'history'],
    queryFn: () => apiKeyService.getApiKeyHistory(id as string),
    enabled: !!id,
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateApiKeyPayload) => apiKeyService.createApiKey(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.API_KEYS] });
      toast.success('API key created');
    },
    onError: () => toast.error('Could not create API key', 'Please try again.'),
  });
}

export function useUpdateApiKey(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateApiKeyPayload) => apiKeyService.updateApiKey(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.API_KEYS] });
      toast.success('API key updated');
    },
    onError: () => toast.error('Could not update API key', 'Please try again.'),
  });
}

export function useRotateApiKey(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (gracePeriodMs?: number) => apiKeyService.rotateApiKey(id, gracePeriodMs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.API_KEYS] });
      toast.success('API key rotated');
    },
    onError: () => toast.error('Could not rotate API key', 'Please try again.'),
  });
}

export function useRevokeApiKey(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason?: string) => apiKeyService.revokeApiKey(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.API_KEYS] });
      toast.success('API key revoked');
    },
    onError: () => toast.error('Could not revoke API key', 'Please try again.'),
  });
}

export function useDisableApiKey(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => apiKeyService.disableApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.API_KEYS] });
      toast.success('API key disabled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useEnableApiKey(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => apiKeyService.enableApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.API_KEYS] });
      toast.success('API key enabled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}
