import { apiClient } from '@/lib/api/axios';
import type {
  CohortRetention,
  ExportTenantAnalyticsParams,
  PlanComparisonRow,
  TenantAnalyticsDateRangeParams,
  TenantChurnMetrics,
  TenantGrowthMetrics,
  TenantHealthSnapshot,
  TenantPaymentHealth,
  TenantQuotaLicenseAdoption,
  TenantRevenueMetrics,
  TenantSegmentFilterParams,
  TenantSegmentListResult,
  TenantUsageBreakdownEntry,
} from '@/types';

const BASE = '/tenant-analytics';

export async function getTenantGrowth(params: TenantAnalyticsDateRangeParams = {}): Promise<TenantGrowthMetrics> {
  const { data } = await apiClient.get<TenantGrowthMetrics>(`${BASE}/growth`, { params });
  return data;
}

export async function getTenantRevenue(params: TenantAnalyticsDateRangeParams = {}): Promise<TenantRevenueMetrics> {
  const { data } = await apiClient.get<TenantRevenueMetrics>(`${BASE}/revenue`, { params });
  return data;
}

export async function getTenantChurn(params: TenantAnalyticsDateRangeParams = {}): Promise<TenantChurnMetrics> {
  const { data } = await apiClient.get<TenantChurnMetrics>(`${BASE}/churn`, { params });
  return data;
}

export async function getTenantPaymentHealth(params: TenantAnalyticsDateRangeParams = {}): Promise<TenantPaymentHealth> {
  const { data } = await apiClient.get<TenantPaymentHealth>(`${BASE}/payment-health`, { params });
  return data;
}

export async function getTenantUsageBreakdown(params: TenantAnalyticsDateRangeParams & { resourceKey?: string } = {}): Promise<TenantUsageBreakdownEntry[]> {
  const { data } = await apiClient.get<TenantUsageBreakdownEntry[]>(`${BASE}/usage`, { params });
  return data;
}

export async function getQuotaLicenseAdoption(): Promise<TenantQuotaLicenseAdoption[]> {
  const { data } = await apiClient.get<TenantQuotaLicenseAdoption[]>(`${BASE}/quota-license-adoption`);
  return data;
}

export async function getTenantSegments(params: TenantSegmentFilterParams = {}): Promise<TenantSegmentListResult> {
  const { data } = await apiClient.get<TenantSegmentListResult>(`${BASE}/segments`, { params });
  return data;
}

export async function getTenantHealthScore(workspaceId: string): Promise<TenantHealthSnapshot> {
  const { data } = await apiClient.get<TenantHealthSnapshot>(`${BASE}/tenants/${workspaceId}/health-score`);
  return data;
}

export async function getCohortRetention(cohortMonth: string): Promise<CohortRetention> {
  const { data } = await apiClient.get<CohortRetention>(`${BASE}/cohort-retention`, { params: { cohortMonth } });
  return data;
}

export async function getPlanComparison(): Promise<PlanComparisonRow[]> {
  const { data } = await apiClient.get<PlanComparisonRow[]>(`${BASE}/plan-comparison`);
  return data;
}

export async function exportTenantAnalytics(params: ExportTenantAnalyticsParams): Promise<Blob> {
  const { data } = await apiClient.get(`${BASE}/export`, { params, responseType: 'blob' });
  return data;
}
