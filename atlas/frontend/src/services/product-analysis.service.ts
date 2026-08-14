import { apiClient } from '@/lib/api/axios';
import type { ProductAnalysis } from '@/types';

const BASE = '/product-analysis';

export async function getLatestAnalysisForOpportunity(opportunityId: string): Promise<ProductAnalysis | null> {
  const { data } = await apiClient.get<ProductAnalysis | null>(`${BASE}/opportunity/${opportunityId}/latest`);
  return data;
}

export async function triggerReanalysis(opportunityId: string): Promise<ProductAnalysis> {
  const { data } = await apiClient.post<ProductAnalysis>(`${BASE}/opportunity/${opportunityId}/reanalyze`);
  return data;
}
