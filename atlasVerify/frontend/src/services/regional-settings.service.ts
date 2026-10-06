import { apiClient } from '@/lib/api/axios';
import type {
  CreateRegionalSettingsProfilePayload,
  RegionalSettingsEffective,
  RegionalSettingsProfile,
  RegionalSettingsProfileFilterParams,
  RegionalSettingsProfileHistoryEntry,
  ResolveRegionalSettingsPayload,
  RollbackRegionalSettingsProfilePayload,
  UpdateRegionalSettingsProfilePayload,
} from '@/types';

const BASE = '/regional-settings';

/** This module's pagination uses `items`, not `data` — distinct from every other list endpoint in ATLAS. */
export interface PaginatedRegionalSettingsProfiles {
  items: RegionalSettingsProfile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function createRegionalSettingsProfile(payload: CreateRegionalSettingsProfilePayload, userId?: string): Promise<RegionalSettingsProfile> {
  const { data } = await apiClient.post<RegionalSettingsProfile>(`${BASE}/profiles`, payload, { params: { userId } });
  return data;
}

export async function findRegionalSettingsProfiles(filter: RegionalSettingsProfileFilterParams = {}): Promise<PaginatedRegionalSettingsProfiles> {
  const { data } = await apiClient.get<PaginatedRegionalSettingsProfiles>(`${BASE}/profiles`, { params: filter });
  return data;
}

export async function getRegionalSettingsProfile(id: string): Promise<RegionalSettingsProfile> {
  const { data } = await apiClient.get<RegionalSettingsProfile>(`${BASE}/profiles/${id}`);
  return data;
}

export async function updateRegionalSettingsProfile(id: string, payload: UpdateRegionalSettingsProfilePayload, userId?: string): Promise<RegionalSettingsProfile> {
  const { data } = await apiClient.patch<RegionalSettingsProfile>(`${BASE}/profiles/${id}`, payload, { params: { userId } });
  return data;
}

export async function publishRegionalSettingsProfile(id: string, userId?: string): Promise<RegionalSettingsProfile> {
  const { data } = await apiClient.post<RegionalSettingsProfile>(`${BASE}/profiles/${id}/publish`, {}, { params: { userId } });
  return data;
}

export async function archiveRegionalSettingsProfile(id: string, userId?: string): Promise<RegionalSettingsProfile> {
  const { data } = await apiClient.post<RegionalSettingsProfile>(`${BASE}/profiles/${id}/archive`, {}, { params: { userId } });
  return data;
}

export async function rollbackRegionalSettingsProfile(id: string, payload: RollbackRegionalSettingsProfilePayload, userId?: string): Promise<RegionalSettingsProfile> {
  const { data } = await apiClient.post<RegionalSettingsProfile>(`${BASE}/profiles/${id}/rollback`, payload, { params: { userId } });
  return data;
}

export async function getRegionalSettingsProfileHistory(id: string): Promise<RegionalSettingsProfileHistoryEntry[]> {
  const { data } = await apiClient.get<RegionalSettingsProfileHistoryEntry[]>(`${BASE}/profiles/${id}/history`);
  return data;
}

export async function resolveRegionalSettings(payload: ResolveRegionalSettingsPayload): Promise<RegionalSettingsEffective> {
  const { data } = await apiClient.post<RegionalSettingsEffective>(`${BASE}/resolve`, payload);
  return data;
}
