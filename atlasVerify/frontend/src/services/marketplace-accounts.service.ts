import { apiClient } from '@/lib/api/axios';
import type {
  CreateMarketplaceAccountPayload,
  MarketplaceAccount,
  MarketplaceAccountFilterParams,
  MarketplaceAccountHistoryEntry,
  MarketplaceAccountListResult,
  UpdateMarketplaceAccountPayload,
} from '@/types';

const BASE = '/marketplace-accounts';

export async function listMarketplaceAccounts(params: MarketplaceAccountFilterParams & { workspaceId: string }): Promise<MarketplaceAccountListResult> {
  const { data } = await apiClient.get<MarketplaceAccountListResult>(BASE, { params });
  return data;
}

export async function getMarketplaceAccountById(id: string, workspaceId: string): Promise<MarketplaceAccount> {
  const { data } = await apiClient.get<MarketplaceAccount>(`${BASE}/${workspaceId}/${id}`);
  return data;
}

export async function createMarketplaceAccount(workspaceId: string, payload: CreateMarketplaceAccountPayload): Promise<MarketplaceAccount> {
  const { data } = await apiClient.post<MarketplaceAccount>(BASE, { ...payload, workspaceId });
  return data;
}

export async function updateMarketplaceAccount(id: string, workspaceId: string, payload: UpdateMarketplaceAccountPayload): Promise<MarketplaceAccount> {
  const { data } = await apiClient.patch<MarketplaceAccount>(`${BASE}/${workspaceId}/${id}`, payload);
  return data;
}

export async function enableMarketplaceAccount(id: string, workspaceId: string, reason?: string): Promise<MarketplaceAccount> {
  const { data } = await apiClient.post<MarketplaceAccount>(`${BASE}/${workspaceId}/${id}/enable`, { reason });
  return data;
}

export async function disableMarketplaceAccount(id: string, workspaceId: string, reason?: string): Promise<MarketplaceAccount> {
  const { data } = await apiClient.post<MarketplaceAccount>(`${BASE}/${workspaceId}/${id}/disable`, { reason });
  return data;
}

export async function archiveMarketplaceAccount(id: string, workspaceId: string, reason?: string): Promise<MarketplaceAccount> {
  const { data } = await apiClient.post<MarketplaceAccount>(`${BASE}/${workspaceId}/${id}/archive`, { reason });
  return data;
}

export async function restoreMarketplaceAccount(id: string, workspaceId: string): Promise<MarketplaceAccount> {
  const { data } = await apiClient.post<MarketplaceAccount>(`${BASE}/${workspaceId}/${id}/restore`, {});
  return data;
}

export async function deleteMarketplaceAccount(id: string, workspaceId: string): Promise<void> {
  await apiClient.delete(`${BASE}/${workspaceId}/${id}`);
}

export async function testMarketplaceAccountConnection(id: string, workspaceId: string): Promise<{ success: boolean; correlationId: string; errorMessage?: string | null }> {
  const { data } = await apiClient.post<{ success: boolean; correlationId: string; errorMessage?: string | null }>(`${BASE}/${workspaceId}/${id}/test-connection`, {});
  return data;
}

export async function setDefaultMarketplaceAccount(id: string, workspaceId: string): Promise<MarketplaceAccount> {
  const { data } = await apiClient.post<MarketplaceAccount>(`${BASE}/${workspaceId}/${id}/set-default`, {});
  return data;
}

export async function setMarketplaceAccountPriority(id: string, workspaceId: string, priority: number): Promise<MarketplaceAccount> {
  const { data } = await apiClient.patch<MarketplaceAccount>(`${BASE}/${workspaceId}/${id}/priority`, { priority });
  return data;
}

export async function getMarketplaceAccountHistory(id: string, workspaceId: string, params: { page?: number; limit?: number } = {}): Promise<MarketplaceAccountHistoryEntry[] | { items: MarketplaceAccountHistoryEntry[] }> {
  const { data } = await apiClient.get(`${BASE}/${workspaceId}/${id}/history`, { params });
  return data;
}
