import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as cycleCountsService from '@/services/inventory-cycle-counts.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CreateCycleCountPayload, InventoryCycleCountFilterParams } from '@/types';
import { useToast } from './use-toast';

export function useCycleCounts(params: InventoryCycleCountFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_CYCLE_COUNTS, params],
    queryFn: () => cycleCountsService.listCycleCounts(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useCycleCount(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_CYCLE_COUNTS, id],
    queryFn: () => cycleCountsService.getCycleCountById(id as string),
    enabled: !!id,
  });
}

export function useCycleCountHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_CYCLE_COUNTS, id, 'history'],
    queryFn: () => cycleCountsService.getCycleCountHistory(id as string),
    enabled: !!id,
  });
}

export function useCycleCountLines(id: string | undefined, params: { page?: number; limit?: number; lineStatus?: string } = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_CYCLE_COUNTS, id, 'lines', params],
    queryFn: () => cycleCountsService.listCycleCountLines(id as string, params),
    enabled: !!id,
  });
}

export function useCreateCycleCount() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateCycleCountPayload) => cycleCountsService.createCycleCount(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_CYCLE_COUNTS] });
      toast.success('Cycle count created');
    },
    onError: () => toast.error('Could not create cycle count', 'Please try again.'),
  });
}

function useCycleCountAction<T = void>(id: string, action: (id: string, payload: T) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: T) => action(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_CYCLE_COUNTS] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useScheduleCycleCount(id: string) {
  return useCycleCountAction<string>(id, cycleCountsService.scheduleCycleCount, 'Cycle count scheduled');
}

export function useAssignCycleCount(id: string) {
  return useCycleCountAction<string>(id, cycleCountsService.assignCycleCount, 'Cycle count assigned');
}

export function useStartCycleCount(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => cycleCountsService.startCycleCount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_CYCLE_COUNTS] });
      toast.success('Cycle count started');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function usePauseCycleCount(id: string) {
  return useCycleCountAction<string | undefined>(id, cycleCountsService.pauseCycleCount, 'Cycle count paused');
}

export function useCompleteCycleCount(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => cycleCountsService.completeCycleCount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_CYCLE_COUNTS] });
      toast.success('Cycle count completed');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useApproveCycleCount(id: string) {
  return useCycleCountAction<string | undefined>(id, cycleCountsService.approveCycleCount, 'Cycle count approved');
}

export function useRejectCycleCount(id: string) {
  return useCycleCountAction<string>(id, cycleCountsService.rejectCycleCount, 'Cycle count rejected');
}

export function useCancelCycleCount(id: string) {
  return useCycleCountAction<string | undefined>(id, cycleCountsService.cancelCycleCount, 'Cycle count cancelled');
}

export function useSubmitCycleCountLine(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ lineId, countedQuantity, notes }: { lineId: string; countedQuantity: number; notes?: string }) => cycleCountsService.submitCycleCountLine(id, lineId, countedQuantity, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_CYCLE_COUNTS, id, 'lines'] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_CYCLE_COUNTS, id] });
      toast.success('Count submitted');
    },
    onError: () => toast.error('Could not submit count', 'Please try again.'),
  });
}

export function useFlagRecount(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ lineId, reason }: { lineId: string; reason?: string }) => cycleCountsService.flagRecount(id, lineId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_CYCLE_COUNTS, id, 'lines'] });
      toast.success('Recount flagged');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}
