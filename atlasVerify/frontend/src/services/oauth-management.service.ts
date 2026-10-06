import { apiClient } from '@/lib/api/axios';
import type {
  AuthorizeOAuthConnectionPayload,
  ConnectOAuthClientCredentialsPayload,
  OAuthAuthorizeResult,
  OAuthClient,
  OAuthClientFilterParams,
  OAuthClientListResult,
  OAuthConnection,
  OAuthConnectionFilterParams,
  OAuthConnectionListResult,
  OAuthConnectionTestResult,
  OAuthHistoryEntry,
  RegisterOAuthClientPayload,
  UpdateOAuthClientPayload,
} from '@/types';

const BASE = '/oauth-management';

export async function listOAuthClients(params: OAuthClientFilterParams = {}): Promise<OAuthClientListResult> {
  const { data } = await apiClient.get<OAuthClientListResult>(`${BASE}/clients`, { params });
  return data;
}

export async function getOAuthClientById(id: string): Promise<OAuthClient> {
  const { data } = await apiClient.get<OAuthClient>(`${BASE}/clients/${id}`);
  return data;
}

export async function registerOAuthClient(payload: RegisterOAuthClientPayload): Promise<OAuthClient> {
  const { data } = await apiClient.post<OAuthClient>(`${BASE}/clients`, payload);
  return data;
}

export async function updateOAuthClient(id: string, payload: UpdateOAuthClientPayload): Promise<OAuthClient> {
  const { data } = await apiClient.patch<OAuthClient>(`${BASE}/clients/${id}`, payload);
  return data;
}

export async function getOAuthClientHistory(id: string): Promise<OAuthHistoryEntry[]> {
  const { data } = await apiClient.get<OAuthHistoryEntry[]>(`${BASE}/clients/${id}/history`);
  return data;
}

export async function enableOAuthClient(id: string): Promise<OAuthClient> {
  const { data } = await apiClient.post<OAuthClient>(`${BASE}/clients/${id}/enable`);
  return data;
}

export async function disableOAuthClient(id: string): Promise<OAuthClient> {
  const { data } = await apiClient.post<OAuthClient>(`${BASE}/clients/${id}/disable`);
  return data;
}

export async function rotateOAuthClientSecret(id: string, clientSecret: string): Promise<OAuthClient> {
  const { data } = await apiClient.post<OAuthClient>(`${BASE}/clients/${id}/rotate-secret`, { clientSecret });
  return data;
}

export async function revokeOAuthClient(id: string, reason?: string): Promise<OAuthClient> {
  const { data } = await apiClient.post<OAuthClient>(`${BASE}/clients/${id}/revoke`, { reason });
  return data;
}

export async function archiveOAuthClient(id: string): Promise<OAuthClient> {
  const { data } = await apiClient.post<OAuthClient>(`${BASE}/clients/${id}/archive`);
  return data;
}

export async function authorizeOAuthConnection(clientId: string, payload: AuthorizeOAuthConnectionPayload): Promise<OAuthAuthorizeResult> {
  const { data } = await apiClient.post<OAuthAuthorizeResult>(`${BASE}/clients/${clientId}/authorize`, payload);
  return data;
}

export async function connectOAuthClientCredentials(clientId: string, payload: ConnectOAuthClientCredentialsPayload): Promise<OAuthConnection> {
  const { data } = await apiClient.post<OAuthConnection>(`${BASE}/clients/${clientId}/connect`, payload);
  return data;
}

export async function listOAuthConnections(params: OAuthConnectionFilterParams = {}): Promise<OAuthConnectionListResult> {
  const { data } = await apiClient.get<OAuthConnectionListResult>(`${BASE}/connections`, { params });
  return data;
}

export async function getOAuthConnectionById(id: string): Promise<OAuthConnection> {
  const { data } = await apiClient.get<OAuthConnection>(`${BASE}/connections/${id}`);
  return data;
}

export async function getOAuthConnectionHistory(id: string): Promise<OAuthHistoryEntry[]> {
  const { data } = await apiClient.get<OAuthHistoryEntry[]>(`${BASE}/connections/${id}/history`);
  return data;
}

export async function refreshOAuthConnection(id: string): Promise<OAuthConnection> {
  const { data } = await apiClient.post<OAuthConnection>(`${BASE}/connections/${id}/refresh`);
  return data;
}

export async function revokeOAuthConnection(id: string, reason?: string): Promise<OAuthConnection> {
  const { data } = await apiClient.post<OAuthConnection>(`${BASE}/connections/${id}/revoke`, { reason });
  return data;
}

export async function disconnectOAuthConnection(id: string): Promise<OAuthConnection> {
  const { data } = await apiClient.post<OAuthConnection>(`${BASE}/connections/${id}/disconnect`);
  return data;
}

export async function testOAuthConnection(id: string): Promise<OAuthConnectionTestResult> {
  const { data } = await apiClient.post<OAuthConnectionTestResult>(`${BASE}/connections/${id}/test`);
  return data;
}
