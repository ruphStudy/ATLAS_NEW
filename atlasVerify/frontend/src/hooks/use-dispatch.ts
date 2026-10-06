import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as dispatchService from '@/services/dispatch.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CreateDispatchPayload, DispatchFilterParams, RecordExceptionPayload } from '@/types';
import { useToast } from './use-toast';

export function useDispatchTasks(params: DispatchFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.DISPATCH, params],
    queryFn: () => dispatchService.listDispatchTasks(params),
    enabled: isAuthenticated,
    staleTime: 15 * 1000,
  });
}

export function useDispatchTask(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.DISPATCH, id],
    queryFn: () => dispatchService.getDispatchTaskById(id as string),
    enabled: !!id,
  });
}

export function useDispatchPackages(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.DISPATCH, id, 'packages'],
    queryFn: () => dispatchService.getDispatchPackages(id as string),
    enabled: !!id,
  });
}

export function useDispatchExceptions(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.DISPATCH, id, 'exceptions'],
    queryFn: () => dispatchService.getDispatchExceptions(id as string),
    enabled: !!id,
  });
}

export function useCreateDispatchTask() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateDispatchPayload) => dispatchService.createDispatchTask(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DISPATCH] });
      toast.success('Dispatch task created');
    },
    onError: () => toast.error('Could not create task', 'Please try again.'),
  });
}

function useDispatchAction<T = void>(id: string, action: (id: string, payload: T) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: T) => action(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DISPATCH] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useAssignDispatchTask(id: string) {
  return useDispatchAction<string>(id, dispatchService.assignDispatchTask, 'Task assigned');
}

export function useStartDispatchTask(id: string) {
  return useDispatchAction(id, () => dispatchService.startDispatchTask(id), 'Task started');
}

export function useExecuteDispatchPackage(id: string) {
  return useDispatchAction<string>(id, dispatchService.executeDispatchPackage, 'Package dispatched');
}

export function useUpdateDispatchTask(id: string) {
  return useDispatchAction<{ carrierName?: string; serviceType?: string; pickupReference?: string; dispatchReference?: string }>(id, dispatchService.updateDispatchTask, 'Task updated');
}

export function useCompleteDispatchTask(id: string) {
  return useDispatchAction(id, () => dispatchService.completeDispatchTask(id), 'Task completed');
}

export function useCancelDispatchTask(id: string) {
  return useDispatchAction<string>(id, dispatchService.cancelDispatchTask, 'Task cancelled');
}

export function useReopenDispatchTask(id: string) {
  return useDispatchAction<string | undefined>(id, dispatchService.reopenDispatchTask, 'Task reopened');
}

export function useRecordDispatchException(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RecordExceptionPayload) => dispatchService.recordDispatchException(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DISPATCH, id, 'exceptions'] });
      toast.success('Exception recorded');
    },
    onError: () => toast.error('Could not record exception', 'Please try again.'),
  });
}

export function useScanDispatchBarcode(id: string) {
  return useDispatchAction<string>(id, dispatchService.scanDispatchBarcode, 'Scanned');
}
