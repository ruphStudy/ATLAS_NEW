import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as saasAuditService from '@/services/saas-audit.service';
import { QUERY_KEYS } from '@/constants';
import type {
  AdminActionLogFilterParams,
  CreateAuditArchivePayload,
  ImpersonationSessionFilterParams,
  SaasAuditArchiveFilterParams,
  SaasAuditReasonPayload,
  SaasAuditTrailFilterParams,
  SaasIncidentFilterParams,
} from '@/types';
import { useToast } from './use-toast';

export function useSaasAuditTrail(filter: SaasAuditTrailFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.SAAS_AUDIT_TRAIL, filter],
    queryFn: () => saasAuditService.searchAuditTrail(filter),
    staleTime: 30 * 1000,
  });
}

export function useExportSaasAuditTrail() {
  const toast = useToast();
  return useMutation({
    mutationFn: saasAuditService.exportAuditTrail,
    onError: () => toast.error('Export failed', 'Please try again.'),
  });
}

export function useSaasAdminActions(filter: AdminActionLogFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.SAAS_ADMIN_ACTIONS, filter],
    queryFn: () => saasAuditService.searchAdminActions(filter),
    staleTime: 30 * 1000,
  });
}

export function useImpersonationSessions(filter: ImpersonationSessionFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.IMPERSONATION_SESSIONS, filter],
    queryFn: () => saasAuditService.listImpersonationSessions(filter),
    staleTime: 30 * 1000,
  });
}

export function useRunDetectionSweep() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (workspaceId?: string) => saasAuditService.runDetectionSweep(workspaceId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SAAS_SECURITY_INCIDENTS] });
      toast.success('Detection sweep complete', `${result.incidentsCreated} incident(s) created from ${result.scanned} scanned.`);
    },
    onError: () => toast.error('Sweep failed', 'Please try again.'),
  });
}

export function useSaasSecurityIncidents(filter: SaasIncidentFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.SAAS_SECURITY_INCIDENTS, filter],
    queryFn: () => saasAuditService.listSecurityIncidents(filter),
    staleTime: 30 * 1000,
  });
}

export function useSaasSecurityIncident(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.SAAS_SECURITY_INCIDENTS, id],
    queryFn: () => saasAuditService.getSecurityIncidentById(id as string),
    enabled: !!id,
  });
}

export function useAcknowledgeSecurityIncident(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => saasAuditService.acknowledgeSecurityIncident(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SAAS_SECURITY_INCIDENTS] });
      toast.success('Incident acknowledged');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useResolveSecurityIncident(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: SaasAuditReasonPayload) => saasAuditService.resolveSecurityIncident(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SAAS_SECURITY_INCIDENTS] });
      toast.success('Incident resolved');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useDismissSecurityIncident(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: SaasAuditReasonPayload) => saasAuditService.dismissSecurityIncident(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SAAS_SECURITY_INCIDENTS] });
      toast.success('Incident dismissed');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useCreateAuditArchive() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateAuditArchivePayload) => saasAuditService.createAuditArchive(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SAAS_AUDIT_ARCHIVES] });
      toast.success('Archive requested');
    },
    onError: () => toast.error('Could not create archive', 'Please try again.'),
  });
}

export function useSaasAuditArchives(filter: SaasAuditArchiveFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.SAAS_AUDIT_ARCHIVES, filter],
    queryFn: () => saasAuditService.listAuditArchives(filter),
    staleTime: 30 * 1000,
  });
}

export function useDownloadAuditArchive() {
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => saasAuditService.downloadAuditArchive(id),
    onError: () => toast.error('Download failed', 'Please try again.'),
  });
}

export function usePurgeRetention() {
  const toast = useToast();
  return useMutation({
    mutationFn: (retentionDays?: number) => saasAuditService.purgeRetention(retentionDays),
    onSuccess: (result) => toast.success('Retention purge complete', `${result.entriesPurged} entries purged across ${result.workspacesPurged} workspace(s).`),
    onError: () => toast.error('Purge failed', 'Please try again.'),
  });
}
