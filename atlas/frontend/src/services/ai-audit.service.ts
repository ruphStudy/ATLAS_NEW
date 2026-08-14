import { apiClient } from '@/lib/api/axios';
import type { AiAuditLog, AiAuditLogFilterParams, AiAuditLogListResult, AiAuditStats, AiAuditTimelineParams } from '@/types';

const BASE = '/ai-audit-activity';

export async function listAiAuditLogs(params: AiAuditLogFilterParams): Promise<AiAuditLogListResult> {
  const { data } = await apiClient.get<AiAuditLogListResult>(`${BASE}/logs`, { params });
  return data;
}

export async function getAiAuditLogById(id: string, workspaceId: string): Promise<AiAuditLog> {
  const { data } = await apiClient.get<AiAuditLog>(`${BASE}/logs/${id}`, { params: { workspaceId } });
  return data;
}

export async function getAiAuditTimeline(params: AiAuditTimelineParams): Promise<AiAuditLog[]> {
  const { data } = await apiClient.get<AiAuditLog[]>(`${BASE}/timeline`, { params });
  return data;
}

export async function listAiSuspiciousActivity(workspaceId: string, startDate?: string, endDate?: string): Promise<AiAuditLog[]> {
  const { data } = await apiClient.get<AiAuditLog[]>(`${BASE}/suspicious`, { params: { workspaceId, startDate, endDate } });
  return data;
}

export async function getAiAuditStats(workspaceId: string, startDate?: string, endDate?: string): Promise<AiAuditStats> {
  const { data } = await apiClient.get<AiAuditStats>(`${BASE}/stats`, { params: { workspaceId, startDate, endDate } });
  return data;
}
