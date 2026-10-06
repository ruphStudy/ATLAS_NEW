import { apiClient } from '@/lib/api/axios';
import type { ProductScore } from '@/types';

const BASE = '/product-scoring';

export async function getLatestScoreForOpportunity(opportunityId: string): Promise<ProductScore | null> {
  const { data } = await apiClient.get<ProductScore | null>(`${BASE}/opportunity/${opportunityId}/latest`);
  return data;
}

export async function triggerRescoring(opportunityId: string): Promise<ProductScore> {
  const { data } = await apiClient.post<ProductScore>(`${BASE}/opportunity/${opportunityId}/rescore`, {});
  return data;
}

export async function getScoreSnapshots(id: string): Promise<Record<string, unknown>[]> {
  const { data } = await apiClient.get<Record<string, unknown>[]>(`${BASE}/${id}/snapshots`);
  return data;
}
