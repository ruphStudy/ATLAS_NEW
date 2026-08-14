import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as transfersService from '@/services/inventory-transfers.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CreateInventoryTransferPayload, InventoryTransferFilterParams, ReceiveTransferLineInput } from '@/types';
import { useToast } from './use-toast';

export function useInventoryTransfers(params: InventoryTransferFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_TRANSFERS, params],
    queryFn: () => transfersService.listInventoryTransfers(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useInventoryTransfer(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_TRANSFERS, id],
    queryFn: () => transfersService.getInventoryTransferById(id as string),
    enabled: !!id,
  });
}

export function useInventoryTransferHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_TRANSFERS, id, 'history'],
    queryFn: () => transfersService.getInventoryTransferHistory(id as string),
    enabled: !!id,
  });
}

export function useCreateInventoryTransfer() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateInventoryTransferPayload) => transfersService.createInventoryTransfer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_TRANSFERS] });
      toast.success('Transfer created');
    },
    onError: () => toast.error('Could not create transfer', 'Please check the form and try again.'),
  });
}

export function useApproveInventoryTransfer(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (notes?: string) => transfersService.approveInventoryTransfer(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_TRANSFERS] });
      toast.success('Transfer approved');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useDispatchInventoryTransfer(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ shipmentReference, notes }: { shipmentReference?: string; notes?: string } = {}) => transfersService.dispatchInventoryTransfer(id, shipmentReference, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_TRANSFERS] });
      toast.success('Transfer dispatched');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useReceiveInventoryTransfer(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ lines, notes }: { lines: ReceiveTransferLineInput[]; notes?: string }) => transfersService.receiveInventoryTransfer(id, lines, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_TRANSFERS] });
      toast.success('Transfer received');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useCancelInventoryTransfer(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason: string) => transfersService.cancelInventoryTransfer(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_TRANSFERS] });
      toast.success('Transfer cancelled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useReverseInventoryTransfer(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason: string) => transfersService.reverseInventoryTransfer(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_TRANSFERS] });
      toast.success('Transfer reversed');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}
