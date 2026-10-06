import { apiClient } from '@/lib/api/axios';
import type {
  MarketplaceCapability,
  MarketplaceProviderConfig,
  MarketplaceProviderHealth,
  MarketplaceProviderMetadata,
  SetMarketplaceCredentialsPayload,
  UpsertMarketplaceProviderConfigPayload,
} from '@/types';

const BASE = '/marketplace-providers';

export async function listMarketplaceProviders(workspaceId: string): Promise<MarketplaceProviderMetadata[]> {
  const { data } = await apiClient.get<MarketplaceProviderMetadata[]>(BASE, { params: { workspaceId } });
  return data;
}

export async function getMarketplaceProvider(providerKey: string): Promise<MarketplaceProviderMetadata> {
  const { data } = await apiClient.get<MarketplaceProviderMetadata>(`${BASE}/${providerKey}`);
  return data;
}

export async function getMarketplaceProviderConfigs(workspaceId: string, providerKey?: string): Promise<MarketplaceProviderConfig[]> {
  const { data } = await apiClient.get<MarketplaceProviderConfig[]>(`${BASE}/configs`, { params: { workspaceId, providerKey } });
  return data;
}

export async function upsertMarketplaceProviderConfig(workspaceId: string, payload: UpsertMarketplaceProviderConfigPayload): Promise<MarketplaceProviderConfig> {
  const { data } = await apiClient.post<MarketplaceProviderConfig>(`${BASE}/configs`, payload, { params: { workspaceId } });
  return data;
}

export async function enableMarketplaceProvider(providerKey: string, workspaceId: string): Promise<void> {
  await apiClient.post(`${BASE}/${providerKey}/enable`, {}, { params: { workspaceId } });
}

export async function disableMarketplaceProvider(providerKey: string, workspaceId: string): Promise<void> {
  await apiClient.post(`${BASE}/${providerKey}/disable`, {}, { params: { workspaceId } });
}

export async function setMarketplaceCredentials(workspaceId: string, payload: SetMarketplaceCredentialsPayload): Promise<void> {
  await apiClient.post(`${BASE}/credentials`, payload, { params: { workspaceId } });
}

export async function validateMarketplaceCredentials(providerKey: string, workspaceId: string, accountId?: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get<Record<string, unknown>>(`${BASE}/${providerKey}/credentials/validate`, { params: { workspaceId, accountId } });
  return data;
}

export async function getMarketplaceProviderHealth(providerKey?: string, accountId?: string): Promise<MarketplaceProviderHealth | MarketplaceProviderHealth[]> {
  const { data } = await apiClient.get<MarketplaceProviderHealth | MarketplaceProviderHealth[]>(`${BASE}/health`, { params: { providerKey, accountId } });
  return data;
}

export async function checkMarketplaceProviderHealth(providerKey?: string, accountId?: string): Promise<MarketplaceProviderHealth> {
  const { data } = await apiClient.post<MarketplaceProviderHealth>(`${BASE}/health/check`, { providerKey, accountId });
  return data;
}

export async function testMarketplaceProviderConnection(workspaceId: string, providerKey: string, accountId: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post<Record<string, unknown>>(`${BASE}/connection/test`, { providerKey, accountId }, { params: { workspaceId } });
  return data;
}

export async function listCapableProviders(capability: MarketplaceCapability): Promise<string[]> {
  const { data } = await apiClient.get<string[]>(`${BASE}/capabilities/${capability}/providers`);
  return data;
}

export async function validateProviderCapability(providerKey: string, capability: MarketplaceCapability): Promise<{ supported: boolean }> {
  const { data } = await apiClient.get<{ supported: boolean }>(`${BASE}/${providerKey}/capabilities/${capability}/validate`);
  return data;
}

export async function getMarketplaceProviderMetrics(providerKey?: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get<Record<string, unknown>>(`${BASE}/metrics`, { params: { providerKey } });
  return data;
}
