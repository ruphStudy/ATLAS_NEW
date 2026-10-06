import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as monitoringService from '@/services/ai-monitoring.service';
import { QUERY_KEYS } from '@/constants';
import type { AiHealthCheckFilterParams, AiHealthIncidentFilterParams, HealthCheckRequestPayload, UpdateHealthIncidentPayload } from '@/types';
import { useToast } from './use-toast';

export function usePerformHealthCheck() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: HealthCheckRequestPayload) => monitoringService.performHealthCheck(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_HEALTH_CHECKS] });
      toast.success('Health check completed');
    },
    onError: () => toast.error('Health check failed', 'Please try again.'),
  });
}

export function useHealthChecks(params: AiHealthCheckFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_HEALTH_CHECKS, params],
    queryFn: () => monitoringService.listHealthChecks(params),
    enabled: !!params.workspaceId,
    staleTime: 15 * 1000,
  });
}

export function useHealthCheck(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_HEALTH_CHECKS, id],
    queryFn: () => monitoringService.getHealthCheckById(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useHealthIncidents(params: AiHealthIncidentFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_HEALTH_INCIDENTS, params],
    queryFn: () => monitoringService.listHealthIncidents(params),
    enabled: !!params.workspaceId,
  });
}

export function useHealthIncident(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_HEALTH_INCIDENTS, id],
    queryFn: () => monitoringService.getHealthIncidentById(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useUpdateHealthIncident(id: string, workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateHealthIncidentPayload) => monitoringService.updateHealthIncident(id, workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_HEALTH_INCIDENTS] });
      toast.success('Incident updated');
    },
    onError: () => toast.error('Could not update incident', 'Please try again.'),
  });
}

export function useResolveHealthIncident(id: string, workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => monitoringService.resolveHealthIncident(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_HEALTH_INCIDENTS] });
      toast.success('Incident resolved');
    },
    onError: () => toast.error('Could not resolve incident', 'Please try again.'),
  });
}

export function useProviderHealthSummary(workspaceId: string | undefined, provider: string | undefined, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_HEALTH_CHECKS, 'summary', 'provider', workspaceId, provider, startDate, endDate],
    queryFn: () => monitoringService.getProviderHealthSummary(workspaceId as string, provider as string, startDate, endDate),
    enabled: !!workspaceId && !!provider,
  });
}

export function useModelHealthSummary(workspaceId: string | undefined, provider: string | undefined, model: string | undefined, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_HEALTH_CHECKS, 'summary', 'model', workspaceId, provider, model, startDate, endDate],
    queryFn: () => monitoringService.getModelHealthSummary(workspaceId as string, provider as string, model as string, startDate, endDate),
    enabled: !!workspaceId && !!provider && !!model,
  });
}

export function useWorkspaceHealthSummary(workspaceId: string | undefined, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_HEALTH_CHECKS, 'summary', 'workspace', workspaceId, startDate, endDate],
    queryFn: () => monitoringService.getWorkspaceHealthSummary(workspaceId as string, startDate, endDate),
    enabled: !!workspaceId,
  });
}
