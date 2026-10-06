import { apiClient } from '@/lib/api/axios';
import type {
  AdminActionLogFilterParams,
  AdminActionLogListResult,
  CreateAuditArchivePayload,
  DetectionSweepResult,
  ExportAuditTrailParams,
  ImpersonationSessionFilterParams,
  ImpersonationSessionListResult,
  RetentionPurgeResult,
  SaasAuditArchive,
  SaasAuditArchiveFilterParams,
  SaasAuditArchiveListResult,
  SaasAuditExportResult,
  SaasAuditReasonPayload,
  SaasAuditTrailFilterParams,
  SaasAuditTrailListResult,
  SaasIncidentFilterParams,
  SaasSecurityIncident,
  SaasSecurityIncidentListResult,
} from '@/types';

const BASE = '/saas-audit';

export async function searchAuditTrail(filter: SaasAuditTrailFilterParams = {}): Promise<SaasAuditTrailListResult> {
  const { data } = await apiClient.get<SaasAuditTrailListResult>(`${BASE}/trail`, { params: filter });
  return data;
}

export async function exportAuditTrail(params: ExportAuditTrailParams): Promise<SaasAuditExportResult> {
  const { data } = await apiClient.get<SaasAuditExportResult>(`${BASE}/trail/export`, { params });
  return data;
}

export async function searchAdminActions(filter: AdminActionLogFilterParams = {}): Promise<AdminActionLogListResult> {
  const { data } = await apiClient.get<AdminActionLogListResult>(`${BASE}/admin-actions`, { params: filter });
  return data;
}

export async function listImpersonationSessions(filter: ImpersonationSessionFilterParams = {}): Promise<ImpersonationSessionListResult> {
  const { data } = await apiClient.get<ImpersonationSessionListResult>(`${BASE}/impersonation-sessions`, { params: filter });
  return data;
}

export async function runDetectionSweep(workspaceId?: string): Promise<DetectionSweepResult> {
  const { data } = await apiClient.post<DetectionSweepResult>(`${BASE}/detection/sweep`, undefined, { params: { workspaceId } });
  return data;
}

export async function listSecurityIncidents(filter: SaasIncidentFilterParams = {}): Promise<SaasSecurityIncidentListResult> {
  const { data } = await apiClient.get<SaasSecurityIncidentListResult>(`${BASE}/incidents`, { params: filter });
  return data;
}

export async function getSecurityIncidentById(id: string): Promise<SaasSecurityIncident> {
  const { data } = await apiClient.get<SaasSecurityIncident>(`${BASE}/incidents/${id}`);
  return data;
}

export async function acknowledgeSecurityIncident(id: string): Promise<SaasSecurityIncident> {
  const { data } = await apiClient.post<SaasSecurityIncident>(`${BASE}/incidents/${id}/acknowledge`);
  return data;
}

export async function resolveSecurityIncident(id: string, payload: SaasAuditReasonPayload): Promise<SaasSecurityIncident> {
  const { data } = await apiClient.post<SaasSecurityIncident>(`${BASE}/incidents/${id}/resolve`, payload);
  return data;
}

export async function dismissSecurityIncident(id: string, payload: SaasAuditReasonPayload): Promise<SaasSecurityIncident> {
  const { data } = await apiClient.post<SaasSecurityIncident>(`${BASE}/incidents/${id}/dismiss`, payload);
  return data;
}

export async function createAuditArchive(payload: CreateAuditArchivePayload): Promise<SaasAuditArchive> {
  const { data } = await apiClient.post<SaasAuditArchive>(`${BASE}/archives`, payload);
  return data;
}

export async function listAuditArchives(filter: SaasAuditArchiveFilterParams = {}): Promise<SaasAuditArchiveListResult> {
  const { data } = await apiClient.get<SaasAuditArchiveListResult>(`${BASE}/archives`, { params: filter });
  return data;
}

export async function getAuditArchiveById(id: string): Promise<SaasAuditArchive> {
  const { data } = await apiClient.get<SaasAuditArchive>(`${BASE}/archives/${id}`);
  return data;
}

export async function downloadAuditArchive(id: string): Promise<Blob> {
  const { data } = await apiClient.get(`${BASE}/archives/${id}/download`, { responseType: 'blob' });
  return data;
}

export async function purgeRetention(retentionDays?: number): Promise<RetentionPurgeResult> {
  const { data } = await apiClient.post<RetentionPurgeResult>(`${BASE}/retention/purge`, undefined, { params: { retentionDays } });
  return data;
}
