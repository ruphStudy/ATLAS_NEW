import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as monitoringService from '@/services/monitoring.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type {
  CreateMonitoringAlertRulePayload,
  CreateMonitoringSloPayload,
  MonitoringAlertRuleFilterParams,
  MonitoringIncidentFilterParams,
  MonitoringSloFilterParams,
  ResolveMonitoringIncidentPayload,
  UpdateMonitoringSloPayload,
} from '@/types';

export function useWorkspaceHealth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);

  return useQuery({
    queryKey: ['monitoring-workspace-dashboard', workspaceId],
    queryFn: () => monitoringService.getWorkspaceHealthDashboard(workspaceId as string),
    enabled: isAuthenticated && !!workspaceId,
    staleTime: 60 * 1000,
  });
}

export function usePlatformHealth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['monitoring-platform-dashboard'],
    queryFn: () => monitoringService.getPlatformHealthDashboard(),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useMonitoringSlos(params: MonitoringSloFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.MONITORING_SLOS, params],
    queryFn: () => monitoringService.listMonitoringSlos(params),
    staleTime: 30 * 1000,
  });
}

export function useMonitoringSlo(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.MONITORING_SLOS, id],
    queryFn: () => monitoringService.getMonitoringSloById(id as string),
    enabled: !!id,
  });
}

function invalidateSlos(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MONITORING_SLOS] });
}

export function useCreateMonitoringSlo() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateMonitoringSloPayload) => monitoringService.createMonitoringSlo(payload),
    onSuccess: () => {
      invalidateSlos(queryClient);
      toast.success('SLO created');
    },
    onError: () => toast.error('Could not create SLO', 'Please try again.'),
  });
}

export function useUpdateMonitoringSlo(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateMonitoringSloPayload) => monitoringService.updateMonitoringSlo(id, payload),
    onSuccess: () => {
      invalidateSlos(queryClient);
      toast.success('SLO updated');
    },
    onError: () => toast.error('Could not update SLO', 'Please try again.'),
  });
}

function useSloAction(id: string, action: (id: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(id),
    onSuccess: () => {
      invalidateSlos(queryClient);
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useActivateMonitoringSlo(id: string) {
  return useSloAction(id, monitoringService.activateMonitoringSlo, 'SLO activated');
}

export function usePauseMonitoringSlo(id: string) {
  return useSloAction(id, monitoringService.pauseMonitoringSlo, 'SLO paused');
}

export function useArchiveMonitoringSlo(id: string) {
  return useSloAction(id, monitoringService.archiveMonitoringSlo, 'SLO archived');
}

export function useRestoreMonitoringSlo(id: string) {
  return useSloAction(id, monitoringService.restoreMonitoringSlo, 'SLO restored');
}

export function useMonitoringAlertRules(params: MonitoringAlertRuleFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.MONITORING_ALERT_RULES, params],
    queryFn: () => monitoringService.listMonitoringAlertRules(params),
    staleTime: 30 * 1000,
  });
}

function invalidateAlertRules(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MONITORING_ALERT_RULES] });
}

export function useCreateMonitoringAlertRule() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateMonitoringAlertRulePayload) => monitoringService.createMonitoringAlertRule(payload),
    onSuccess: () => {
      invalidateAlertRules(queryClient);
      toast.success('Alert rule created');
    },
    onError: () => toast.error('Could not create alert rule', 'Please try again.'),
  });
}

export function useActivateMonitoringAlertRule(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => monitoringService.activateMonitoringAlertRule(id),
    onSuccess: () => {
      invalidateAlertRules(queryClient);
      toast.success('Alert rule activated');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function usePauseMonitoringAlertRule(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => monitoringService.pauseMonitoringAlertRule(id),
    onSuccess: () => {
      invalidateAlertRules(queryClient);
      toast.success('Alert rule paused');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useDetectCascadingFailures() {
  const toast = useToast();
  return useMutation({
    mutationFn: (workspaceId: string) => monitoringService.detectCascadingFailures(workspaceId),
    onError: () => toast.error('Could not run detection', 'Please try again.'),
  });
}

export function useMonitoringIncidents(params: MonitoringIncidentFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.MONITORING_INCIDENTS, params],
    queryFn: () => monitoringService.listMonitoringIncidents(params),
    staleTime: 15 * 1000,
  });
}

export function useMonitoringIncident(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.MONITORING_INCIDENTS, id],
    queryFn: () => monitoringService.getMonitoringIncidentById(id as string),
    enabled: !!id,
  });
}

function invalidateIncidents(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MONITORING_INCIDENTS] });
}

export function useAcknowledgeMonitoringIncident(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => monitoringService.acknowledgeMonitoringIncident(id),
    onSuccess: () => {
      invalidateIncidents(queryClient);
      toast.success('Incident acknowledged');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useResolveMonitoringIncident(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ResolveMonitoringIncidentPayload) => monitoringService.resolveMonitoringIncident(id, payload),
    onSuccess: () => {
      invalidateIncidents(queryClient);
      toast.success('Incident resolved');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useMonitoringCorrelationTrace(correlationId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.MONITORING_INCIDENTS, 'correlation', correlationId],
    queryFn: () => monitoringService.getMonitoringCorrelationTrace(correlationId as string),
    enabled: !!correlationId,
  });
}
