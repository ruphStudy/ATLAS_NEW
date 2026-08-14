import { useMutation, useQuery } from '@tanstack/react-query';
import * as tenantAnalyticsService from '@/services/tenant-analytics.service';
import { QUERY_KEYS } from '@/constants';
import { useToast } from './use-toast';
import type { ExportTenantAnalyticsParams, TenantAnalyticsDateRangeParams, TenantSegmentFilterParams } from '@/types';

export function useTenantGrowth(params: TenantAnalyticsDateRangeParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.TENANT_ANALYTICS, 'growth', params],
    queryFn: () => tenantAnalyticsService.getTenantGrowth(params),
  });
}

export function useTenantRevenue(params: TenantAnalyticsDateRangeParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.TENANT_ANALYTICS, 'revenue', params],
    queryFn: () => tenantAnalyticsService.getTenantRevenue(params),
  });
}

export function useTenantChurn(params: TenantAnalyticsDateRangeParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.TENANT_ANALYTICS, 'churn', params],
    queryFn: () => tenantAnalyticsService.getTenantChurn(params),
  });
}

export function useTenantPaymentHealth(params: TenantAnalyticsDateRangeParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.TENANT_ANALYTICS, 'payment-health', params],
    queryFn: () => tenantAnalyticsService.getTenantPaymentHealth(params),
  });
}

export function useTenantUsageBreakdown(params: TenantAnalyticsDateRangeParams & { resourceKey?: string } = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.TENANT_ANALYTICS, 'usage', params],
    queryFn: () => tenantAnalyticsService.getTenantUsageBreakdown(params),
  });
}

export function useQuotaLicenseAdoption() {
  return useQuery({
    queryKey: [QUERY_KEYS.TENANT_ANALYTICS, 'quota-license-adoption'],
    queryFn: () => tenantAnalyticsService.getQuotaLicenseAdoption(),
  });
}

export function useTenantSegments(params: TenantSegmentFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.TENANT_SEGMENTS, params],
    queryFn: () => tenantAnalyticsService.getTenantSegments(params),
    staleTime: 30 * 1000,
  });
}

export function useTenantHealthScore(workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.TENANT_ANALYTICS, 'health-score', workspaceId],
    queryFn: () => tenantAnalyticsService.getTenantHealthScore(workspaceId as string),
    enabled: !!workspaceId,
  });
}

export function useCohortRetention(cohortMonth: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.TENANT_ANALYTICS, 'cohort-retention', cohortMonth],
    queryFn: () => tenantAnalyticsService.getCohortRetention(cohortMonth as string),
    enabled: !!cohortMonth,
  });
}

export function usePlanComparison() {
  return useQuery({
    queryKey: [QUERY_KEYS.TENANT_ANALYTICS, 'plan-comparison'],
    queryFn: () => tenantAnalyticsService.getPlanComparison(),
  });
}

export function useExportTenantAnalytics() {
  const toast = useToast();
  return useMutation({
    mutationFn: (params: ExportTenantAnalyticsParams) => tenantAnalyticsService.exportTenantAnalytics(params),
    onError: () => toast.error('Export failed', 'Please try again.'),
  });
}
