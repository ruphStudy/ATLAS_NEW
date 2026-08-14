import { apiClient } from '@/lib/api/axios';
import type {
  CreateFeatureFlagDefinitionPayload,
  CreateFeatureFlagOverridePayload,
  FeatureFlagDefinition,
  FeatureFlagDefinitionFilterParams,
  FeatureFlagHistoryEntry,
  FeatureFlagOverride,
  FeatureFlagOverrideFilterParams,
  PaginatedResult,
  UpdateFeatureFlagDefinitionPayload,
  UpdateFeatureFlagOverridePayload,
} from '@/types';

const BASE = '/feature-flags';

export async function createFeatureFlagDefinition(payload: CreateFeatureFlagDefinitionPayload): Promise<FeatureFlagDefinition> {
  const { data } = await apiClient.post<FeatureFlagDefinition>(`${BASE}/definitions`, payload);
  return data;
}

export async function listFeatureFlagDefinitions(params: FeatureFlagDefinitionFilterParams = {}): Promise<PaginatedResult<FeatureFlagDefinition>> {
  const { data } = await apiClient.get<PaginatedResult<FeatureFlagDefinition>>(`${BASE}/definitions`, { params });
  return data;
}

export async function getFeatureFlagDefinition(key: string): Promise<FeatureFlagDefinition> {
  const { data } = await apiClient.get<FeatureFlagDefinition>(`${BASE}/definitions/${key}`);
  return data;
}

export async function updateFeatureFlagDefinition(key: string, payload: UpdateFeatureFlagDefinitionPayload): Promise<FeatureFlagDefinition> {
  const { data } = await apiClient.patch<FeatureFlagDefinition>(`${BASE}/definitions/${key}`, payload);
  return data;
}

export async function getFeatureFlagDefinitionHistory(key: string): Promise<FeatureFlagHistoryEntry[]> {
  const { data } = await apiClient.get<FeatureFlagHistoryEntry[]>(`${BASE}/definitions/${key}/history`);
  return data;
}

export async function enableFeatureFlagDefinition(key: string): Promise<FeatureFlagDefinition> {
  const { data } = await apiClient.post<FeatureFlagDefinition>(`${BASE}/definitions/${key}/enable`);
  return data;
}

export async function disableFeatureFlagDefinition(key: string): Promise<FeatureFlagDefinition> {
  const { data } = await apiClient.post<FeatureFlagDefinition>(`${BASE}/definitions/${key}/disable`);
  return data;
}

export async function archiveFeatureFlagDefinition(key: string): Promise<FeatureFlagDefinition> {
  const { data } = await apiClient.post<FeatureFlagDefinition>(`${BASE}/definitions/${key}/archive`);
  return data;
}

export async function restoreFeatureFlagDefinition(key: string): Promise<FeatureFlagDefinition> {
  const { data } = await apiClient.post<FeatureFlagDefinition>(`${BASE}/definitions/${key}/restore`);
  return data;
}

export async function activateKillSwitch(key: string, reason: string): Promise<FeatureFlagDefinition> {
  const { data } = await apiClient.post<FeatureFlagDefinition>(`${BASE}/definitions/${key}/kill-switch/activate`, { reason });
  return data;
}

export async function deactivateKillSwitch(key: string): Promise<FeatureFlagDefinition> {
  const { data } = await apiClient.post<FeatureFlagDefinition>(`${BASE}/definitions/${key}/kill-switch/deactivate`);
  return data;
}

export async function createFeatureFlagOverride(key: string, payload: CreateFeatureFlagOverridePayload): Promise<FeatureFlagOverride> {
  const { data } = await apiClient.post<FeatureFlagOverride>(`${BASE}/definitions/${key}/overrides`, payload);
  return data;
}

export async function listOverridesForFlag(key: string): Promise<FeatureFlagOverride[]> {
  const { data } = await apiClient.get<FeatureFlagOverride[]>(`${BASE}/definitions/${key}/overrides`);
  return data;
}

export async function listAllOverrides(params: FeatureFlagOverrideFilterParams = {}): Promise<PaginatedResult<FeatureFlagOverride>> {
  const { data } = await apiClient.get<PaginatedResult<FeatureFlagOverride>>(`${BASE}/overrides`, { params });
  return data;
}

export async function getOverride(id: string): Promise<FeatureFlagOverride> {
  const { data } = await apiClient.get<FeatureFlagOverride>(`${BASE}/overrides/${id}`);
  return data;
}

export async function updateOverride(id: string, payload: UpdateFeatureFlagOverridePayload): Promise<FeatureFlagOverride> {
  const { data } = await apiClient.patch<FeatureFlagOverride>(`${BASE}/overrides/${id}`, payload);
  return data;
}

export async function enableOverride(id: string): Promise<FeatureFlagOverride> {
  const { data } = await apiClient.post<FeatureFlagOverride>(`${BASE}/overrides/${id}/enable`);
  return data;
}

export async function disableOverride(id: string): Promise<FeatureFlagOverride> {
  const { data } = await apiClient.post<FeatureFlagOverride>(`${BASE}/overrides/${id}/disable`);
  return data;
}

export async function archiveOverride(id: string, reason?: string): Promise<FeatureFlagOverride> {
  const { data } = await apiClient.post<FeatureFlagOverride>(`${BASE}/overrides/${id}/archive`, { reason });
  return data;
}
