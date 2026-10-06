import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as auditService from '@/services/marketplace-audit.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type { MarketplaceActivitySearchParams } from '@/types';

const KEY = 'marketplace-audit';

function useWorkspaceId() {
  return useAuthStore((s) => s.user?.workspaceId);
}

export function useMarketplaceActivitySearch(params: Omit<MarketplaceActivitySearchParams, 'workspaceId'>) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'search', workspaceId, params],
    queryFn: () => auditService.searchMarketplaceActivities({ ...params, workspaceId: workspaceId as string }),
    enabled: !!workspaceId,
    staleTime: 15 * 1000,
  });
}

export function useMarketplaceActivityTimeline(startDate: string | undefined, endDate: string | undefined, provider?: string, accountId?: string, limit?: number) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'timeline', workspaceId, startDate, endDate, provider, accountId, limit],
    queryFn: () => auditService.getMarketplaceActivityTimeline(workspaceId as string, startDate as string, endDate as string, provider, accountId, limit),
    enabled: !!workspaceId && !!startDate && !!endDate,
  });
}

export function useCorrelatedMarketplaceActivities(correlationId: string | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'correlated', workspaceId, correlationId],
    queryFn: () => auditService.getCorrelatedMarketplaceActivities(workspaceId as string, correlationId as string),
    enabled: !!workspaceId && !!correlationId,
  });
}

export function useMarketplaceAuditStatistics(startDate: string | undefined, endDate: string | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'statistics', workspaceId, startDate, endDate],
    queryFn: () => auditService.getMarketplaceAuditStatistics(workspaceId as string, startDate as string, endDate as string),
    enabled: !!workspaceId && !!startDate && !!endDate,
  });
}

export function useSuspiciousMarketplaceActivities(isResolved?: boolean) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'suspicious', workspaceId, isResolved],
    queryFn: () => auditService.getSuspiciousMarketplaceActivities(workspaceId as string, isResolved),
    enabled: !!workspaceId,
    staleTime: 30 * 1000,
  });
}

export function useResolveSuspiciousMarketplaceActivity() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (suspiciousActivityId: string) => auditService.resolveSuspiciousMarketplaceActivity(workspaceId as string, suspiciousActivityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'suspicious'] });
      toast.success('Suspicious activity resolved');
    },
    onError: () => toast.error('Could not resolve activity', 'Please try again.'),
  });
}
