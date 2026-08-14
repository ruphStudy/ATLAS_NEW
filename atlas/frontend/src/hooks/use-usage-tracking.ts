import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as usageService from '@/services/usage-tracking.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type { AdjustResourceUsagePayload, ResourceUsageBreakdownFilterParams, ResourceUsageFilterParams, ReverseResourceUsagePayload } from '@/types';

const USAGE_KEY = 'usage-tracking';

export function useResourceUsageSummary(resourceKey?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [USAGE_KEY, 'summary', resourceKey],
    queryFn: () => usageService.getUsageSummary(resourceKey),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useResourceUsageEntitlementComparison(resourceKey: string | undefined) {
  return useQuery({
    queryKey: [USAGE_KEY, 'entitlement', resourceKey],
    queryFn: () => usageService.compareUsageToEntitlement(resourceKey as string),
    enabled: !!resourceKey,
  });
}

export function useResourceUsageBreakdown(params: ResourceUsageBreakdownFilterParams | undefined) {
  return useQuery({
    queryKey: [USAGE_KEY, 'breakdown', params],
    queryFn: () => usageService.getUsageBreakdown(params as ResourceUsageBreakdownFilterParams),
    enabled: !!params?.resourceKey && !!params?.startDate && !!params?.endDate,
  });
}

export function useResourceUsageRecords(params: ResourceUsageFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [USAGE_KEY, 'records', params],
    queryFn: () => usageService.listUsageRecords(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useResourceUsageRecord(id: string | undefined) {
  return useQuery({
    queryKey: [USAGE_KEY, 'record', id],
    queryFn: () => usageService.getUsageRecord(id as string),
    enabled: !!id,
  });
}

function invalidateUsage(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [USAGE_KEY] });
}

export function useReverseResourceUsageRecord(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ReverseResourceUsagePayload) => usageService.reverseUsageRecord(id, payload),
    onSuccess: () => {
      invalidateUsage(queryClient);
      toast.success('Usage record reversed');
    },
    onError: () => toast.error('Could not reverse usage record', 'Please try again.'),
  });
}

export function useAdjustResourceUsageRecord(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: AdjustResourceUsagePayload) => usageService.adjustUsageRecord(id, payload),
    onSuccess: () => {
      invalidateUsage(queryClient);
      toast.success('Usage adjusted');
    },
    onError: () => toast.error('Could not adjust usage', 'Please try again.'),
  });
}
