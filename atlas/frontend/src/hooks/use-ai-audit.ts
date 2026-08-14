import { useQuery } from '@tanstack/react-query';
import * as auditService from '@/services/ai-audit.service';
import { QUERY_KEYS } from '@/constants';
import type { AiAuditLogFilterParams, AiAuditTimelineParams } from '@/types';

export function useAiAuditLogs(params: AiAuditLogFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_AUDIT_LOGS, params],
    queryFn: () => auditService.listAiAuditLogs(params),
    enabled: !!params.workspaceId,
    staleTime: 15 * 1000,
  });
}

export function useAiAuditLog(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_AUDIT_LOGS, id],
    queryFn: () => auditService.getAiAuditLogById(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useAiAuditTimeline(params: AiAuditTimelineParams | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_AUDIT_LOGS, 'timeline', params],
    queryFn: () => auditService.getAiAuditTimeline(params!),
    enabled: !!params?.workspaceId && !!params?.entityId,
  });
}

export function useAiSuspiciousActivity(workspaceId: string | undefined, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_AUDIT_LOGS, 'suspicious', workspaceId, startDate, endDate],
    queryFn: () => auditService.listAiSuspiciousActivity(workspaceId as string, startDate, endDate),
    enabled: !!workspaceId,
  });
}

export function useAiAuditStats(workspaceId: string | undefined, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_AUDIT_LOGS, 'stats', workspaceId, startDate, endDate],
    queryFn: () => auditService.getAiAuditStats(workspaceId as string, startDate, endDate),
    enabled: !!workspaceId,
  });
}
