import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as saasMonitoringService from '@/services/saas-monitoring.service';
import { QUERY_KEYS } from '@/constants';
import type { SaasHealthCheckLogFilterParams, SaasHealthIncidentFilterParams, SaasHealthModuleKey } from '@/types';
import { useToast } from './use-toast';

export function useCheckAllModules() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => saasMonitoringService.checkAllModules(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SAAS_MONITORING] });
      toast.success('Health check triggered');
    },
    onError: () => toast.error('Check failed', 'Please try again.'),
  });
}

export function useCheckModule() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (module: SaasHealthModuleKey) => saasMonitoringService.checkModule(module),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SAAS_MONITORING] });
      toast.success('Module check triggered');
    },
    onError: () => toast.error('Check failed', 'Please try again.'),
  });
}

export function useTenantHealthSummary() {
  return useQuery({
    queryKey: [QUERY_KEYS.SAAS_MONITORING, 'tenant-summary'],
    queryFn: () => saasMonitoringService.getTenantHealthSummary(),
  });
}

export function useModuleSnapshot(module: SaasHealthModuleKey | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.SAAS_MONITORING, 'module', module],
    queryFn: () => saasMonitoringService.getModuleSnapshot(module as SaasHealthModuleKey),
    enabled: !!module,
  });
}

export function useSaasMonitoringIncidents(filter: SaasHealthIncidentFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.SAAS_MONITORING_INCIDENTS, filter],
    queryFn: () => saasMonitoringService.getIncidents(filter),
    staleTime: 30 * 1000,
  });
}

export function useSaasMonitoringIncident(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.SAAS_MONITORING_INCIDENTS, id],
    queryFn: () => saasMonitoringService.getIncidentById(id as string),
    enabled: !!id,
  });
}

export function useSaasHealthCheckLogs(filter: SaasHealthCheckLogFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.SAAS_MONITORING, 'check-logs', filter],
    queryFn: () => saasMonitoringService.getCheckLogs(filter),
  });
}

export function usePlatformHealthSummary() {
  return useQuery({
    queryKey: [QUERY_KEYS.SAAS_MONITORING, 'platform-summary'],
    queryFn: () => saasMonitoringService.getPlatformSummary(),
    staleTime: 30 * 1000,
  });
}

export function usePlatformIncidents(filter: SaasHealthIncidentFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.SAAS_MONITORING_INCIDENTS, 'platform', filter],
    queryFn: () => saasMonitoringService.getIncidentsPlatformWide(filter),
  });
}
