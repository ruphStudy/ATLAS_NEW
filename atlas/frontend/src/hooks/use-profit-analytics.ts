import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as profitService from '@/services/profit-analytics.service';
import { QUERY_KEYS } from '@/constants';
import type {
  CreateProfitTargetPayload,
  LeakageType,
  ProfitAnalyticsFilterParams,
  ProfitComparisonType,
  ProfitDimension,
  ProfitMetricType,
  ProfitPeriod,
  ProfitabilityCategory,
} from '@/types';
import { useToast } from './use-toast';

function hasRange(params: ProfitAnalyticsFilterParams) {
  return !!params.workspaceId && !!params.startDate && !!params.endDate;
}

export function useProfitSummary(params: ProfitAnalyticsFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.PROFIT_SUMMARY, params],
    queryFn: () => profitService.getProfitSummary(params),
    enabled: hasRange(params),
    staleTime: 30 * 1000,
  });
}

export function useProfitTrends(params: ProfitAnalyticsFilterParams & { metricType: ProfitMetricType; period: ProfitPeriod }) {
  return useQuery({
    queryKey: [QUERY_KEYS.PROFIT_TRENDS, params],
    queryFn: () => profitService.getProfitTrends(params),
    enabled: hasRange(params),
  });
}

export function useProfitBreakdown(params: ProfitAnalyticsFilterParams & { dimension: ProfitDimension; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }) {
  return useQuery({
    queryKey: [QUERY_KEYS.PROFIT_BREAKDOWN, params],
    queryFn: () => profitService.getProfitBreakdown(params),
    enabled: hasRange(params),
  });
}

export function useProfitComparison(params: {
  workspaceId: string;
  currentStartDate: string;
  currentEndDate: string;
  comparisonType: ProfitComparisonType;
  comparisonStartDate?: string;
  comparisonEndDate?: string;
  marketplaceIds?: string[];
  accountIds?: string[];
  currency?: string;
} | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PROFIT_COMPARISON, params],
    queryFn: () => profitService.getProfitComparison(params!),
    enabled: !!params?.workspaceId && !!params?.currentStartDate && !!params?.currentEndDate,
  });
}

export function useProfitabilityAnalysis(params: ProfitAnalyticsFilterParams & { profitabilityCategory: ProfitabilityCategory; limit?: number }) {
  return useQuery({
    queryKey: [QUERY_KEYS.PROFITABILITY_ANALYSIS, params],
    queryFn: () => profitService.getProfitabilityAnalysis(params),
    enabled: hasRange(params),
  });
}

export function useProfitLeakage(params: ProfitAnalyticsFilterParams & { leakageType?: LeakageType; dimension?: ProfitDimension; minImpactAmount?: number; limit?: number }) {
  return useQuery({
    queryKey: [QUERY_KEYS.PROFIT_LEAKAGE, params],
    queryFn: () => profitService.getProfitLeakage(params),
    enabled: hasRange(params),
  });
}

export function useProfitTargets(workspaceId: string | undefined, isActive?: boolean) {
  return useQuery({
    queryKey: [QUERY_KEYS.PROFIT_TARGETS, workspaceId, isActive],
    queryFn: () => profitService.listProfitTargets(workspaceId as string, isActive),
    enabled: !!workspaceId,
  });
}

export function useCreateProfitTarget() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateProfitTargetPayload) => profitService.createProfitTarget(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROFIT_TARGETS] });
      toast.success('Profit target created');
    },
    onError: () => toast.error('Could not create target', 'Please try again.'),
  });
}

export function useDeleteProfitTarget(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => profitService.deleteProfitTarget(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROFIT_TARGETS] });
      toast.success('Profit target deleted');
    },
    onError: () => toast.error('Could not delete target', 'Please try again.'),
  });
}

export function useProfitTargetPerformance(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PROFIT_TARGETS, id, 'performance'],
    queryFn: () => profitService.getProfitTargetPerformance(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}
