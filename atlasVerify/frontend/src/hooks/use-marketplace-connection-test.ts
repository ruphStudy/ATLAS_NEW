import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as connectionTestService from '@/services/marketplace-connection-test.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type { MarketplaceConnectionTestHistoryParams, MarketplaceConnectionTestRequest } from '@/types';

const KEY = 'marketplace-connection-test';

function useWorkspaceId() {
  return useAuthStore((s) => s.user?.workspaceId);
}

export function useMarketplaceConnectionTestHistory(params: Omit<MarketplaceConnectionTestHistoryParams, 'workspaceId'> = {}) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'history', workspaceId, params],
    queryFn: () => connectionTestService.getMarketplaceConnectionTestHistory({ ...params, workspaceId: workspaceId as string }),
    enabled: !!workspaceId,
    staleTime: 15 * 1000,
  });
}

export function useMarketplaceConnectionTestById(id: string | undefined) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: [KEY, 'result', workspaceId, id],
    queryFn: () => connectionTestService.getMarketplaceConnectionTestById(workspaceId as string, id as string),
    enabled: !!workspaceId && !!id,
  });
}

export function useTestMarketplaceConnection() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: Omit<MarketplaceConnectionTestRequest, 'workspaceId'>) => connectionTestService.testMarketplaceConnection({ ...payload, workspaceId: workspaceId as string }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'history'] });
      result.success ? toast.success('Connection test passed') : toast.error('Connection test failed', result.errorMessage);
    },
    onError: () => toast.error('Could not run connection test', 'Please try again.'),
  });
}

export function useTestAllMarketplaceConnections() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => connectionTestService.testAllMarketplaceConnections(workspaceId as string),
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: [KEY, 'history'] });
      const failed = results.filter((r) => !r.success).length;
      toast.success(failed > 0 ? `${results.length} providers tested, ${failed} failed` : `${results.length} providers tested — all passed`);
    },
    onError: () => toast.error('Could not run connection tests', 'Please try again.'),
  });
}
