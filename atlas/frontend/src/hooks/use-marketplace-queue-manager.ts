import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as queueService from '@/services/marketplace-queue-manager.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type { CancelMarketplaceJobPayload, MarketplaceJobState, MarketplaceQueueType, RecoverStaleMarketplaceJobsPayload, ReprocessMarketplaceDeadLetterJobPayload, RetryMarketplaceJobPayload, SetMarketplaceRateLimitPayload } from '@/types';

const KEY = 'marketplace-queue-manager';

function useWorkspaceId() {
  return useAuthStore((s) => s.user?.workspaceId);
}

export function useMarketplaceJobs(queueType: MarketplaceQueueType | undefined, state: MarketplaceJobState | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'jobs', workspaceId, queueType, state],
    queryFn: () => queueService.listMarketplaceJobs(workspaceId as string, queueType as MarketplaceQueueType, state as MarketplaceJobState),
    enabled: !!workspaceId && !!queueType && !!state,
    staleTime: 10 * 1000,
  });
}

export function useMarketplaceJob(queueType: MarketplaceQueueType | undefined, jobId: string | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'job', workspaceId, queueType, jobId],
    queryFn: () => queueService.getMarketplaceJob(workspaceId as string, queueType as MarketplaceQueueType, jobId as string),
    enabled: !!workspaceId && !!queueType && !!jobId,
  });
}

export function useMarketplaceJobHistory(jobId: string | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'job-history', workspaceId, jobId],
    queryFn: () => queueService.getMarketplaceJobHistory(workspaceId as string, jobId as string),
    enabled: !!workspaceId && !!jobId,
  });
}

function invalidateJobs(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [KEY, 'jobs'] });
  queryClient.invalidateQueries({ queryKey: [KEY, 'metrics'] });
  queryClient.invalidateQueries({ queryKey: [KEY, 'aggregated'] });
}

export function useRetryMarketplaceJob() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RetryMarketplaceJobPayload) => queueService.retryMarketplaceJob(payload),
    onSuccess: () => {
      invalidateJobs(queryClient);
      toast.success('Job retry initiated');
    },
    onError: () => toast.error('Could not retry job', 'Please try again.'),
  });
}

export function useCancelMarketplaceJob() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CancelMarketplaceJobPayload) => queueService.cancelMarketplaceJob(payload),
    onSuccess: () => {
      invalidateJobs(queryClient);
      toast.success('Job cancelled');
    },
    onError: () => toast.error('Could not cancel job', 'Please try again.'),
  });
}

export function useRecoverStaleMarketplaceJobs() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RecoverStaleMarketplaceJobsPayload) => queueService.recoverStaleMarketplaceJobs(payload),
    onSuccess: (result) => {
      invalidateJobs(queryClient);
      toast.success(result.message ?? 'Stale jobs recovered');
    },
    onError: () => toast.error('Could not recover stale jobs', 'Please try again.'),
  });
}

function invalidateQueueControl(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [KEY, 'metrics'] });
  queryClient.invalidateQueries({ queryKey: [KEY, 'health'] });
  queryClient.invalidateQueries({ queryKey: [KEY, 'aggregated'] });
}

export function usePauseMarketplaceQueue() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (queueType: MarketplaceQueueType) => queueService.pauseMarketplaceQueue(queueType),
    onSuccess: () => {
      invalidateQueueControl(queryClient);
      toast.success('Queue paused');
    },
    onError: () => toast.error('Could not pause queue', 'Please try again.'),
  });
}

export function useResumeMarketplaceQueue() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (queueType: MarketplaceQueueType) => queueService.resumeMarketplaceQueue(queueType),
    onSuccess: () => {
      invalidateQueueControl(queryClient);
      toast.success('Queue resumed');
    },
    onError: () => toast.error('Could not resume queue', 'Please try again.'),
  });
}

export function useDrainMarketplaceQueue() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ queueType, delayed }: { queueType: MarketplaceQueueType; delayed?: boolean }) => queueService.drainMarketplaceQueue(queueType, delayed),
    onSuccess: () => {
      invalidateQueueControl(queryClient);
      invalidateJobs(queryClient);
      toast.success('Queue drained');
    },
    onError: () => toast.error('Could not drain queue', 'Please try again.'),
  });
}

