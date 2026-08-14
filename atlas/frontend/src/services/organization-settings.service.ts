import { apiClient } from '@/lib/api/axios';
import type {
  OrganizationOperationalSettings,
  OrganizationPolicySettings,
  OrganizationProfileSettings,
  OrganizationRegionalSettings,
  OrganizationSettingScopeParams,
  PaginatedResult,
  ResolvedSettingFull,
  SettingDefinition,
  SettingDefinitionFilterParams,
  SettingValueHistoryEntry,
  UpdateOrganizationOperationalPayload,
  UpdateOrganizationPolicyPayload,
  UpdateOrganizationProfilePayload,
  UpdateOrganizationRegionalPayload,
} from '@/types';

const BASE = '/organization-settings';

export async function getOrganizationProfile(): Promise<OrganizationProfileSettings> {
  const { data } = await apiClient.get<OrganizationProfileSettings>(`${BASE}/profile`);
  return data;
}

export async function updateOrganizationProfile(payload: UpdateOrganizationProfilePayload): Promise<void> {
  await apiClient.patch(`${BASE}/profile`, payload);
}

export async function getOrganizationRegional(): Promise<OrganizationRegionalSettings> {
  const { data } = await apiClient.get<OrganizationRegionalSettings>(`${BASE}/regional`);
  return data;
}

export async function updateOrganizationRegional(payload: UpdateOrganizationRegionalPayload, scope?: OrganizationSettingScopeParams): Promise<void> {
  await apiClient.patch(`${BASE}/regional`, payload, { params: scope });
}

export async function getOrganizationOperational(): Promise<OrganizationOperationalSettings> {
  const { data } = await apiClient.get<OrganizationOperationalSettings>(`${BASE}/operational`);
  return data;
}

export async function updateOrganizationOperational(payload: UpdateOrganizationOperationalPayload, scope?: OrganizationSettingScopeParams): Promise<void> {
  await apiClient.patch(`${BASE}/operational`, payload, { params: scope });
}

export async function getOrganizationPolicies(): Promise<OrganizationPolicySettings> {
  const { data } = await apiClient.get<OrganizationPolicySettings>(`${BASE}/policies`);
  return data;
}

export async function updateOrganizationPolicies(payload: UpdateOrganizationPolicyPayload, scope?: OrganizationSettingScopeParams): Promise<void> {
  await apiClient.patch(`${BASE}/policies`, payload, { params: scope });
}

export async function listOrganizationSettingDefinitions(filter: SettingDefinitionFilterParams = {}): Promise<PaginatedResult<SettingDefinition>> {
  const { data } = await apiClient.get<PaginatedResult<SettingDefinition>>(`${BASE}/definitions`, { params: filter });
  return data;
}

export async function resolveOrganizationSettingKey(key: string): Promise<ResolvedSettingFull> {
  const { data } = await apiClient.get<ResolvedSettingFull>(`${BASE}/resolve/${key}`);
  return data;
}

export async function publishOrganizationSettingByKey(key: string, scope?: OrganizationSettingScopeParams): Promise<unknown> {
  const { data } = await apiClient.post(`${BASE}/values/${key}/publish`, {}, { params: scope });
  return data;
}

export async function resetOrganizationSettingByKey(key: string, scope?: OrganizationSettingScopeParams): Promise<unknown> {
  const { data } = await apiClient.post(`${BASE}/values/${key}/reset`, {}, { params: scope });
  return data;
}

export async function rollbackOrganizationSettingByKey(key: string, historyId: string, scope?: OrganizationSettingScopeParams): Promise<unknown> {
  const { data } = await apiClient.post(`${BASE}/values/${key}/rollback`, { historyId }, { params: scope });
  return data;
}

export async function getOrganizationSettingHistoryByKey(key: string, scope?: OrganizationSettingScopeParams): Promise<SettingValueHistoryEntry[]> {
  const { data } = await apiClient.get<SettingValueHistoryEntry[]>(`${BASE}/values/${key}/history`, { params: scope });
  return data;
}
