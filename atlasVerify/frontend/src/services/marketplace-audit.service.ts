import { apiClient } from '@/lib/api/axios';
import type {
  MarketplaceActivityRecord,
  MarketplaceActivitySearchParams,
  MarketplaceActivityTimelineResult,
  MarketplaceAuditStatistics,
  MarketplaceSuspiciousActivity,
} from '@/types';

const BASE = '/marketplace/audit';

export async function searchMarketplaceActivities(params: MarketplaceActivitySearchParams): Promise<MarketplaceActivityRecord[]> {
  const { data } = await apiClient.get<MarketplaceActivityRecord[]>(`${BASE}/search`, { params });
  return data;
}

export async function countMarketplaceActivities(params: Omit<MarketplaceActivitySearchParams, 'limit' | 'offset' | 'sortBy' | 'sortOrder'>): Promise<number> {
  const { data } = await apiClient.get<number>(`${BASE}/count`, { params });
  return data;
}

export async function getMarketplaceActivity(workspaceId: string, activityId: string): Promise<MarketplaceActivityRecord | null> {
  const { data } = await apiClient.get<MarketplaceActivityRecord | null>(`${BASE}/activity/${workspaceId}/${activityId}`);
  return data;
}

export async function getMarketplaceActivityTimeline(workspaceId: string, startDate: string, endDate: string, provider?: string, accountId?: string, limit?: number): Promise<MarketplaceActivityTimelineResult> {
  const { data } = await apiClient.get<MarketplaceActivityTimelineResult>(`${BASE}/timeline`, { params: { workspaceId, startDate, endDate, provider, accountId, limit } });
  return data;
}

export async function getCorrelatedMarketplaceActivities(workspaceId: string, correlationId: string): Promise<MarketplaceActivityRecord[]> {
  const { data } = await apiClient.get<MarketplaceActivityRecord[]>(`${BASE}/correlated/${workspaceId}/${correlationId}`);
  return data;
}

export async function getMarketplaceAuditStatistics(workspaceId: string, startDate: string, endDate: string): Promise<MarketplaceAuditStatistics> {
  const { data } = await apiClient.get<MarketplaceAuditStatistics>(`${BASE}/statistics`, { params: { workspaceId, startDate, endDate } });
  return data;
}

export async function getSuspiciousMarketplaceActivities(workspaceId: string, isResolved?: boolean): Promise<MarketplaceSuspiciousActivity[]> {
  const { data } = await apiClient.get<MarketplaceSuspiciousActivity[]>(`${BASE}/suspicious/${workspaceId}`, { params: { isResolved } });
  return data;
}

export async function resolveSuspiciousMarketplaceActivity(workspaceId: string, suspiciousActivityId: string): Promise<void> {
  await apiClient.post(`${BASE}/suspicious/resolve/${workspaceId}/${suspiciousActivityId}`);
}
