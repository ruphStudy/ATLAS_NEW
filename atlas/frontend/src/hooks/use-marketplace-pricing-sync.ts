import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as priceSyncService from '@/services/marketplace-pricing-sync.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type {
  CreatePriceSyncSchedulePayload,
  PriceConflictFilterParams,
  PriceExternalRefFilterParams,
  PriceSyncItemResultFilterParams,
  PriceSyncJobFilterParams,
  StartPriceSyncPayload,
  UpdatePriceSyncSchedulePayload,
} from '@/types';
import { useToast } from './use-toast';

function useWorkspaceId(): string | undefined {
  return useAuthStore((s) => s.user?.workspaceId);
}

export function usePriceSyncJobs(params: Omit<PriceSyncJobFilterParams, 'workspaceId'> = {}) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.PRICE_SYNC_JOBS, workspaceId, params],
    queryFn: () => priceSyncService.listPriceSyncJobs({ ...params, workspaceId }),
    enabled: !!workspaceId,
    staleTime: 15 * 1000,
  });
}

export function usePriceSyncJob(jobId: string | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.PRICE_SYNC_JOBS, workspaceId, jobId],
    queryFn: () => priceSyncService.getPriceSyncJob(jobId as string, workspaceId as string),
    enabled: !!jobId && !!workspaceId,
  });
}

export function usePriceSyncItemResults(jobId: string | undefined, params: PriceSyncItemResultFilterParams = {}) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.PRICE_SYNC_JOBS, workspaceId, jobId, 'items', params],
    queryFn: () => priceSyncService.getPriceSyncItemResults(jobId as string, workspaceId as string, params),
    enabled: !!jobId && !!workspaceId,
  });
}

export function useStartPriceSync() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: Omit<StartPriceSyncPayload, 'workspaceId'>) => priceSyncService.startPriceSync({ ...payload, workspaceId: workspaceId ?? '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRICE_SYNC_JOBS] });
      toast.success('Price sync started');
    },
    onError: () => toast.error('Could not start sync', 'Please try again.'),
  });
}

export function useCancelPriceSync() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();
  const toast = useToast();
  return useMutation({
    mutationFn: (jobId: string) => priceSyncService.cancelPriceSync(jobId, workspaceId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRICE_SYNC_JOBS] });
      toast.success('Sync cancelled');
    },
    onError: () => toast.error('Could not cancel sync', 'Please try again.'),
  });
}

export function useRetryFailedPriceItems() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: { originalJobId: string; metadata?: Record<string, unknown> }) =>
      priceSyncService.retryFailedPriceItems({ ...payload, workspaceId: workspaceId ?? '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRICE_SYNC_JOBS] });
      toast.success('Retry job started');
    },
    onError: () => toast.error('Could not retry failed items', 'Please try again.'),
  });
}

export function usePriceExternalRefs(accountId: string | undefined, params: PriceExternalRefFilterParams = {}) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.PRICE_EXTERNAL_REFS, workspaceId, accountId, params],
    queryFn: () => priceSyncService.getPriceExternalRefs(workspaceId as string, accountId as string, params),
    enabled: !!workspaceId && !!accountId,
  });
}

export function usePriceConflicts(params: PriceConflictFilterParams = {}) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.PRICE_SYNC_CONFLICTS, workspaceId, params],
    queryFn: () => priceSyncService.getPriceConflicts(workspaceId as string, params),
    enabled: !!workspaceId,
    staleTime: 15 * 1000,
  });
}

export function useResolvePriceConflict() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ conflictId, resolution, resolvedBy, notes }: { conflictId: string; resolution: string; resolvedBy: string; notes?: string }) =>
      priceSyncService.resolvePriceConflict(conflictId, workspaceId as string, resolution, resolvedBy, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRICE_SYNC_CONFLICTS] });
      toast.success('Conflict resolved');
    },
    onError: () => toast.error('Could not resolve conflict', 'Please try again.'),
  });
}

export function usePriceSyncSchedules() {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.PRICE_SYNC_SCHEDULES, workspaceId],
    queryFn: () => priceSyncService.getPriceSyncSchedules(workspaceId as string),
    enabled: !!workspaceId,
  });
}

export function useCreatePriceSyncSchedule() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: Omit<CreatePriceSyncSchedulePayload, 'workspaceId'>) => priceSyncService.createPriceSyncSchedule({ ...payload, workspaceId: workspaceId ?? '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRICE_SYNC_SCHEDULES] });
      toast.success('Schedule created');
    },
    onError: () => toast.error('Could not create schedule', 'Please try again.'),
  });
}

export function useUpdatePriceSyncSchedule(scheduleId: string) {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdatePriceSyncSchedulePayload) => priceSyncService.updatePriceSyncSchedule(scheduleId, workspaceId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRICE_SYNC_SCHEDULES] });
      toast.success('Schedule updated');
    },
    onError: () => toast.error('Could not update schedule', 'Please try again.'),
  });
}

export function useDeletePriceSyncSchedule() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();
  const toast = useToast();
  return useMutation({
    mutationFn: (scheduleId: string) => priceSyncService.deletePriceSyncSchedule(scheduleId, workspaceId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRICE_SYNC_SCHEDULES] });
      toast.success('Schedule deleted');
    },
    onError: () => toast.error('Could not delete schedule', 'Please try again.'),
  });
}

export function usePriceSyncMetrics(accountId?: string) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [QUERY_KEYS.PRICE_SYNC_METRICS, workspaceId, accountId],
    queryFn: () => priceSyncService.getPriceSyncMetrics(workspaceId as string, accountId),
    enabled: !!workspaceId,
    staleTime: 30 * 1000,
  });
}
