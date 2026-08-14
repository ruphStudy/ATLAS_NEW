import { useQuery } from '@tanstack/react-query';
import { getExecutiveOverview } from '@/services/executive-dashboard.service';
import { useAuthStore } from '@/stores';
import type { ExecutiveOverviewFilters } from '@/types';

export function useExecutiveOverview(filters: Omit<ExecutiveOverviewFilters, 'workspaceId'>, refetchIntervalMs?: number) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);

  return useQuery({
    queryKey: ['executive-dashboard-overview', workspaceId, filters],
    queryFn: () => getExecutiveOverview({ ...filters, workspaceId: workspaceId as string }),
    enabled: isAuthenticated && !!workspaceId,
    staleTime: 60 * 1000,
    refetchInterval: refetchIntervalMs && refetchIntervalMs > 0 ? refetchIntervalMs : false,
  });
}
