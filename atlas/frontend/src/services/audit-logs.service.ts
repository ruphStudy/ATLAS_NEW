import { apiClient } from '@/lib/api/axios';
import type { AuditExportResult, AuditLogEntry, AuditLogFilterParams, PaginatedResult } from '@/types';

const BASE = '/audit-logs';

export async function listAuditLogs(params: AuditLogFilterParams = {}): Promise<PaginatedResult<AuditLogEntry>> {
  const { data } = await apiClient.get<PaginatedResult<AuditLogEntry>>(BASE, { params });
  return data;
}

export async function getAuditLogById(id: string): Promise<AuditLogEntry> {
  const { data } = await apiClient.get<AuditLogEntry>(`${BASE}/${id}`);
  return data;
}

export async function getEntityAuditHistory(entityType: string, entityId: string, params: AuditLogFilterParams = {}): Promise<PaginatedResult<AuditLogEntry>> {
  const { data } = await apiClient.get<PaginatedResult<AuditLogEntry>>(`${BASE}/entities/${entityType}/${entityId}`, { params });
  return data;
}

export async function getActorAuditHistory(actorId: string, params: AuditLogFilterParams = {}): Promise<PaginatedResult<AuditLogEntry>> {
  const { data } = await apiClient.get<PaginatedResult<AuditLogEntry>>(`${BASE}/actors/${actorId}`, { params });
  return data;
}

export async function exportAuditLogs(params: AuditLogFilterParams & { format?: 'CSV' | 'JSON' } = {}): Promise<AuditExportResult> {
  const { data } = await apiClient.get<AuditExportResult>(`${BASE}/export`, { params });
  return data;
}
