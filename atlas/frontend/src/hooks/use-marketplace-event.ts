import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as eventService from '@/services/marketplace-event.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type { MarketplaceEventFilterParams } from '@/types';

const KEY = 'marketplace-event';

function useWorkspaceId() {
  return useAuthStore((s) => s.user?.workspaceId);
}

export function useMarketplaceEvents(params: Omit<MarketplaceEventFilterParams, 'workspaceId'> = {}) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'list', workspaceId, params],
    queryFn: () => eventService.listMarketplaceEvents({ ...params, workspaceId }),
    enabled: !!workspaceId,
    staleTime: 15 * 1000,
  });
}

export function useMarketplaceEvent(eventId: string | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'detail', workspaceId, eventId],
    queryFn: () => eventService.getMarketplaceEvent(workspaceId as string, eventId as string),
    enabled: !!workspaceId && !!eventId,
  });
}

export function useMarketplaceEventHistory(eventId: string | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'history', workspaceId, eventId],
    queryFn: () => eventService.getMarketplaceEventHistory(workspaceId as string, eventId as string),
    enabled: !!workspaceId && !!eventId,
  });
}

export function useFailedMarketplaceEvents(accountId?: string, limit?: number) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'failed', workspaceId, accountId, limit],
    queryFn: () => eventService.getFailedMarketplaceEvents(workspaceId as string, accountId, limit),
    enabled: !!workspaceId,
    staleTime: 15 * 1000,
  });
}

export function usePendingMarketplaceEvents(accountId?: string, limit?: number) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'pending', workspaceId, accountId, limit],
    queryFn: () => eventService.getPendingMarketplaceEvents(workspaceId as string, accountId, limit),
    enabled: !!workspaceId,
    staleTime: 15 * 1000,
  });
}

export function useMarketplaceEventMetrics(accountId?: string) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'metrics', workspaceId, accountId],
    queryFn: () => eventService.getMarketplaceEventMetrics(workspaceId as string, accountId),
    enabled: !!workspaceId,
    staleTime: 30 * 1000,
  });
}

function invalidateEvents(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [KEY] });
}

export function useReprocessMarketplaceEvent() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (eventId: string) => eventService.reprocessMarketplaceEvent(workspaceId as string, eventId),
    onSuccess: () => {
      invalidateEvents(queryClient);
      toast.success('Event reprocessing initiated');
    },
    onError: () => toast.error('Could not reprocess event', 'Please try again.'),
  });
}

export function useCancelMarketplaceEvent() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (eventId: string) => eventService.cancelMarketplaceEvent(workspaceId as string, eventId),
    onSuccess: () => {
      invalidateEvents(queryClient);
      toast.success('Event cancelled');
    },
    onError: () => toast.error('Could not cancel event', 'Please try again.'),
  });
}