export function useCleanMarketplaceQueue() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ queueType, grace, limit, type }: { queueType: MarketplaceQueueType; grace: number; limit: number; type: 'completed' | 'failed' }) =>
      queueService.cleanMarketplaceQueue(queueType, grace, limit, type),
    onSuccess: () => {
      invalidateQueueControl(queryClient);
      invalidateJobs(queryClient);
      toast.success('Queue cleaned');
    },
    onError: () => toast.error('Could not clean queue', 'Please try again.'),
  });
}

export function useMarketplaceQueueMetrics(queueType: MarketplaceQueueType | undefined) {
  return useQuery({
    queryKey: [KEY, 'metrics', queueType],
    queryFn: () => queueService.getMarketplaceQueueMetrics(queueType as MarketplaceQueueType),
    enabled: !!queueType,
    staleTime: 15 * 1000,
  });
}

export function useMarketplaceQueueHealth(queueType: MarketplaceQueueType | undefined) {
  return useQuery({
    queryKey: [KEY, 'health', queueType],
    queryFn: () => queueService.getMarketplaceQueueHealth(queueType as MarketplaceQueueType),
    enabled: !!queueType,
    staleTime: 15 * 1000,
  });
}

export function useAllMarketplaceQueueMetrics() {
  return useQuery({
    queryKey: [KEY, 'metrics', 'all'],
    queryFn: () => queueService.getAllMarketplaceQueueMetrics(),
    staleTime: 15 * 1000,
  });
}

export function useMarketplaceAggregatedMetrics(queueType: MarketplaceQueueType | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'aggregated', workspaceId, queueType],
    queryFn: () => queueService.getMarketplaceAggregatedMetrics(workspaceId as string, queueType as MarketplaceQueueType),
    enabled: !!workspaceId && !!queueType,
    staleTime: 15 * 1000,
  });
}

export function useAllMarketplaceAggregatedMetrics() {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'aggregated', 'all', workspaceId],
    queryFn: () => queueService.getAllMarketplaceAggregatedMetrics(workspaceId as string),
    enabled: !!workspaceId,
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useMarketplaceQueueErrorSummary(queueType: MarketplaceQueueType | undefined, startDate: string | undefined, endDate: string | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'error-summary', workspaceId, queueType, startDate, endDate],
    queryFn: () => queueService.getMarketplaceQueueErrorSummary(workspaceId as string, queueType as MarketplaceQueueType, startDate as string, endDate as string),
    enabled: !!workspaceId && !!queueType && !!startDate && !!endDate,
  });
}

export function useMarketplaceDeadLetterJobs(queueType?: MarketplaceQueueType) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'dead-letter', workspaceId, queueType],
    queryFn: () => queueService.getMarketplaceDeadLetterJobs(workspaceId as string, queueType),
    enabled: !!workspaceId,
    staleTime: 15 * 1000,
  });
}

export function useReprocessMarketplaceDeadLetterJob() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ReprocessMarketplaceDeadLetterJobPayload) => queueService.reprocessMarketplaceDeadLetterJob(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'dead-letter'] });
      invalidateJobs(queryClient);
      toast.success('Dead-letter job reprocessing initiated');
    },
    onError: () => toast.error('Could not reprocess job', 'Please try again.'),
  });
}

export function useMarketplaceRateLimitConfig(provider: string | undefined, queueType: MarketplaceQueueType | undefined, accountId?: string) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'rate-limit', workspaceId, provider, queueType, accountId],
    queryFn: () => queueService.getMarketplaceRateLimitConfig(workspaceId as string, provider as string, queueType as MarketplaceQueueType, accountId),
    enabled: !!workspaceId && !!provider && !!queueType,
  });
}

export function useCreateMarketplaceRateLimitConfig() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: SetMarketplaceRateLimitPayload) => queueService.createMarketplaceRateLimitConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'rate-limit'] });
      toast.success('Rate limit configured');
    },
    onError: () => toast.error('Could not create rate limit config', 'Please try again.'),
  });
}

export function useUpdateMarketplaceRateLimitConfig() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: SetMarketplaceRateLimitPayload) => queueService.updateMarketplaceRateLimitConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'rate-limit'] });
      toast.success('Rate limit updated');
    },
    onError: () => toast.error('Could not update rate limit config', 'Please try again.'),
  });
}
