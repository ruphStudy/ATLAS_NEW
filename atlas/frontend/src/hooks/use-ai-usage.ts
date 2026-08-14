import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as usageService from '@/services/ai-usage.service';
import { QUERY_KEYS } from '@/constants';
import type {
  AiUsageRecordFilterParams,
  CreateUsageQuotaPayload,
  UpdateUsageQuotaPayload,
  UsageBreakdownFilterParams,
  UsageQuotaFilterParams,
  UsageSummaryFilterParams,
} from '@/types';
import { useToast } from './use-toast';

export function useUsageRecords(params: AiUsageRecordFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_USAGE_RECORDS, params],
    queryFn: () => usageService.listUsageRecords(params),
    enabled: !!params.workspaceId,
    staleTime: 15 * 1000,
  });
}

export function useUsageRecord(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_USAGE_RECORDS, id],
    queryFn: () => usageService.getUsageRecordById(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useUsageSummary(params: UsageSummaryFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_USAGE_SUMMARY, params],
    queryFn: () => usageService.getUsageSummary(params),
    enabled: !!params.workspaceId,
  });
}

export function useUsageBreakdown(params: UsageBreakdownFilterParams | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_USAGE_SUMMARY, 'breakdown', params],
    queryFn: () => usageService.getUsageBreakdown(params!),
    enabled: !!params?.workspaceId,
  });
}

export function useReconcileUsage() {
  const toast = useToast();
  return useMutation({
    mutationFn: ({ workspaceId, startDate, endDate }: { workspaceId: string; startDate?: string; endDate?: string }) => usageService.reconcileUsage(workspaceId, startDate, endDate),
    onError: () => toast.error('Reconciliation failed', 'Please try again.'),
  });
}

export function useUsageQuotas(params: UsageQuotaFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_USAGE_QUOTAS, params],
    queryFn: () => usageService.listUsageQuotas(params),
    enabled: !!params.workspaceId,
  });
}

export function useUsageQuota(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_USAGE_QUOTAS, id],
    queryFn: () => usageService.getUsageQuotaById(id as string),
    enabled: !!id,
  });
}

export function useCreateUsageQuota() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateUsageQuotaPayload) => usageService.createUsageQuota(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_USAGE_QUOTAS] });
      toast.success('Quota created');
    },
    onError: () => toast.error('Could not create quota', 'Please try again.'),
  });
}

export function useUpdateUsageQuota(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateUsageQuotaPayload) => usageService.updateUsageQuota(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_USAGE_QUOTAS] });
      toast.success('Quota updated');
    },
    onError: () => toast.error('Could not update quota', 'Please try again.'),
  });
}

export function useDeleteUsageQuota() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => usageService.deleteUsageQuota(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_USAGE_QUOTAS] });
      toast.success('Quota deleted');
    },
    onError: () => toast.error('Could not delete quota', 'Please try again.'),
  });
}

export function useUsageQuotaAlerts(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_USAGE_QUOTAS, id, 'alerts'],
    queryFn: () => usageService.getUsageQuotaAlerts(id as string),
    enabled: !!id,
  });
}
