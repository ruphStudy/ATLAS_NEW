import { apiClient } from '@/lib/api/axios';
import type {
  ApiKey,
  ApiKeyCreatedSecret,
  ApiKeyFilterParams,
  ApiKeyHistoryEntry,
  ApiKeyListResult,
  CreateApiKeyPayload,
  UpdateApiKeyPayload,
} from '@/types';

const BASE = '/api-key-management';

export async function listApiKeys(params: ApiKeyFilterParams = {}): Promise<ApiKeyListResult> {
  const { data } = await apiClient.get<ApiKeyListResult>(`${BASE}/keys`, { params });
  return data;
}

export async function getApiKeyById(id: string): Promise<ApiKey> {
  const { data } = await apiClient.get<ApiKey>(`${BASE}/keys/${id}`);
  return data;
}

export async function createApiKey(payload: CreateApiKeyPayload): Promise<ApiKeyCreatedSecret> {
  const { data } = await apiClient.post<ApiKeyCreatedSecret>(`${BASE}/keys`, payload);
  return data;
}

export async function updateApiKey(id: string, payload: UpdateApiKeyPayload): Promise<ApiKey> {
  const { data } = await apiClient.patch<ApiKey>(`${BASE}/keys/${id}`, payload);
  return data;
}

export async function getApiKeyHistory(id: string): Promise<ApiKeyHistoryEntry[]> {
  const { data } = await apiClient.get<ApiKeyHistoryEntry[]>(`${BASE}/keys/${id}/history`);
  return data;
}

export async function rotateApiKey(id: string, gracePeriodMs?: number): Promise<ApiKeyCreatedSecret> {
  const { data } = await apiClient.post<ApiKeyCreatedSecret>(`${BASE}/keys/${id}/rotate`, { gracePeriodMs });
  return data;
}

export async function revokeApiKey(id: string, reason?: string): Promise<ApiKey> {
  const { data } = await apiClient.post<ApiKey>(`${BASE}/keys/${id}/revoke`, { reason });
  return data;
}

export async function disableApiKey(id: string): Promise<ApiKey> {
  const { data } = await apiClient.post<ApiKey>(`${BASE}/keys/${id}/disable`);
  return data;
}

export async function enableApiKey(id: string): Promise<ApiKey> {
  const { data } = await apiClient.post<ApiKey>(`${BASE}/keys/${id}/enable`);
  return data;
}
