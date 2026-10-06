import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as poService from '@/services/purchase-orders.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CreatePurchaseOrderPayload, PurchaseOrderFilterParams, UpdatePurchaseOrderPayload } from '@/types';
import { useToast } from './use-toast';

export function usePurchaseOrders(params: PurchaseOrderFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.PURCHASE_ORDERS, params],
    queryFn: () => poService.listPurchaseOrders(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function usePurchaseOrder(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PURCHASE_ORDERS, id],
    queryFn: () => poService.getPurchaseOrderById(id as string),
    enabled: !!id,
  });
}

export function usePurchaseOrderHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PURCHASE_ORDERS, id, 'history'],
    queryFn: () => poService.getPurchaseOrderHistory(id as string),
    enabled: !!id,
  });
}

export function usePurchaseOrderExport(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PURCHASE_ORDERS, id, 'export'],
    queryFn: () => poService.exportPurchaseOrder(id as string),
    enabled: !!id,
  });
}

export function usePurchaseOrderStats() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.PURCHASE_ORDERS, 'stats'],
    queryFn: poService.getPurchaseOrderStats,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreatePurchaseOrderPayload) => poService.createPurchaseOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_ORDERS] });
      toast.success('Purchase order created');
    },
    onError: () => toast.error('Could not create purchase order', 'Please check the form and try again.'),
  });
}

export function useUpdatePurchaseOrder(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdatePurchaseOrderPayload) => poService.updatePurchaseOrder(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_ORDERS] });
      toast.success('Purchase order updated');
    },
    onError: () => toast.error('Could not update purchase order', 'Please try again.'),
  });
}

function usePOAction(id: string, action: (id: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_ORDERS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_ORDERS, id, 'history'] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useSubmitPurchaseOrderForApproval(id: string) {
  return usePOAction(id, poService.submitPurchaseOrderForApproval, 'Submitted for approval');
}

export function useApprovePurchaseOrder(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (notes?: string) => poService.approvePurchaseOrder(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_ORDERS] });
      toast.success('Purchase order approved');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useIssuePurchaseOrder(id: string) {
  return usePOAction(id, poService.issuePurchaseOrder, 'Purchase order issued');
}

export function useAcknowledgePurchaseOrder(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (notes?: string) => poService.acknowledgePurchaseOrder(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_ORDERS] });
      toast.success('Purchase order acknowledged');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useMarkPurchaseOrderPartiallyFulfilled(id: string) {
  return usePOAction(id, poService.markPurchaseOrderPartiallyFulfilled, 'Marked as partially fulfilled');
}

export function useMarkPurchaseOrderFulfilled(id: string) {
  return usePOAction(id, poService.markPurchaseOrderFulfilled, 'Marked as fulfilled');
}

export function useClosePurchaseOrder(id: string) {
  return usePOAction(id, poService.closePurchaseOrder, 'Purchase order closed');
}

export function useCancelPurchaseOrder(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason: string) => poService.cancelPurchaseOrder(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_ORDERS] });
      toast.success('Purchase order cancelled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => poService.deletePurchaseOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_ORDERS] });
      toast.success('Purchase order deleted');
    },
    onError: () => toast.error('Could not delete purchase order', 'Please try again.'),
  });
}
