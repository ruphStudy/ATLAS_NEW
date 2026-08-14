import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as syncService from '@/services/marketplace-sync-monitor.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CancelSyncPayload, RetrySyncPayload, SyncIssueType, SyncListFilterParams, SyncModule } from '@/types';
import { useToast } from './use-toast';

function useWorkspaceId() {
  return useAuthStore((s) => s.user?.workspaceId);
}

export function useAllSyncs() {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.SYNC_MONITOR, 'all', workspaceId],
    queryFn: () => syncService.listAllSyncs(workspaceId as string),
    enabled: !!workspaceId,
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useActiveSyncIssues(module?: SyncModule) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.SYNC_MONITOR, 'issues', workspaceId, module],
    queryFn: () => syncService.getActiveIssues(workspaceId as string, module),
    enabled: !!workspaceId,
    staleTime: 15 * 1000,
  });
}

export function useSyncMetrics(module?: SyncModule) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.SYNC_MONITOR, 'metrics', workspaceId, module],
    queryFn: () => syncService.getSyncMetrics(workspaceId as string, module),
    enabled: !!workspaceId,
    staleTime: 30 * 1000,
  });
}

export function useRetrySync() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RetrySyncPayload) => syncService.retrySync(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SYNC_MONITOR] });
      toast.success('Sync retry initiated');
    },
    onError: () => toast.error('Could not retry sync', 'Please try again.'),
  });
}

export function useCancelSync() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CancelSyncPayload) => syncService.cancelSync(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SYNC_MONITOR] });
      toast.success('Sync cancelled');
    },
    onError: () => toast.error('Could not cancel sync', 'Please try again.'),
  });
}

export function useResolveSyncIssue() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (issueId: string) => syncService.resolveIssue(workspaceId as string, issueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SYNC_MONITOR] });
      toast.success('Issue resolved');
    },
    onError: () => toast.error('Could not resolve issue', 'Please try again.'),
  });
}

export function useFilteredSyncs(params: Omit<SyncListFilterParams, 'workspaceId'>) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.SYNC_MONITOR, 'filtered', workspaceId, params],
    queryFn: () => syncService.listSyncsFiltered({ ...params, workspaceId: workspaceId as string }),
    enabled: !!workspaceId,
    staleTime: 15 * 1000,
  });
}

export function useSyncHistory(module: SyncModule | undefined, provider: string | undefined, accountId?: string, limit?: number) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.SYNC_MONITOR, 'history', workspaceId, module, provider, accountId, limit],
    queryFn: () => syncService.getSyncHistory(workspaceId as string, module as SyncModule, provider as string, accountId, limit),
    enabled: !!workspaceId && !!module && !!provider,
  });
}

export function useItemFailures(jobId?: string, module?: SyncModule, unresolvedOnly?: boolean) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.SYNC_MONITOR, 'failures', workspaceId, jobId, module, unresolvedOnly],
    queryFn: () => syncService.getItemFailures(workspaceId as string, jobId, module, unresolvedOnly),
    enabled: !!workspaceId,
  });
}

export function useSyncErrorSummary(jobId: string | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.SYNC_MONITOR, 'error-summary', workspaceId, jobId],
    queryFn: () => syncService.getErrorSummary(workspaceId as string, jobId as string),
    enabled: !!workspaceId && !!jobId,
  });
}

export function useSyncIssuesByType(module?: SyncModule, type?: SyncIssueType) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.SYNC_MONITOR, 'issues-by-type', workspaceId, module, type],
    queryFn: () => syncService.getIssuesByType(workspaceId as string, module, type),
    enabled: !!workspaceId,
  });
}

export function useDetectSyncIssues() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (module?: SyncModule) => syncService.detectSyncIssues(workspaceId as string, module),
    onSuccess: (issues) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SYNC_MONITOR, 'issues'] });
      toast.success(issues.length > 0 ? `${issues.length} issue(s) detected` : 'No new issues detected');
    },
    onError: () => toast.error('Could not run issue detection', 'Please try again.'),
  });
}

export function useSyncQueueHealth(module: SyncModule | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.SYNC_MONITOR, 'queue-health', workspaceId, module],
    queryFn: () => syncService.getSyncQueueHealth(workspaceId as string, module as SyncModule),
    enabled: !!workspaceId && !!module,
  });
}
