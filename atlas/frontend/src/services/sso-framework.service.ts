import { apiClient } from '@/lib/api/axios';
import type {
  CreateSsoGroupRoleMappingPayload,
  RegisterSsoConnectionPayload,
  RotateSsoCertificatePayload,
  RotateSsoClientSecretPayload,
  SsoConnection,
  SsoConnectionFilterParams,
  SsoConnectionListResult,
  SsoGroupRoleMapping,
  SsoHistoryEntry,
  UpdateSsoConnectionPayload,
  UpdateSsoGroupRoleMappingPayload,
} from '@/types';

const BASE = '/sso-framework';

export async function listSsoConnections(params: SsoConnectionFilterParams = {}): Promise<SsoConnectionListResult> {
  const { data } = await apiClient.get<SsoConnectionListResult>(`${BASE}/connections`, { params });
  return data;
}

export async function getSsoConnectionById(id: string): Promise<SsoConnection> {
  const { data } = await apiClient.get<SsoConnection>(`${BASE}/connections/${id}`);
  return data;
}

export async function registerSsoConnection(payload: RegisterSsoConnectionPayload): Promise<SsoConnection> {
  const { data } = await apiClient.post<SsoConnection>(`${BASE}/connections`, payload);
  return data;
}

export async function updateSsoConnection(id: string, payload: UpdateSsoConnectionPayload): Promise<SsoConnection> {
  const { data } = await apiClient.patch<SsoConnection>(`${BASE}/connections/${id}`, payload);
  return data;
}

export async function getSsoConnectionHistory(id: string): Promise<SsoHistoryEntry[]> {
  const { data } = await apiClient.get<SsoHistoryEntry[]>(`${BASE}/connections/${id}/history`);
  return data;
}

export async function enableSsoConnection(id: string): Promise<SsoConnection> {
  const { data } = await apiClient.post<SsoConnection>(`${BASE}/connections/${id}/enable`);
  return data;
}

export async function disableSsoConnection(id: string): Promise<SsoConnection> {
  const { data } = await apiClient.post<SsoConnection>(`${BASE}/connections/${id}/disable`);
  return data;
}

export async function revokeSsoConnection(id: string, reason?: string): Promise<SsoConnection> {
  const { data } = await apiClient.post<SsoConnection>(`${BASE}/connections/${id}/revoke`, { reason });
  return data;
}

export async function archiveSsoConnection(id: string): Promise<SsoConnection> {
  const { data } = await apiClient.post<SsoConnection>(`${BASE}/connections/${id}/archive`);
  return data;
}

export async function rotateSsoCertificate(id: string, payload: RotateSsoCertificatePayload): Promise<SsoConnection> {
  const { data } = await apiClient.post<SsoConnection>(`${BASE}/connections/${id}/rotate-certificate`, payload);
  return data;
}

export async function rotateSsoClientSecret(id: string, payload: RotateSsoClientSecretPayload): Promise<SsoConnection> {
  const { data } = await apiClient.post<SsoConnection>(`${BASE}/connections/${id}/rotate-client-secret`, payload);
  return data;
}

export async function refreshSsoMetadata(id: string): Promise<SsoConnection> {
  const { data } = await apiClient.post<SsoConnection>(`${BASE}/connections/${id}/refresh-metadata`);
  return data;
}

export async function createSsoGroupRoleMapping(connectionId: string, payload: CreateSsoGroupRoleMappingPayload): Promise<SsoGroupRoleMapping> {
  const { data } = await apiClient.post<SsoGroupRoleMapping>(`${BASE}/connections/${connectionId}/group-role-mappings`, payload);
  return data;
}

export async function listSsoGroupRoleMappings(connectionId: string): Promise<SsoGroupRoleMapping[]> {
  const { data } = await apiClient.get<SsoGroupRoleMapping[]>(`${BASE}/connections/${connectionId}/group-role-mappings`);
  return data;
}

export async function updateSsoGroupRoleMapping(connectionId: string, mappingId: string, payload: UpdateSsoGroupRoleMappingPayload): Promise<SsoGroupRoleMapping> {
  const { data } = await apiClient.patch<SsoGroupRoleMapping>(`${BASE}/connections/${connectionId}/group-role-mappings/${mappingId}`, payload);
  return data;
}

export async function deleteSsoGroupRoleMapping(connectionId: string, mappingId: string): Promise<void> {
  await apiClient.delete(`${BASE}/connections/${connectionId}/group-role-mappings/${mappingId}`);
}
