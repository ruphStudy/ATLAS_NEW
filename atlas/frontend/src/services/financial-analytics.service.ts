import { apiClient } from '@/lib/api/axios';
import type {
  FinancialAlert,
  FinancialAnalyticsEventType,
  FinancialAnalyticsFilterParams,
  FinancialBreakdownRow,
  FinancialComparison,
  FinancialComparisonType,
  FinancialDimension,
  FinancialMetricType,
  FinancialPeriod,
  FinancialPerformance,
  FinancialTrendPoint,
} from '@/types';

const BASE = '/financial-analytics';

export async function getFinancialPerformance(params: FinancialAnalyticsFilterParams): Promise<FinancialPerformance[]> {
  const { data } = await apiClient.get<FinancialPerformance[]>(`${BASE}/performance`, { params });
  return data;
}

export async function getFinancialTrends(params: FinancialAnalyticsFilterParams & { metricType: FinancialMetricType; period: FinancialPeriod; dimension?: FinancialDimension; dimensionValue?: string }): Promise<FinancialTrendPoint[]> {
  const { data } = await apiClient.get<FinancialTrendPoint[]>(`${BASE}/trends`, { params });
  return data;
}

export async function getFinancialBreakdown(params: FinancialAnalyticsFilterParams & { dimension: FinancialDimension }): Promise<FinancialBreakdownRow[]> {
  const { data } = await apiClient.get<FinancialBreakdownRow[]>(`${BASE}/breakdown`, { params });
  return data;
}

export async function getFinancialComparison(params: {
  workspaceId: string;
  startDate: string;
  endDate: string;
  comparisonType: FinancialComparisonType;
  period?: FinancialPeriod;
  currency?: string;
  comparisonStartDate?: string;
  comparisonEndDate?: string;
  marketplaceId?: string;
  productId?: string;
}): Promise<FinancialComparison | null> {
  const { data } = await apiClient.get<FinancialComparison | null>(`${BASE}/comparison`, { params });
  return data;
}

export async function getFinancialAlerts(params: {
  workspaceId: string;
  startDate?: string;
  endDate?: string;
  alertTypes?: FinancialAnalyticsEventType[];
  severities?: string[];
  marketplaceIds?: string[];
  productIds?: string[];
  limit?: number;
}): Promise<FinancialAlert[]> {
  const { data } = await apiClient.get<FinancialAlert[]>(`${BASE}/alerts`, { params });
  return data;
}
