import { apiClient } from '@/lib/api/axios';
import type {
  Country,
  CountryContext,
  CountryFilterParams,
  CountryHistoryEntry,
  CountryListResult,
  CountryProviderAvailability,
  CountryProviderDomain,
  CountryResolutionResult,
  CountryValidationResult,
  CreateCountryOverridePayload,
  CreateCountryPayload,
  ResolveCountryContextPayload,
  UpdateCountryPayload,
  UpsertProviderAvailabilityPayload,
  UpsertWorkspaceCountryConfigPayload,
  ValidateCountryCombinationPayload,
  WorkspaceCountryConfig,
} from '@/types';

const BASE = '/countries';

export async function listCountries(params: CountryFilterParams = {}): Promise<CountryListResult> {
  const { data } = await apiClient.get(BASE, { params });
  return data;
}

export async function listRegions(): Promise<string[]> {
  const { data } = await apiClient.get(`${BASE}/regions`);
  return data;
}

export async function getCountryByCode(code: string): Promise<Country> {
  const { data } = await apiClient.get(`${BASE}/code/${code}`);
  return data;
}

export async function getCountryProviderAvailability(
  code: string,
  params: { domain?: CountryProviderDomain; providerKey?: string; workspaceId?: string } = {},
): Promise<CountryProviderAvailability[]> {
  const { data } = await apiClient.get(`${BASE}/code/${code}/availability`, { params });
  return data;
}

export async function getCountryById(id: string): Promise<Country> {
  const { data } = await apiClient.get(`${BASE}/${id}`);
  return data;
}

export async function createCountry(payload: CreateCountryPayload): Promise<Country> {
  const { data } = await apiClient.post(BASE, payload);
  return data;
}

export async function updateCountry(id: string, payload: UpdateCountryPayload): Promise<Country> {
  const { data } = await apiClient.patch(`${BASE}/${id}`, payload);
  return data;
}

export async function enableCountry(id: string): Promise<Country> {
  const { data } = await apiClient.post(`${BASE}/${id}/enable`);
  return data;
}

export async function disableCountry(id: string): Promise<Country> {
  const { data } = await apiClient.post(`${BASE}/${id}/disable`);
  return data;
}

export async function deprecateCountry(id: string): Promise<Country> {
  const { data } = await apiClient.post(`${BASE}/${id}/deprecate`);
  return data;
}

export async function archiveCountry(id: string): Promise<Country> {
  const { data } = await apiClient.post(`${BASE}/${id}/archive`);
  return data;
}

export async function restoreCountry(id: string): Promise<Country> {
  const { data } = await apiClient.post(`${BASE}/${id}/restore`);
  return data;
}

export async function getCountryHistory(id: string): Promise<CountryHistoryEntry[]> {
  const { data } = await apiClient.get(`${BASE}/${id}/history`);
  return data;
}

export async function upsertWorkspaceCountryConfig(
  workspaceId: string,
  payload: UpsertWorkspaceCountryConfigPayload,
): Promise<WorkspaceCountryConfig> {
  const { data } = await apiClient.post(`${BASE}/workspace/${workspaceId}/config`, payload);
  return data;
}

export async function getWorkspaceCountryConfigs(workspaceId: string): Promise<WorkspaceCountryConfig[]> {
  const { data } = await apiClient.get(`${BASE}/workspace/${workspaceId}/config`);
  return data;
}

export async function setDefaultWorkspaceCountry(workspaceId: string, countryCode: string): Promise<WorkspaceCountryConfig> {
  const { data } = await apiClient.post(`${BASE}/workspace/${workspaceId}/default/${countryCode}`);
  return data;
}

export async function removeWorkspaceCountry(workspaceId: string, countryCode: string): Promise<void> {
  await apiClient.delete(`${BASE}/workspace/${workspaceId}/config/${countryCode}`);
}

export async function createCountryOverride(payload: CreateCountryOverridePayload): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post(`${BASE}/overrides`, payload);
  return data;
}

export async function configureCountryProviderAvailability(payload: UpsertProviderAvailabilityPayload): Promise<CountryProviderAvailability> {
  const { data } = await apiClient.post(`${BASE}/availability`, payload);
  return data;
}

export async function resolveCountryContext(payload: ResolveCountryContextPayload): Promise<CountryResolutionResult> {
  const { data } = await apiClient.post(`${BASE}/resolve`, payload);
  return data;
}

export async function validateCountryCombination(payload: ValidateCountryCombinationPayload): Promise<CountryValidationResult> {
  const { data } = await apiClient.post(`${BASE}/validate`, payload);
  return data;
}
