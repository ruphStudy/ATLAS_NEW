import { apiClient } from '@/lib/api/axios';
import type {
  CreateProfitTargetPayload,
  LeakageType,
  ProfitAnalyticsFilterParams,
  ProfitBreakdownRow,
  ProfitComparison,
  ProfitComparisonType,
  ProfitDimension,
  ProfitLeakageRow,
  ProfitMetricType,
  ProfitPeriod,
  ProfitTarget,
  ProfitTargetPerformance,
  ProfitTrendPoint,
  ProfitabilityAnalysisRow,
  ProfitabilityCategory,
  ProfitSummary,
} from '@/types';

const BASE = '/profit-analytics';

export async function getProfitSummary(params: ProfitAnalyticsFilterParams): Promise<ProfitSummary> {
  const { data } = await apiClient.get<ProfitSummary>(`${BASE}/summary`, { params });
  return data;
}

export async function getProfitTrends(params: ProfitAnalyticsFilterParams & { metricType: ProfitMetricType; period: ProfitPeriod }): Promise<ProfitTrendPoint[]> {
  const { data } = await apiClient.get<ProfitTrendPoint[]>(`${BASE}/trends`, { params });
  return data;
}

export async function getProfitBreakdown(params: ProfitAnalyticsFilterParams & { dimension: ProfitDimension; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }): Promise<ProfitBreakdownRow[]> {
  const { data } = await apiClient.get<ProfitBreakdownRow[]>(`${BASE}/breakdown`, { params });
  return data;
}

export async function getProfitComparison(params: {
  workspaceId: string;
  currentStartDate: string;
  currentEndDate: string;
  comparisonType: ProfitComparisonType;
  comparisonStartDate?: string;
  comparisonEndDate?: string;
  marketplaceIds?: string[];
  accountIds?: string[];
  currency?: string;
}): Promise<ProfitComparison> {
  const { data } = await apiClient.get<ProfitComparison>(`${BASE}/comparison`, { params });
  return data;
}

export async function getProfitabilityAnalysis(params: ProfitAnalyticsFilterParams & { profitabilityCategory: ProfitabilityCategory; limit?: number }): Promise<ProfitabilityAnalysisRow[]> {
  const { data } = await apiClient.get<ProfitabilityAnalysisRow[]>(`${BASE}/profitability-analysis`, { params });
  return data;
}

export async function getProfitLeakage(params: ProfitAnalyticsFilterParams & { leakageType?: LeakageType; dimension?: ProfitDimension; minImpactAmount?: number; limit?: number }): Promise<ProfitLeakageRow[]> {
  const { data } = await apiClient.get<ProfitLeakageRow[]>(`${BASE}/leakage`, { params });
  return data;
}

export async function createProfitTarget(payload: CreateProfitTargetPayload): Promise<ProfitTarget> {
  const { data } = await apiClient.post<ProfitTarget>(`${BASE}/targets`, payload);
  return data;
}

export async function updateProfitTarget(id: string, workspaceId: string, payload: Partial<CreateProfitTargetPayload>): Promise<ProfitTarget> {
  const { data } = await apiClient.put<ProfitTarget>(`${BASE}/targets/${id}`, payload, { params: { workspaceId } });
  return data;
}

export async function getProfitTargetById(id: string, workspaceId: string): Promise<ProfitTarget> {
  const { data } = await apiClient.get<ProfitTarget>(`${BASE}/targets/${id}`, { params: { workspaceId } });
  return data;
}

export async function listProfitTargets(workspaceId: string, isActive?: boolean): Promise<ProfitTarget[]> {
  const { data } = await apiClient.get<ProfitTarget[]>(`${BASE}/targets`, { params: { workspaceId, isActive } });
  return data;
}

export async function deleteProfitTarget(id: string, workspaceId: string): Promise<void> {
  await apiClient.delete(`${BASE}/targets/${id}`, { params: { workspaceId } });
}

export async function getProfitTargetPerformance(id: string, workspaceId: string): Promise<ProfitTargetPerformance> {
  const { data } = await apiClient.get<ProfitTargetPerformance>(`${BASE}/targets/${id}/performance`, { params: { workspaceId } });
  return data;
}
