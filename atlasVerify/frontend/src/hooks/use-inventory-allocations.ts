import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as allocationsService from '@/services/inventory-allocations.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { AllocateInventoryPayload, InventoryAllocationFilterParams } from '@/types';
import { useToast } from './use-toast';

export function useInventoryAllocations(params: InventoryAllocationFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_ALLOCATIONS, params],
    queryFn: () => allocationsService.listAllocations(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useInventoryAllocation(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_ALLOCATIONS, id],
    queryFn: () => allocationsService.getAllocationById(id as string),
    enabled: !!id,
  });
}

export function useAllocationHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_ALLOCATIONS, id, 'history'],
    queryFn: () => allocationsService.getAllocationHistory(id as string),
    enabled: !!id,
  });
}

export function useAllocateInventory() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: AllocateInventoryPayload) => allocationsService.allocateInventory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_ALLOCATIONS] });
      toast.success('Inventory allocated');
    },
    onError: () => toast.error('Could not allocate inventory', 'Please try again.'),
  });
}

export function useReallocateInventory(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason?: string) => allocationsService.reallocateInventory(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_ALLOCATIONS] });
      toast.success('Reallocated');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useReleaseAllocation(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ quantity, reason }: { quantity?: number; reason?: string } = {}) => allocationsService.releaseAllocation(id, quantity, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_ALLOCATIONS] });
      toast.success('Allocation released');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useCancelAllocation(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason?: string) => allocationsService.cancelAllocation(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_ALLOCATIONS] });
      toast.success('Allocation cancelled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}
