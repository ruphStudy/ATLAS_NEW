import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as salesService from '@/services/sales-analytics.service';
import { QUERY_KEYS } from '@/constants';
import type {
  CreateSalesSavedViewPayload,
  CreateSalesTargetPayload,
  ExportSalesDataPayload,
  ProductPerformanceCategory,
  SalesAnalyticsFilterParams,
  SalesBreakdownDimension,
  SalesComparisonType,
  SalesDrillDownParams,
  SalesMetricType,
  SalesTrendPeriod,
} from '@/types';
import { useToast } from './use-toast';

function hasRange(params: SalesAnalyticsFilterParams) {
  return !!params.workspaceId && !!params.startDate && !!params.endDate;
}

export function useSalesSummary(params: SalesAnalyticsFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.SALES_SUMMARY, params],
    queryFn: () => salesService.getSalesSummary(params),
    enabled: hasRange(params),
    staleTime: 30 * 1000,
  });
}

export function useSalesTrends(params: SalesAnalyticsFilterParams & { metricType: SalesMetricType; period: SalesTrendPeriod }) {
  return useQuery({
    queryKey: [QUERY_KEYS.SALES_TRENDS, params],
    queryFn: () => salesService.getSalesTrends(params),
    enabled: hasRange(params),
  });
}

export function useSalesBreakdown(params: SalesAnalyticsFilterParams & { dimension: SalesBreakdownDimension; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }) {
  return useQuery({
    queryKey: [QUERY_KEYS.SALES_BREAKDOWN, params],
    queryFn: () => salesService.getSalesBreakdown(params),
    enabled: hasRange(params),
  });
}

export function useSalesComparison(params: {
  workspaceId: string;
  currentStartDate: string;
  currentEndDate: string;
  comparisonType: SalesComparisonType;
  comparisonStartDate?: string;
  comparisonEndDate?: string;
  marketplaceIds?: string[];
  accountIds?: string[];
  currency?: string;
} | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.SALES_COMPARISON, params],
    queryFn: () => salesService.getSalesComparison(params!),
    enabled: !!params?.workspaceId && !!params?.currentStartDate && !!params?.currentEndDate,
  });
}

export function useProductPerformance(params: SalesAnalyticsFilterParams & { performanceCategory: ProductPerformanceCategory; limit?: number }) {
  return useQuery({
    queryKey: [QUERY_KEYS.SALES_PRODUCT_PERFORMANCE, params],
    queryFn: () => salesService.getProductPerformance(params),
    enabled: hasRange(params),
  });
}

export function useSalesTargets(workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.SALES_TARGETS, workspaceId],
    queryFn: () => salesService.listSalesTargets(workspaceId as string),
    enabled: !!workspaceId,
  });
}

export function useCreateSalesTarget() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateSalesTargetPayload) => salesService.createSalesTarget(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SALES_TARGETS] });
      toast.success('Sales target created');
    },
    onError: () => toast.error('Could not create target', 'Please try again.'),
  });
}

export function useDeleteSalesTarget(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => salesService.deleteSalesTarget(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SALES_TARGETS] });
      toast.success('Sales target deleted');
    },
    onError: () => toast.error('Could not delete target', 'Please try again.'),
  });
}

export function useSalesTargetPerformance(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.SALES_TARGETS, id, 'performance'],
    queryFn: () => salesService.getSalesTargetPerformance(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useSalesSavedViews(workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.SALES_SAVED_VIEWS, workspaceId],
    queryFn: () => salesService.listSalesSavedViews(workspaceId as string),
    enabled: !!workspaceId,
  });
}

export function useCreateSalesSavedView() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateSalesSavedViewPayload) => salesService.createSalesSavedView(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SALES_SAVED_VIEWS] });
      toast.success('Saved view created');
    },
    onError: () => toast.error('Could not save view', 'Please try again.'),
  });
}

export function useDeleteSalesSavedView(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => salesService.deleteSalesSavedView(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SALES_SAVED_VIEWS] });
      toast.success('Saved view deleted');
    },
    onError: () => toast.error('Could not delete view', 'Please try again.'),
  });
}

export function useSalesDrillDown(params: SalesDrillDownParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.SALES_DRILL_DOWN, params],
    queryFn: () => salesService.getSalesDrillDownOrders(params),
    enabled: !!params.workspaceId && !!params.startDate && !!params.endDate,
  });
}

export function useExportSalesData() {
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ExportSalesDataPayload) => salesService.exportSalesData(payload),
    onSuccess: () => toast.success('Export ready', 'Your download link is ready below.'),
    onError: () => toast.error('Export failed', 'Please try again.'),
  });
}
