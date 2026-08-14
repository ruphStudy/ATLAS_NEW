import { apiClient } from '@/lib/api/axios';
import type {
  MarketplaceErrorAggregationByCategory,
  MarketplaceErrorAggregationBySeverity,
  MarketplaceErrorHistoryEntry,
  MarketplaceErrorOccurrence,
  MarketplaceErrorSearchParams,
} from '@/types';

const BASE = '/marketplace/error-normalizer';

export async function searchMarketplaceErrors(params: MarketplaceErrorSearchParams): Promise<MarketplaceErrorHistoryEntry[]> {
  const { data } = await apiClient.get<MarketplaceErrorHistoryEntry[]>(`${BASE}/search`, { params });
  return data;
}

export async function countMarketplaceErrors(params: Omit<MarketplaceErrorSearchParams, 'limit' | 'offset'>): Promise<number> {
  const { data } = await apiClient.get<number>(`${BASE}/count`, { params });
  return data;
}

export async function getTopMarketplaceErrors(workspaceId: string, limit?: number, startDate?: string, endDate?: string): Promise<MarketplaceErrorHistoryEntry[]> {
  const { data } = await apiClient.get<MarketplaceErrorHistoryEntry[]>(`${BASE}/top`, { params: { workspaceId, limit, startDate, endDate } });
  return data;
}

export async function getMarketplaceErrorHistory(workspaceId: string, historyId: string): Promise<MarketplaceErrorHistoryEntry | null> {
  const { data } = await apiClient.get<MarketplaceErrorHistoryEntry | null>(`${BASE}/history/${workspaceId}/${historyId}`);
  return data;
}

export async function getMarketplaceErrorOccurrences(workspaceId: string, historyId: string, limit?: number): Promise<MarketplaceErrorOccurrence[]> {
  const { data } = await apiClient.get<MarketplaceErrorOccurrence[]>(`${BASE}/occurrences/${workspaceId}/${historyId}`, { params: { limit } });
  return data;
}

export async function resolveMarketplaceError(workspaceId: string, historyId: string): Promise<void> {
  await apiClient.post(`${BASE}/resolve`, { workspaceId, historyId });
}

export async function aggregateMarketplaceErrorsByCategory(workspaceId: string, startDate: string, endDate: string): Promise<MarketplaceErrorAggregationByCategory[]> {
  const { data } = await apiClient.get<MarketplaceErrorAggregationByCategory[]>(`${BASE}/aggregate/category`, { params: { workspaceId, startDate, endDate } });
  return data;
}

export async function aggregateMarketplaceErrorsBySeverity(workspaceId: string, startDate: string, endDate: string): Promise<MarketplaceErrorAggregationBySeverity[]> {
  const { data } = await apiClient.get<MarketplaceErrorAggregationBySeverity[]>(`${BASE}/aggregate/severity`, { params: { workspaceId, startDate, endDate } });
  return data;
}
