import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as opsHealthService from '@/services/operations-health.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type { CheckLogFilterParams, IncidentFilterParams, OperationsHealthModuleKey } from '@/types';

const OPS_HEALTH_KEY = 'operations-health';

export function useOperationsWorkspaceHealthSummary() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [OPS_HEALTH_KEY, 'summary'],
    queryFn: opsHealthService.getOperationsWorkspaceHealthSummary,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useOperationsHealthIncidents(params: IncidentFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [OPS_HEALTH_KEY, 'incidents', params],
    queryFn: () => opsHealthService.getIncidents(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useOperationsHealthCheckLogs(params: CheckLogFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [OPS_HEALTH_KEY, 'check-logs', params],
    queryFn: () => opsHealthService.getCheckLogs(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useCheckAllModulesHealth() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: opsHealthService.checkAllModules,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [OPS_HEALTH_KEY] });
      toast.success('Health check complete');
    },
    onError: () => toast.error('Health check failed', 'Please try again.'),
  });
}

export function useCheckModuleHealth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (module: OperationsHealthModuleKey) => opsHealthService.checkModule(module),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [OPS_HEALTH_KEY] }),
  });
}
