import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as putawayService from '@/services/putaway.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CreatePutawayPayload, PutawayFilterParams } from '@/types';
import { useToast } from './use-toast';

export function usePutawayTasks(params: PutawayFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.PUTAWAY, params],
    queryFn: () => putawayService.listPutawayTasks(params),
    enabled: isAuthenticated,
    staleTime: 15 * 1000,
  });
}

export function usePutawayTask(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PUTAWAY, id],
    queryFn: () => putawayService.getPutawayTaskById(id as string),
    enabled: !!id,
  });
}

export function useCreatePutawayTask() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreatePutawayPayload) => putawayService.createPutawayTask(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PUTAWAY] });
      toast.success('Putaway task created');
    },
    onError: () => toast.error('Could not create task', 'Please try again.'),
  });
}

export function useGeneratePutawayFromReceiving() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ receivingId, warehouseId }: { receivingId: string; warehouseId: string }) => putawayService.generatePutawayFromReceiving(receivingId, warehouseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PUTAWAY] });
      toast.success('Putaway task generated');
    },
    onError: () => toast.error('Could not generate task', 'Please try again.'),
  });
}

function usePutawayAction<T = void>(id: string, action: (id: string, payload: T) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: T) => action(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PUTAWAY] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useAssignPutawayTask(id: string) {
  return usePutawayAction<string>(id, putawayService.assignPutawayTask, 'Task assigned');
}

export function useStartPutawayTask(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => putawayService.startPutawayTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PUTAWAY] });
      toast.success('Task started');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useExecutePutawayLine(id: string) {
  return usePutawayAction<{ lineId: string; putawayQuantity: number; destinationBinId?: string; destinationLocationId?: string }>(
    id,
    (taskId, payload) => putawayService.executePutawayLine(taskId, payload.lineId, payload.putawayQuantity, payload.destinationBinId, payload.destinationLocationId),
    'Line put away',
  );
}

export function useCompletePutawayTask(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => putawayService.completePutawayTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PUTAWAY] });
      toast.success('Task completed');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useCancelPutawayTask(id: string) {
  return usePutawayAction<string>(id, putawayService.cancelPutawayTask, 'Task cancelled');
}

export function useReassignPutawayTask(id: string) {
  return usePutawayAction<string>(id, putawayService.reassignPutawayTask, 'Task reassigned');
}

export function useScanPutawayLocation(id: string) {
  return usePutawayAction<string>(id, putawayService.scanPutawayLocation, 'Scanned');
}
