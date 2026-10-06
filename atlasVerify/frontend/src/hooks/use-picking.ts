import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as pickingService from '@/services/picking.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CreatePickingPayload, PickingFilterParams, RecordExceptionPayload } from '@/types';
import { useToast } from './use-toast';

export function usePickingTasks(params: PickingFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.PICKING, params],
    queryFn: () => pickingService.listPickingTasks(params),
    enabled: isAuthenticated,
    staleTime: 15 * 1000,
  });
}

export function usePickingTask(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PICKING, id],
    queryFn: () => pickingService.getPickingTaskById(id as string),
    enabled: !!id,
  });
}

export function usePickingExceptions(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PICKING, id, 'exceptions'],
    queryFn: () => pickingService.getPickingExceptions(id as string),
    enabled: !!id,
  });
}

export function useCreatePickingTask() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreatePickingPayload) => pickingService.createPickingTask(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PICKING] });
      toast.success('Picking task created');
    },
    onError: () => toast.error('Could not create task', 'Please try again.'),
  });
}

function usePickingAction<T = void>(id: string, action: (id: string, payload: T) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: T) => action(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PICKING] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useAssignPickingTask(id: string) {
  return usePickingAction<string>(id, pickingService.assignPickingTask, 'Task assigned');
}

export function useReleasePickingTask(id: string) {
  return usePickingAction(id, () => pickingService.releasePickingTask(id), 'Task released');
}

export function useStartPickingTask(id: string) {
  return usePickingAction(id, () => pickingService.startPickingTask(id), 'Task started');
}

export function usePausePickingTask(id: string) {
  return usePickingAction<string | undefined>(id, pickingService.pausePickingTask, 'Task paused');
}

export function useResumePickingTask(id: string) {
  return usePickingAction(id, () => pickingService.resumePickingTask(id), 'Task resumed');
}

export function useExecutePickingLine(id: string) {
  return usePickingAction<{ lineId: string; pickedQuantity: number }>(id, (taskId, payload) => pickingService.executePickingLine(taskId, payload.lineId, payload.pickedQuantity), 'Line picked');
}

export function useCompletePickingTask(id: string) {
  return usePickingAction(id, () => pickingService.completePickingTask(id), 'Task completed');
}

export function useCancelPickingTask(id: string) {
  return usePickingAction<string>(id, pickingService.cancelPickingTask, 'Task cancelled');
}

export function useReassignPickingTask(id: string) {
  return usePickingAction<string>(id, pickingService.reassignPickingTask, 'Task reassigned');
}

export function useRecordPickingException(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RecordExceptionPayload) => pickingService.recordPickingException(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PICKING, id, 'exceptions'] });
      toast.success('Exception recorded');
    },
    onError: () => toast.error('Could not record exception', 'Please try again.'),
  });
}

export function useScanPickingBarcode(id: string) {
  return usePickingAction<string>(id, pickingService.scanPickingBarcode, 'Scanned');
}
