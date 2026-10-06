import { apiClient } from '@/lib/api/axios';
import type { TrendConcept } from '@/types';

const BASE = '/product-taxonomy';

export async function listTrendingConcepts(limit = 20): Promise<TrendConcept[]> {
  const { data } = await apiClient.get<TrendConcept[]>(`${BASE}/trending-concepts`, { params: { limit } });
  return data;
}
