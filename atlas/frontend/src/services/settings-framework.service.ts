import { apiClient } from '@/lib/api/axios';
import type {
  CreateSettingValuePayload,
  PaginatedResult,
  ResolvedSettingFull,
  RollbackSettingValuePayload,
  SettingDefinition,
  SettingDefinitionFilterParams,
  SettingValue,
  SettingValueFilterParams,
  SettingValueHistoryEntry,
  UpdateSettingValuePayload,
} from '@/types';

const BASE = '/settings';

export async function listSettingDefinitions(params: SettingDefinitionFilterParams = {}): Promise<PaginatedResult<SettingDefinition>> {
  const { data } = await apiClient.get<PaginatedResult<SettingDefinition>>(`${BASE}/definitions`, { params });
  return data;
}

export async function getSettingDefinition(key: string): Promise<SettingDefinition> {
  const { data } = await apiClient.get<SettingDefinition>(`${BASE}/definitions/${key}`);
  return data;
}

export async function resolveSettings(moduleKey?: string, category?: string, keys?: string[]): Promise<Record<string, ResolvedSettingFull>> {
  const { data } = await apiClient.get<Record<string, ResolvedSettingFull>>(`${BASE}/resolve`, { params: { moduleKey, category, keys: keys?.join(',') } });
  return data;
}

export async function resolveSetting(key: string, moduleKey?: string): Promise<ResolvedSettingFull> {
  const { data } = await apiClient.get<ResolvedSettingFull>(`${BASE}/resolve/${key}`, { params: { moduleKey } });
  return data;
}

export async function createSettingValue(payload: CreateSettingValuePayload): Promise<SettingValue> {
  const { data } = await apiClient.post<SettingValue>(`${BASE}/values`, payload);
  return data;
}

export async function listSettingValues(params: SettingValueFilterParams = {}): Promise<PaginatedResult<SettingValue>> {
  const { data } = await apiClient.get<PaginatedResult<SettingValue>>(`${BASE}/values`, { params });
  return data;
}

export async function updateSettingValue(id: string, payload: UpdateSettingValuePayload): Promise<SettingValue> {
  const { data } = await apiClient.patch<SettingValue>(`${BASE}/values/${id}`, payload);
  return data;
}

export async function getSettingValueHistory(id: string): Promise<SettingValueHistoryEntry[]> {
  const { data } = await apiClient.get<SettingValueHistoryEntry[]>(`${BASE}/values/${id}/history`);
  return data;
}

export async function publishSettingValue(id: string): Promise<SettingValue> {
  const { data } = await apiClient.post<SettingValue>(`${BASE}/values/${id}/publish`);
  return data;
}

export async function enableSettingValue(id: string): Promise<SettingValue> {
  const { data } = await apiClient.post<SettingValue>(`${BASE}/values/${id}/enable`);
  return data;
}

export async function disableSettingValue(id: string): Promise<SettingValue> {
  const { data } = await apiClient.post<SettingValue>(`${BASE}/values/${id}/disable`);
  return data;
}

export async function archiveSettingValue(id: string): Promise<SettingValue> {
  const { data } = await apiClient.post<SettingValue>(`${BASE}/values/${id}/archive`);
  return data;
}

export async function resetSettingValue(id: string): Promise<SettingValue> {
  const { data } = await apiClient.post<SettingValue>(`${BASE}/values/${id}/reset`);
  return data;
}

export async function rollbackSettingValue(id: string, payload: RollbackSettingValuePayload): Promise<SettingValue> {
  const { data } = await apiClient.post<SettingValue>(`${BASE}/values/${id}/rollback`, payload);
  return data;
}
