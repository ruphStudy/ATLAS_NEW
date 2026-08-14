import { useQuery } from '@tanstack/react-query';
import * as financialService from '@/services/financial-analytics.service';
import { QUERY_KEYS } from '@/constants';
import type {
  FinancialAnalyticsEventType,
  FinancialAnalyticsFilterParams,
  FinancialComparisonType,
  FinancialDimension,
  FinancialMetricType,
  FinancialPeriod,
} from '@/types';

function hasRange(params: FinancialAnalyticsFilterParams) {
  return !!params.workspaceId && !!params.startDate && !!params.endDate;
}

export function useFinancialPerformance(params: FinancialAnalyticsFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.FINANCIAL_PERFORMANCE, params],
    queryFn: () => financialService.getFinancialPerformance(params),
    enabled: hasRange(params),
    staleTime: 30 * 1000,
  });
}

export function useFinancialTrends(params: FinancialAnalyticsFilterParams & { metricType: FinancialMetricType; period: FinancialPeriod; dimension?: FinancialDimension; dimensionValue?: string }) {
  return useQuery({
    queryKey: [QUERY_KEYS.FINANCIAL_TRENDS, params],
    queryFn: () => financialService.getFinancialTrends(params),
    enabled: hasRange(params),
  });
}

export function useFinancialBreakdown(params: FinancialAnalyticsFilterParams & { dimension: FinancialDimension }) {
  return useQuery({
    queryKey: [QUERY_KEYS.FINANCIAL_BREAKDOWN, params],
    queryFn: () => financialService.getFinancialBreakdown(params),
    enabled: hasRange(params),
  });
}

export function useFinancialComparison(params: {
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
} | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.FINANCIAL_COMPARISON, params],
    queryFn: () => financialService.getFinancialComparison(params!),
    enabled: !!params?.workspaceId && !!params?.startDate && !!params?.endDate,
  });
}

export function useFinancialAlerts(params: {
  workspaceId: string | undefined;
  startDate?: string;
  endDate?: string;
  alertTypes?: FinancialAnalyticsEventType[];
  severities?: string[];
  marketplaceIds?: string[];
  productIds?: string[];
  limit?: number;
}) {
  return useQuery({
    queryKey: [QUERY_KEYS.FINANCIAL_ALERTS, params],
    queryFn: () => financialService.getFinancialAlerts({ ...params, workspaceId: params.workspaceId as string }),
    enabled: !!params.workspaceId,
  });
}
