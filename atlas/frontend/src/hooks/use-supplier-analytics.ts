import { useQuery } from '@tanstack/react-query';
import * as analyticsService from '@/services/supplier-analytics.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type {
  SupplierAnalyticsDimension,
  SupplierAnalyticsFilterParams,
  SupplierAnalyticsMetricType,
  SupplierAnalyticsPeriod,
  SupplierComparisonType,
} from '@/types';

/** Defaults to the trailing 90 days — the backend requires an explicit date range with no server-side default. */
export function useSupplierPerformance(supplierId: string | undefined) {
  const workspaceId = useAuthStore((s) => s.user?.workspaceId);
  return useQuery({
    queryKey: [QUERY_KEYS.SUPPLIER_ANALYTICS, 'performance', supplierId, workspaceId],
    queryFn: () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);
      return analyticsService.getSupplierPerformance({
        workspaceId: workspaceId as string,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        supplierIds: [supplierId as string],
      });
    },
    enabled: !!supplierId && !!workspaceId,
    retry: false,
  });
}

function hasRange(params: SupplierAnalyticsFilterParams | undefined): params is SupplierAnalyticsFilterParams {
  return !!params?.workspaceId && !!params?.startDate && !!params?.endDate;
}

export function useSupplierPerformanceList(params: SupplierAnalyticsFilterParams | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.SUPPLIER_ANALYTICS, 'performance-list', params],
    queryFn: () => analyticsService.getSupplierPerformanceList(params as SupplierAnalyticsFilterParams),
    enabled: hasRange(params),
  });
}

export function useSupplierTrends(
  params: (SupplierAnalyticsFilterParams & { supplierId: string; metricType: SupplierAnalyticsMetricType; period: SupplierAnalyticsPeriod }) | undefined,
) {
  return useQuery({
    queryKey: [QUERY_KEYS.SUPPLIER_ANALYTICS, 'trends', params],
    queryFn: () => analyticsService.getSupplierTrends(params!),
    enabled: hasRange(params) && !!params?.supplierId,
  });
}

export function useSupplierBreakdown(params: (SupplierAnalyticsFilterParams & { dimension: SupplierAnalyticsDimension }) | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.SUPPLIER_ANALYTICS, 'breakdown', params],
    queryFn: () => analyticsService.getSupplierBreakdown(params!),
    enabled: hasRange(params),
  });
}

export function useSupplierComparison(
  params:
    | {
        workspaceId: string;
        supplierId: string;
        startDate: string;
        endDate: string;
        comparisonType: SupplierComparisonType;
        comparisonStartDate?: string;
        comparisonEndDate?: string;
        currency?: string;
      }
    | undefined,
) {
  return useQuery({
    queryKey: [QUERY_KEYS.SUPPLIER_ANALYTICS, 'comparison', params],
    queryFn: () => analyticsService.getSupplierComparison(params!),
    enabled: !!params?.workspaceId && !!params?.supplierId && !!params?.startDate && !!params?.endDate,
  });
}

export function useSupplierRanking(params: { workspaceId: string; startDate: string; endDate: string; period?: SupplierAnalyticsPeriod; category?: string; limit?: number } | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.SUPPLIER_ANALYTICS, 'ranking', params],
    queryFn: () => analyticsService.getSupplierRanking(params!),
    enabled: !!params?.workspaceId && !!params?.startDate && !!params?.endDate,
  });
}
