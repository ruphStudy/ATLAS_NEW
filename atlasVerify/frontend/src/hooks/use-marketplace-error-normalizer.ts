import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as errorService from '@/services/marketplace-error-normalizer.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type { MarketplaceErrorSearchParams } from '@/types';

const KEY = 'marketplace-error-normalizer';

function useWorkspaceId() {
  return useAuthStore((s) => s.user?.workspaceId);
}

export function useMarketplaceErrorSearch(params: Omit<MarketplaceErrorSearchParams, 'workspaceId'>) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'search', workspaceId, params],
    queryFn: () => errorService.searchMarketplaceErrors({ ...params, workspaceId: workspaceId as string }),
    enabled: !!workspaceId,
    staleTime: 15 * 1000,
  });
}

export function useTopMarketplaceErrors(limit?: number, startDate?: string, endDate?: string) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'top', workspaceId, limit, startDate, endDate],
    queryFn: () => errorService.getTopMarketplaceErrors(workspaceId as string, limit, startDate, endDate),
    enabled: !!workspaceId,
    staleTime: 30 * 1000,
  });
}

export function useMarketplaceErrorOccurrences(historyId: string | undefined, limit?: number) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'occurrences', workspaceId, historyId, limit],
    queryFn: () => errorService.getMarketplaceErrorOccurrences(workspaceId as string, historyId as string, limit),
    enabled: !!workspaceId && !!historyId,
  });
}

export function useResolveMarketplaceError() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (historyId: string) => errorService.resolveMarketplaceError(workspaceId as string, historyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'search'] });
      queryClient.invalidateQueries({ queryKey: [KEY, 'top'] });
      toast.success('Error marked as resolved');
    },
    onError: () => toast.error('Could not resolve error', 'Please try again.'),
  });
}

export function useMarketplaceErrorsByCategory(startDate: string | undefined, endDate: string | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'by-category', workspaceId, startDate, endDate],
    queryFn: () => errorService.aggregateMarketplaceErrorsByCategory(workspaceId as string, startDate as string, endDate as string),
    enabled: !!workspaceId && !!startDate && !!endDate,
  });
}

export function useMarketplaceErrorsBySeverity(startDate: string | undefined, endDate: string | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'by-severity', workspaceId, startDate, endDate],
    queryFn: () => errorService.aggregateMarketplaceErrorsBySeverity(workspaceId as string, startDate as string, endDate as string),
    enabled: !!workspaceId && !!startDate && !!endDate,
  });
}
