import { useQuery } from '@tanstack/react-query';
import * as auditLogsService from '@/services/audit-logs.service';
import { listAuditLogs } from '@/services/audit-logs.service';
import type { AuditLogFilterParams } from '@/types';

export function useAuditLogs(params: AuditLogFilterParams = {}, enabled = true) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => listAuditLogs(params),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useAuditLogDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['audit-logs', 'detail', id],
    queryFn: () => auditLogsService.getAuditLogById(id as string),
    enabled: !!id,
  });
}

export function useEntityAuditHistory(entityType: string | undefined, entityId: string | undefined, params: AuditLogFilterParams = {}) {
  return useQuery({
    queryKey: ['audit-logs', 'entity', entityType, entityId, params],
    queryFn: () => auditLogsService.getEntityAuditHistory(entityType as string, entityId as string, params),
    enabled: !!entityType && !!entityId,
    staleTime: 30 * 1000,
  });
}

export function useActorAuditHistory(actorId: string | undefined, params: AuditLogFilterParams = {}) {
  return useQuery({
    queryKey: ['audit-logs', 'actor', actorId, params],
    queryFn: () => auditLogsService.getActorAuditHistory(actorId as string, params),
    enabled: !!actorId,
    staleTime: 30 * 1000,
  });
}
