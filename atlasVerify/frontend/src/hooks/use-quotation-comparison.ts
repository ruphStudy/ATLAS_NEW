import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as comparisonService from '@/services/quotation-comparison.service';
import { QUERY_KEYS } from '@/constants';
import type { CreateQuotationComparisonPayload, SelectSupplierPayload } from '@/types';
import { useToast } from './use-toast';

export function useLatestComparisonForRfq(rfqId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.QUOTATION_COMPARISONS, 'rfq', rfqId, 'latest'],
    queryFn: () => comparisonService.getLatestComparisonForRfq(rfqId as string),
    enabled: !!rfqId,
    retry: false,
  });
}

export function useComparisonHistoryForRfq(rfqId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.QUOTATION_COMPARISONS, 'rfq', rfqId, 'history'],
    queryFn: () => comparisonService.getComparisonHistoryForRfq(rfqId as string),
    enabled: !!rfqId,
  });
}

export function useCreateQuotationComparison(rfqId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateQuotationComparisonPayload) => comparisonService.createQuotationComparison(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.QUOTATION_COMPARISONS, 'rfq', rfqId] });
      toast.success('Comparison generated');
    },
    onError: () => toast.error('Could not generate comparison', 'Make sure the RFQ has supplier responses.'),
  });
}

export function useSelectComparisonSupplier(id: string, rfqId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: SelectSupplierPayload) => comparisonService.selectComparisonSupplier(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.QUOTATION_COMPARISONS, 'rfq', rfqId] });
      toast.success('Supplier selected');
    },
    onError: () => toast.error('Could not select supplier', 'Please try again.'),
  });
}
