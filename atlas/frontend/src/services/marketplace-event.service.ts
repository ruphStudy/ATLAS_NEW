import { apiClient } from '@/lib/api/axios';
import type { MarketplaceEventFilterParams, MarketplaceEventListResult, MarketplaceEventMetrics, MarketplaceEventRecord } from '@/types';

const BASE = '/marketplace-event';

export async function listMarketplaceEvents(params: MarketplaceEventFilterParams): Promise<MarketplaceEventListResult> {
  const { data } = await apiClient.get<MarketplaceEventListResult>(`${BASE}/events`, { params });
  return data;
}

export async function getMarketplaceEvent(workspaceId: string, eventId: string): Promise<MarketplaceEventRecord> {
  const { data } = await apiClient.get<MarketplaceEventRecord>(`${BASE}/events/${workspaceId}/${eventId}`);
  return data;
}

export async function getMarketplaceEventHistory(workspaceId: string, eventId: string): Promise<unknown[]> {
  const { data } = await apiClient.get<unknown[]>(`${BASE}/events/${workspaceId}/${eventId}/history`);
  return data;
}

export async function reprocessMarketplaceEvent(workspaceId: string, eventId: string): Promise<MarketplaceEventRecord> {
  const { data } = await apiClient.post<MarketplaceEventRecord>(`${BASE}/reprocess`, { workspaceId, eventId });
  return data;
}

export async function cancelMarketplaceEvent(workspaceId: string, eventId: string): Promise<MarketplaceEventRecord> {
  const { data } = await apiClient.post<MarketplaceEventRecord>(`${BASE}/cancel`, { workspaceId, eventId });
  return data;
}

export async function getFailedMarketplaceEvents(workspaceId: string, accountId?: string, limit?: number): Promise<MarketplaceEventRecord[]> {
  const { data } = await apiClient.get<MarketplaceEventRecord[]>(`${BASE}/failed/${workspaceId}`, { params: { accountId, limit } });
  return data;
}

export async function getPendingMarketplaceEvents(workspaceId: string, accountId?: string, limit?: number): Promise<MarketplaceEventRecord[]> {
  const { data } = await apiClient.get<MarketplaceEventRecord[]>(`${BASE}/pending/${workspaceId}`, { params: { accountId, limit } });
  return data;
}

export async function getMarketplaceEventMetrics(workspaceId: string, accountId?: string): Promise<MarketplaceEventMetrics> {
  const { data } = await apiClient.get<MarketplaceEventMetrics>(`${BASE}/metrics/${workspaceId}`, { params: { accountId } });
  return data;
}
