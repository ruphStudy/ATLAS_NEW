import { apiClient } from '@/lib/api/axios';
import type { ExecutiveOverview, ExecutiveOverviewFilters } from '@/types';

/** Single consolidated call — kpis, summaries, alerts, insights, marketplace comparisons and AI operations in one response. Avoid calling the narrower `/kpis`, `/alerts`, `/summary` endpoints when this already covers what's needed. */
export async function getExecutiveOverview(filters: ExecutiveOverviewFilters): Promise<ExecutiveOverview> {
  const { data } = await apiClient.post<ExecutiveOverview>('/executive-dashboard/overview', filters);
  return data;
}
