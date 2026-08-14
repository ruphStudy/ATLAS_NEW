import { apiClient } from '@/lib/api/axios';
import type {
  SupplierAnalyticsDimension,
  SupplierAnalyticsFilterParams,
  SupplierAnalyticsMetricType,
  SupplierAnalyticsPeriod,
  SupplierBreakdownRow,
  SupplierComparison,
  SupplierComparisonType,
  SupplierPerformance,
  SupplierRanking,
  SupplierTrendPoint,
} from '@/types';

const BASE = '/supplier-analytics';

export interface SupplierPerformanceParams {
  workspaceId: string;
  startDate: string;
  endDate: string;
  supplierIds?: string[];
}

export async function getSupplierPerformance(params: SupplierPerformanceParams): Promise<SupplierPerformance[]> {
  const { data } = await apiClient.get<SupplierPerformance[]>(`${BASE}/performance`, { params });
  return data;
}

/** Workspace-wide performance list (not scoped to a single supplier) — powers the Supplier Analytics hub page. */
export async function getSupplierPerformanceList(params: SupplierAnalyticsFilterParams): Promise<SupplierPerformance[]> {
  const { data } = await apiClient.get<SupplierPerformance[]>(`${BASE}/performance`, { params });
  return data;
}

export async function getSupplierTrends(params: SupplierAnalyticsFilterParams & { supplierId: string; metricType: SupplierAnalyticsMetricType; period: SupplierAnalyticsPeriod }): Promise<SupplierTrendPoint[]> {
  const { data } = await apiClient.get<SupplierTrendPoint[]>(`${BASE}/trends`, { params });
  return data;
}

export async function getSupplierBreakdown(params: SupplierAnalyticsFilterParams & { dimension: SupplierAnalyticsDimension }): Promise<SupplierBreakdownRow[]> {
  const { data } = await apiClient.get<SupplierBreakdownRow[]>(`${BASE}/breakdown`, { params });
  return data;
}

export async function getSupplierComparison(params: {
  workspaceId: string;
  supplierId: string;
  startDate: string;
  endDate: string;
  comparisonType: SupplierComparisonType;
  comparisonStartDate?: string;
  comparisonEndDate?: string;
  currency?: string;
}): Promise<SupplierComparison> {
  const { data } = await apiClient.get<SupplierComparison>(`${BASE}/comparison`, { params });
  return data;
}

export async function getSupplierRanking(params: { workspaceId: string; startDate: string; endDate: string; period?: SupplierAnalyticsPeriod; category?: string; limit?: number }): Promise<SupplierRanking[]> {
  const { data } = await apiClient.get<SupplierRanking[]>(`${BASE}/ranking`, { params });
  return data;
}
