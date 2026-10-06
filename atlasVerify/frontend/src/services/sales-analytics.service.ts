import { apiClient } from '@/lib/api/axios';
import type {
  CreateSalesSavedViewPayload,
  CreateSalesTargetPayload,
  ExportResult,
  ExportSalesDataPayload,
  ProductPerformanceRow,
  SalesAnalyticsFilterParams,
  SalesBreakdownDimension,
  SalesBreakdownRow,
  SalesComparison,
  SalesComparisonType,
  SalesDrillDownParams,
  SalesDrillDownResult,
  SalesMetricType,
  SalesSavedView,
  SalesSummary,
  SalesTarget,
  SalesTargetPerformance,
  SalesTrendPeriod,
  SalesTrendPoint,
  ProductPerformanceCategory,
} from '@/types';

const BASE = '/sales-analytics';

export async function getSalesSummary(params: SalesAnalyticsFilterParams): Promise<SalesSummary> {
  const { data } = await apiClient.post<SalesSummary>(`${BASE}/summary`, params);
  return data;
}

export async function getSalesTrends(params: SalesAnalyticsFilterParams & { metricType: SalesMetricType; period: SalesTrendPeriod }): Promise<SalesTrendPoint[]> {
  const { data } = await apiClient.post<SalesTrendPoint[]>(`${BASE}/trends`, params);
  return data;
}

export async function getSalesBreakdown(params: SalesAnalyticsFilterParams & { dimension: SalesBreakdownDimension; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }): Promise<SalesBreakdownRow[]> {
  const { data } = await apiClient.post<SalesBreakdownRow[]>(`${BASE}/breakdown`, params);
  return data;
}

export async function getSalesComparison(params: {
  workspaceId: string;
  currentStartDate: string;
  currentEndDate: string;
  comparisonType: SalesComparisonType;
  comparisonStartDate?: string;
  comparisonEndDate?: string;
  marketplaceIds?: string[];
  accountIds?: string[];
  currency?: string;
}): Promise<SalesComparison> {
  const { data } = await apiClient.post<SalesComparison>(`${BASE}/comparison`, params);
  return data;
}

export async function getProductPerformance(params: SalesAnalyticsFilterParams & { performanceCategory: ProductPerformanceCategory; limit?: number }): Promise<ProductPerformanceRow[]> {
  const { data } = await apiClient.post<ProductPerformanceRow[]>(`${BASE}/product-performance`, params);
  return data;
}

export async function createSalesTarget(payload: CreateSalesTargetPayload): Promise<SalesTarget> {
  const { data } = await apiClient.post<SalesTarget>(`${BASE}/targets`, payload);
  return data;
}

export async function updateSalesTarget(id: string, workspaceId: string, payload: Partial<CreateSalesTargetPayload>): Promise<SalesTarget> {
  const { data } = await apiClient.put<SalesTarget>(`${BASE}/targets/${id}`, payload, { params: { workspaceId } });
  return data;
}

export async function getSalesTargetById(id: string, workspaceId: string): Promise<SalesTarget> {
  const { data } = await apiClient.get<SalesTarget>(`${BASE}/targets/${id}`, { params: { workspaceId } });
  return data;
}

export async function listSalesTargets(workspaceId: string): Promise<SalesTarget[]> {
  const { data } = await apiClient.get<SalesTarget[]>(`${BASE}/targets`, { params: { workspaceId } });
  return data;
}

export async function deleteSalesTarget(id: string, workspaceId: string): Promise<void> {
  await apiClient.delete(`${BASE}/targets/${id}`, { params: { workspaceId } });
}

export async function getSalesTargetPerformance(id: string, workspaceId: string): Promise<SalesTargetPerformance> {
  const { data } = await apiClient.get<SalesTargetPerformance>(`${BASE}/targets/${id}/performance`, { params: { workspaceId } });
  return data;
}

export async function createSalesSavedView(payload: CreateSalesSavedViewPayload): Promise<SalesSavedView> {
  const { data } = await apiClient.post<SalesSavedView>(`${BASE}/saved-views`, payload);
  return data;
}

export async function listSalesSavedViews(workspaceId: string): Promise<SalesSavedView[]> {
  const { data } = await apiClient.get<SalesSavedView[]>(`${BASE}/saved-views`, { params: { workspaceId } });
  return data;
}

export async function deleteSalesSavedView(id: string, workspaceId: string): Promise<void> {
  await apiClient.delete(`${BASE}/saved-views/${id}`, { params: { workspaceId } });
}

export async function getSalesDrillDownOrders(params: SalesDrillDownParams): Promise<SalesDrillDownResult> {
  const { data } = await apiClient.post<SalesDrillDownResult>(`${BASE}/drill-down/orders`, params);
  return data;
}

export async function exportSalesData(payload: ExportSalesDataPayload): Promise<ExportResult> {
  const { data } = await apiClient.post<ExportResult>(`${BASE}/export`, payload);
  return data;
}
