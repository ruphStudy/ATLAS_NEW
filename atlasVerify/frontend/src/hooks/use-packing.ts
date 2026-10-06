import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as packingService from '@/services/packing.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CreatePackagePayload, CreatePackingPayload, PackingFilterParams, RecordExceptionPayload } from '@/types';
import { useToast } from './use-toast';

export function usePackingTasks(params: PackingFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.PACKING, params],
    queryFn: () => packingService.listPackingTasks(params),
    enabled: isAuthenticated,
    staleTime: 15 * 1000,
  });
}

export function usePackingTask(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PACKING, id],
    queryFn: () => packingService.getPackingTaskById(id as string),
    enabled: !!id,
  });
}

export function usePackingTaskPackages(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PACKING, id, 'packages'],
    queryFn: () => packingService.getPackingTaskPackages(id as string),
    enabled: !!id,
  });
}

export function usePackingExceptions(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PACKING, id, 'exceptions'],
    queryFn: () => packingService.getPackingExceptions(id as string),
    enabled: !!id,
  });
}

export function useCreatePackingTask() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreatePackingPayload) => packingService.createPackingTask(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PACKING] });
      toast.success('Packing task created');
    },
    onError: () => toast.error('Could not create task', 'Please try again.'),
  });
}

function usePackingAction<T = void>(id: string, action: (id: string, payload: T) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: T) => action(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PACKING] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useAssignPackingTask(id: string) {
  return usePackingAction<string>(id, packingService.assignPackingTask, 'Task assigned');
}

export function useStartPackingTask(id: string) {
  return usePackingAction(id, () => packingService.startPackingTask(id), 'Task started');
}

export function usePausePackingTask(id: string) {
  return usePackingAction<string | undefined>(id, packingService.pausePackingTask, 'Task paused');
}

export function useResumePackingTask(id: string) {
  return usePackingAction(id, () => packingService.resumePackingTask(id), 'Task resumed');
}

export function useExecutePackingLine(id: string) {
  return usePackingAction<{ lineId: string; packedQuantity: number; packageId?: string }>(
    id,
    (taskId, payload) => packingService.executePackingLine(taskId, payload.lineId, payload.packedQuantity, payload.packageId),
    'Line packed',
  );
}

export function useCreatePackingPackage(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreatePackagePayload) => packingService.createPackingPackage(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PACKING, id, 'packages'] });
      toast.success('Package created');
    },
    onError: () => toast.error('Could not create package', 'Please try again.'),
  });
}

export function useUpdatePackingPackage(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ packageId, payload }: { packageId: string; payload: Partial<CreatePackagePayload> }) => packingService.updatePackingPackage(id, packageId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PACKING, id, 'packages'] });
      toast.success('Package updated');
    },
    onError: () => toast.error('Could not update package', 'Please try again.'),
  });
}

export function useCompletePackingTask(id: string) {
  return usePackingAction(id, () => packingService.completePackingTask(id), 'Task completed');
}

export function useCancelPackingTask(id: string) {
  return usePackingAction<string>(id, packingService.cancelPackingTask, 'Task cancelled');
}

export function useReopenPackingTask(id: string) {
  return usePackingAction<string | undefined>(id, packingService.reopenPackingTask, 'Task reopened');
}

export function useRecordPackingException(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RecordExceptionPayload) => packingService.recordPackingException(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PACKING, id, 'exceptions'] });
      toast.success('Exception recorded');
    },
    onError: () => toast.error('Could not record exception', 'Please try again.'),
  });
}

export function useScanPackingBarcode(id: string) {
  return usePackingAction<string>(id, packingService.scanPackingBarcode, 'Scanned');
}
