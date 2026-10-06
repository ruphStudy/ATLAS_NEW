import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as productCostService from '@/services/product-cost.service';
import { QUERY_KEYS } from '@/constants';
import type { CalculateProductCostPayload } from '@/types';
import { useToast } from './use-toast';

export function useProductCostHistoryByRfq(rfqId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PRODUCT_COST, 'rfq', rfqId, 'history'],
    queryFn: () => productCostService.getProductCostHistoryByRfq(rfqId as string),
    enabled: !!rfqId,
  });
}

export function useLatestProductCostByRfqSupplier(rfqSupplierId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PRODUCT_COST, 'rfq-supplier', rfqSupplierId, 'latest'],
    queryFn: () => productCostService.getLatestProductCostByRfqSupplier(rfqSupplierId as string),
    enabled: !!rfqSupplierId,
    retry: false,
  });
}

export function useLatestProductCostByProduct(productId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PRODUCT_COST, 'product', productId, 'latest'],
    queryFn: () => productCostService.getLatestProductCostByProduct(productId as string),
    enabled: !!productId,
    retry: false,
  });
}

export function useProductCostHistoryByProduct(productId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PRODUCT_COST, 'product', productId, 'history'],
    queryFn: () => productCostService.getProductCostHistoryByProduct(productId as string),
    enabled: !!productId,
  });
}

export function useCalculateProductCost() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CalculateProductCostPayload) => productCostService.calculateProductCost(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCT_COST] });
      toast.success('Landed cost calculated');
    },
    onError: () => toast.error('Could not calculate cost', 'Please check the inputs and try again.'),
  });
}

export function useDeleteProductCost() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => productCostService.deleteProductCost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCT_COST] });
      toast.success('Cost calculation deleted');
    },
    onError: () => toast.error('Could not delete calculation', 'Please try again.'),
  });
}
