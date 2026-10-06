import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as reliabilityService from '@/services/ai-reliability.service';
import { QUERY_KEYS } from '@/constants';
import type {
  AiCacheEntryFilterParams,
  CreateCachePolicyPayload,
  CreateFallbackConfigPayload,
  CreateRetryPolicyPayload,
  RetryExecutionFilterParams,
  UpdateCachePolicyPayload,
  UpdateFallbackConfigPayload,
  UpdateRetryPolicyPayload,
} from '@/types';
import { useToast } from './use-toast';

// ── Retry / Fallback ────────────────────────────────────────────────────
export function useRetryExecutions(params: RetryExecutionFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_RETRY_EXECUTIONS, params],
    queryFn: () => reliabilityService.listRetryExecutions(params),
    enabled: !!params.workspaceId,
    staleTime: 15 * 1000,
  });
}

export function useRetryExecution(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_RETRY_EXECUTIONS, id],
    queryFn: () => reliabilityService.getRetryExecutionById(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useRetryAttempts(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_RETRY_EXECUTIONS, id, 'attempts'],
    queryFn: () => reliabilityService.getRetryAttempts(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useRetryFallbacks(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_RETRY_EXECUTIONS, id, 'fallbacks'],
    queryFn: () => reliabilityService.getRetryFallbacks(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useRetryStats(workspaceId: string | undefined, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_RETRY_EXECUTIONS, 'stats', workspaceId, startDate, endDate],
    queryFn: () => reliabilityService.getRetryStats(workspaceId as string, startDate, endDate),
    enabled: !!workspaceId,
  });
}

export function useCreateRetryPolicy() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateRetryPolicyPayload) => reliabilityService.createRetryPolicy(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_RETRY_POLICIES] });
      toast.success('Retry policy created');
    },
    onError: () => toast.error('Could not create policy', 'Please try again.'),
  });
}

export function useUpdateRetryPolicy(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateRetryPolicyPayload) => reliabilityService.updateRetryPolicy(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_RETRY_POLICIES] });
      toast.success('Retry policy updated');
    },
    onError: () => toast.error('Could not update policy', 'Please try again.'),
  });
}

export function useDeleteRetryPolicy() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => reliabilityService.deleteRetryPolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_RETRY_POLICIES] });
      toast.success('Retry policy deleted');
    },
    onError: () => toast.error('Could not delete policy', 'Please try again.'),
  });
}

export function useRetryPolicy(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_RETRY_POLICIES, id],
    queryFn: () => reliabilityService.getRetryPolicyById(id as string),
    enabled: !!id,
  });
}

export function useCreateFallbackConfig() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateFallbackConfigPayload) => reliabilityService.createFallbackConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_FALLBACK_CONFIGS] });
      toast.success('Fallback config created');
    },
    onError: () => toast.error('Could not create fallback config', 'Please try again.'),
  });
}

export function useUpdateFallbackConfig(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateFallbackConfigPayload) => reliabilityService.updateFallbackConfig(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_FALLBACK_CONFIGS] });
      toast.success('Fallback config updated');
    },
    onError: () => toast.error('Could not update fallback config', 'Please try again.'),
  });
}

export function useDeleteFallbackConfig() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => reliabilityService.deleteFallbackConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_FALLBACK_CONFIGS] });
      toast.success('Fallback config deleted');
    },
    onError: () => toast.error('Could not delete fallback config', 'Please try again.'),
  });
}

export function useFallbackConfig(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_FALLBACK_CONFIGS, id],
    queryFn: () => reliabilityService.getFallbackConfigById(id as string),
    enabled: !!id,
  });
}

// ── Cache ───────────────────────────────────────────────────────────────
export function useCacheEntries(params: AiCacheEntryFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_CACHE_ENTRIES, params],
    queryFn: () => reliabilityService.listCacheEntries(params),
    enabled: !!params.workspaceId,
  });
}

export function useCacheEntry(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_CACHE_ENTRIES, id],
    queryFn: () => reliabilityService.getCacheEntryById(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useCacheSavings(workspaceId: string | undefined, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_CACHE_ENTRIES, 'savings', workspaceId, startDate, endDate],
    queryFn: () => reliabilityService.getCacheSavings(workspaceId as string, startDate, endDate),
    enabled: !!workspaceId,
  });
}

export function useEvictExpiredCacheEntries() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (workspaceId: string) => reliabilityService.evictExpiredCacheEntries(workspaceId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_CACHE_ENTRIES] });
      toast.success('Expired entries evicted', `${result.evicted} entr${result.evicted === 1 ? 'y' : 'ies'} removed.`);
    },
    onError: () => toast.error('Eviction failed', 'Please try again.'),
  });
}

export function useMarkStaleCacheEntries() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (workspaceId: string) => reliabilityService.markStaleCacheEntries(workspaceId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_CACHE_ENTRIES] });
      toast.success('Stale entries marked', `${result.marked} entr${result.marked === 1 ? 'y' : 'ies'} marked stale.`);
    },
    onError: () => toast.error('Could not mark stale entries', 'Please try again.'),
  });
}

export function useCreateCachePolicy() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateCachePolicyPayload) => reliabilityService.createCachePolicy(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_CACHE_POLICIES] });
      toast.success('Cache policy created');
    },
    onError: () => toast.error('Could not create policy', 'Please try again.'),
  });
}

export function useUpdateCachePolicy(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateCachePolicyPayload) => reliabilityService.updateCachePolicy(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_CACHE_POLICIES] });
      toast.success('Cache policy updated');
    },
    onError: () => toast.error('Could not update policy', 'Please try again.'),
  });
}

export function useDeleteCachePolicy() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => reliabilityService.deleteCachePolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_CACHE_POLICIES] });
      toast.success('Cache policy deleted');
    },
    onError: () => toast.error('Could not delete policy', 'Please try again.'),
  });
}

export function useCachePolicy(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_CACHE_POLICIES, id],
    queryFn: () => reliabilityService.getCachePolicyById(id as string),
    enabled: !!id,
  });
}
