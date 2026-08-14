import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as healthService from '@/services/enterprise-health.service';
import { QUERY_KEYS } from '@/constants';
import { useToast } from './use-toast';
import type { EnterpriseHealthIncidentFilterParams, RunEnterpriseHealthSweepPayload } from '@/types';

export function usePlatformHealthDashboard() {
  return useQuery({
    queryKey: ['enterprise-health', 'platform'],
    queryFn: () => healthService.getPlatformDashboard(),
    staleTime: 30 * 1000,
  });
}

export function useOrganizationHealthDashboard(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['enterprise-health', 'organization', organizationId],
    queryFn: () => healthService.getOrganizationDashboard(organizationId as string),
    enabled: !!organizationId,
    staleTime: 30 * 1000,
  });
}

export function useBusinessHealthDashboard(organizationId: string | undefined, businessId: string | undefined) {
  return useQuery({
    queryKey: ['enterprise-health', 'business', organizationId, businessId],
    queryFn: () => healthService.getBusinessDashboard(organizationId as string, businessId as string),
    enabled: !!organizationId && !!businessId,
  });
}

export function useWorkspaceScopedHealthDashboard(organizationId: string | undefined, targetWorkspaceId: string | undefined) {
  return useQuery({
    queryKey: ['enterprise-health', 'workspace', organizationId, targetWorkspaceId],
    queryFn: () => healthService.getWorkspaceScopedDashboard(organizationId as string, targetWorkspaceId as string),
    enabled: !!organizationId && !!targetWorkspaceId,
  });
}

export function useRegionHealthDashboard(organizationId: string | undefined, region: string | undefined) {
  return useQuery({
    queryKey: ['enterprise-health', 'region', organizationId, region],
    queryFn: () => healthService.getRegionDashboard(organizationId as string, region as string),
    enabled: !!organizationId && !!region,
  });
}

export function useProviderHealthDashboard(organizationId: string | undefined, provider: string | undefined) {
  return useQuery({
    queryKey: ['enterprise-health', 'provider', organizationId, provider],
    queryFn: () => healthService.getProviderDashboard(organizationId as string, provider as string),
    enabled: !!organizationId && !!provider,
  });
}

export function useRunEnterpriseHealthSweep(organizationId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RunEnterpriseHealthSweepPayload = {}) => healthService.runEnterpriseHealthDetectionSweep(organizationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ENTERPRISE_HEALTH_INCIDENTS] });
      queryClient.invalidateQueries({ queryKey: ['enterprise-health'] });
      toast.success('Detection sweep completed');
    },
    onError: () => toast.error('Could not run detection sweep', 'Please try again.'),
  });
}

export function useEnterpriseHealthIncidents(organizationId: string | undefined, params: EnterpriseHealthIncidentFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.ENTERPRISE_HEALTH_INCIDENTS, organizationId, params],
    queryFn: () => healthService.listEnterpriseHealthIncidents(organizationId as string, params),
    enabled: !!organizationId,
    staleTime: 15 * 1000,
  });
}

export function useEnterpriseHealthIncident(organizationId: string | undefined, id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.ENTERPRISE_HEALTH_INCIDENTS, organizationId, id],
    queryFn: () => healthService.getEnterpriseHealthIncident(organizationId as string, id as string),
    enabled: !!organizationId && !!id,
  });
}

function invalidateEnterpriseIncidents(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ENTERPRISE_HEALTH_INCIDENTS] });
}

export function useAcknowledgeEnterpriseHealthIncident(organizationId: string, id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => healthService.acknowledgeEnterpriseHealthIncident(organizationId, id),
    onSuccess: () => {
      invalidateEnterpriseIncidents(queryClient);
      toast.success('Incident acknowledged');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useResolveEnterpriseHealthIncident(organizationId: string, id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason: string) => healthService.resolveEnterpriseHealthIncident(organizationId, id, reason),
    onSuccess: () => {
      invalidateEnterpriseIncidents(queryClient);
      toast.success('Incident resolved');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}
