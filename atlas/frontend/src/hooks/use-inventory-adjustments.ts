import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as adjustmentsService from '@/services/inventory-adjustments.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CreateAdjustmentPayload, InventoryAdjustmentFilterParams } from '@/types';
import { useToast } from './use-toast';

export function useInventoryAdjustments(params: InventoryAdjustmentFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_ADJUSTMENTS, params],
    queryFn: () => adjustmentsService.listAdjustments(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useInventoryAdjustment(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_ADJUSTMENTS, id],
    queryFn: () => adjustmentsService.getAdjustmentById(id as string),
    enabled: !!id,
  });
}

export function useAdjustmentHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_ADJUSTMENTS, id, 'history'],
    queryFn: () => adjustmentsService.getAdjustmentHistory(id as string),
    enabled: !!id,
  });
}

export function useCreateAdjustment() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateAdjustmentPayload) => adjustmentsService.createAdjustment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_ADJUSTMENTS] });
      toast.success('Adjustment created');
    },
    onError: () => toast.error('Could not create adjustment', 'Please check the form and try again.'),
  });
}

function useAdjustmentAction(id: string, action: (id: string, value?: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (value?: string) => action(id, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_ADJUSTMENTS] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useApproveAdjustment(id: string) {
  return useAdjustmentAction(id, adjustmentsService.approveAdjustment, 'Adjustment approved');
}

export function useRejectAdjustment(id: string) {
  return useAdjustmentAction(id, (adjId, reason) => adjustmentsService.rejectAdjustment(adjId, reason as string), 'Adjustment rejected');
}

export function usePostAdjustment(id: string) {
  return useAdjustmentAction(id, adjustmentsService.postAdjustment, 'Adjustment posted');
}

export function useCancelAdjustment(id: string) {
  return useAdjustmentAction(id, adjustmentsService.cancelAdjustment, 'Adjustment cancelled');
}

export function useReverseAdjustment(id: string) {
  return useAdjustmentAction(id, (adjId, reason) => adjustmentsService.reverseAdjustment(adjId, reason as string), 'Adjustment reversed');
}
