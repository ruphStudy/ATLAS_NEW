import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as pricingService from '@/services/pricing.service';
import { QUERY_KEYS } from '@/constants';
import type {
  CalculatePricingPayload,
  CreatePricingConfigPayload,
  PricingConfigFilterParams,
  PricingRecordFilterParams,
  SimulatePricingPayload,
  UpdatePricingConfigPayload,
} from '@/types';
import { useToast } from './use-toast';

export function usePricingConfigs(params: PricingConfigFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.PRICING_CONFIGS, params],
    queryFn: () => pricingService.listPricingConfigs(params),
    staleTime: 60 * 1000,
  });
}

export function usePricingConfig(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PRICING_CONFIGS, id],
    queryFn: () => pricingService.getPricingConfigById(id as string),
    enabled: !!id,
  });
}

export function useCreatePricingConfig() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreatePricingConfigPayload) => pricingService.createPricingConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRICING_CONFIGS] });
      toast.success('Pricing config created');
    },
    onError: () => toast.error('Could not create config', 'Please try again.'),
  });
}

export function useUpdatePricingConfig(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdatePricingConfigPayload) => pricingService.updatePricingConfig(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRICING_CONFIGS] });
      toast.success('Pricing config updated');
    },
    onError: () => toast.error('Could not update config', 'Please try again.'),
  });
}

export function useDeletePricingConfig() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => pricingService.deletePricingConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRICING_CONFIGS] });
      toast.success('Pricing config deleted');
    },
    onError: () => toast.error('Could not delete config', 'Please try again.'),
  });
}

export function useCalculatePricing() {
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CalculatePricingPayload) => pricingService.calculatePricing(payload),
    onError: () => toast.error('Calculation failed', 'Please check the inputs and try again.'),
  });
}

export function useSimulatePricing() {
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: SimulatePricingPayload) => pricingService.simulatePricing(payload),
    onError: () => toast.error('Simulation failed', 'Please check the inputs and try again.'),
  });
}

export function useBulkCalculatePricing() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (items: CalculatePricingPayload[]) => pricingService.bulkCalculatePricing(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRICING_RECORDS] });
      toast.success('Bulk price update submitted');
    },
    onError: () => toast.error('Bulk update failed', 'Please check the inputs and try again.'),
  });
}

export function usePricingRecords(params: PricingRecordFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.PRICING_RECORDS, params],
    queryFn: () => pricingService.listPricingRecords(params),
    staleTime: 30 * 1000,
  });
}

export function usePricingRecord(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PRICING_RECORDS, id],
    queryFn: () => pricingService.getPricingRecordById(id as string),
    enabled: !!id,
  });
}

export function usePricingRecordHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PRICING_RECORDS, id, 'history'],
    queryFn: () => pricingService.getPricingRecordHistory(id as string),
    enabled: !!id,
  });
}

export function useApprovePricingRecord(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (notes?: string) => pricingService.approvePricingRecord(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRICING_RECORDS] });
      toast.success('Pricing record approved');
    },
    onError: () => toast.error('Approval failed', 'Please try again.'),
  });
}

export function useArchivePricingRecord(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason?: string) => pricingService.archivePricingRecord(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRICING_RECORDS] });
      toast.success('Pricing record archived');
    },
    onError: () => toast.error('Archive failed', 'Please try again.'),
  });
}

export function usePricingComparison(catalogProductId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PRICING_RECORDS, 'compare', catalogProductId],
    queryFn: () => pricingService.compareAcrossMarketplaces(catalogProductId as string),
    enabled: !!catalogProductId,
  });
}
