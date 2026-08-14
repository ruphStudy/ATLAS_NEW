import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as costService from '@/services/ai-cost.service';
import { QUERY_KEYS } from '@/constants';
import type {
  AiCostRecordFilterParams,
  CostBudgetFilterParams,
  CostPricingConfigFilterParams,
  CostSummaryFilterParams,
  CreateCostBudgetPayload,
  CreateCostPricingConfigPayload,
  EstimateAiCostPayload,
  UpdateCostBudgetPayload,
  UpdateCostPricingConfigPayload,
} from '@/types';
import { useToast } from './use-toast';

export function useEstimateAiCost() {
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: EstimateAiCostPayload) => costService.estimateAiCost(payload),
    onError: () => toast.error('Could not estimate cost', 'Please try again.'),
  });
}

export function useCostRecords(params: AiCostRecordFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_COST_RECORDS, params],
    queryFn: () => costService.listCostRecords(params),
    enabled: !!params.workspaceId,
    staleTime: 15 * 1000,
  });
}

export function useCostRecord(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_COST_RECORDS, id],
    queryFn: () => costService.getCostRecordById(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useCostSummary(params: CostSummaryFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_COST_SUMMARY, params],
    queryFn: () => costService.getCostSummary(params),
    enabled: !!params.workspaceId,
  });
}

export function useCostPricingConfigs(params: CostPricingConfigFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_COST_PRICING_CONFIGS, params],
    queryFn: () => costService.listCostPricingConfigs(params),
    enabled: !!params.workspaceId,
  });
}

export function useCostPricingConfig(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_COST_PRICING_CONFIGS, id],
    queryFn: () => costService.getCostPricingConfigById(id as string),
    enabled: !!id,
  });
}

export function useCreateCostPricingConfig() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateCostPricingConfigPayload) => costService.createCostPricingConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_COST_PRICING_CONFIGS] });
      toast.success('Pricing config created');
    },
    onError: () => toast.error('Could not create pricing config', 'Please try again.'),
  });
}

export function useUpdateCostPricingConfig(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateCostPricingConfigPayload) => costService.updateCostPricingConfig(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_COST_PRICING_CONFIGS] });
      toast.success('Pricing config updated');
    },
    onError: () => toast.error('Could not update pricing config', 'Please try again.'),
  });
}

export function useDeleteCostPricingConfig() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => costService.deleteCostPricingConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_COST_PRICING_CONFIGS] });
      toast.success('Pricing config deleted');
    },
    onError: () => toast.error('Could not delete pricing config', 'Please try again.'),
  });
}

export function useCostBudgets(params: CostBudgetFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_COST_BUDGETS, params],
    queryFn: () => costService.listCostBudgets(params),
    enabled: !!params.workspaceId,
  });
}

export function useCostBudget(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_COST_BUDGETS, id],
    queryFn: () => costService.getCostBudgetById(id as string),
    enabled: !!id,
  });
}

export function useCreateCostBudget() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateCostBudgetPayload) => costService.createCostBudget(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_COST_BUDGETS] });
      toast.success('Budget created');
    },
    onError: () => toast.error('Could not create budget', 'Please try again.'),
  });
}

export function useUpdateCostBudget(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateCostBudgetPayload) => costService.updateCostBudget(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_COST_BUDGETS] });
      toast.success('Budget updated');
    },
    onError: () => toast.error('Could not update budget', 'Please try again.'),
  });
}

export function useDeleteCostBudget() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => costService.deleteCostBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_COST_BUDGETS] });
      toast.success('Budget deleted');
    },
    onError: () => toast.error('Could not delete budget', 'Please try again.'),
  });
}

export function useCostBudgetAlerts(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_COST_BUDGETS, id, 'alerts'],
    queryFn: () => costService.getCostBudgetAlerts(id as string),
    enabled: !!id,
  });
}
