import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as movementsService from '@/services/inventory-movements.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CreateMovementPayload, InventoryMovementFilterParams } from '@/types';
import { useToast } from './use-toast';

export function useInventoryMovements(params: InventoryMovementFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_MOVEMENTS, params],
    queryFn: () => movementsService.listMovements(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useInventoryMovement(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_MOVEMENTS, id],
    queryFn: () => movementsService.getMovementById(id as string),
    enabled: !!id,
  });
}

export function useMovementHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_MOVEMENTS, id, 'history'],
    queryFn: () => movementsService.getMovementHistory(id as string),
    enabled: !!id,
  });
}

export function useCreateMovement() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateMovementPayload) => movementsService.createMovement(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_MOVEMENTS] });
      toast.success('Movement created');
    },
    onError: () => toast.error('Could not create movement', 'Please check the form and try again.'),
  });
}

function useMovementAction(id: string, action: (id: string, value?: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (value?: string) => action(id, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_MOVEMENTS] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useApproveMovement(id: string) {
  return useMovementAction(id, movementsService.approveMovement, 'Movement approved');
}

export function useExecuteMovement(id: string) {
  return useMovementAction(id, movementsService.executeMovement, 'Movement executed');
}

export function useCancelMovement(id: string) {
  return useMovementAction(id, movementsService.cancelMovement, 'Movement cancelled');
}

export function useReverseMovement(id: string) {
  return useMovementAction(id, (movementId, reason) => movementsService.reverseMovement(movementId, reason as string), 'Movement reversed');
}
