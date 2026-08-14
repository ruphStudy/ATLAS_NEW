import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as reconciliationsService from '@/services/inventory-reconciliations.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CreateReconciliationRunPayload, InventoryReconciliationFilterParams } from '@/types';
import { useToast } from './use-toast';

export function useReconciliationRuns(params: InventoryReconciliationFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_RECONCILIATIONS, params],
    queryFn: () => reconciliationsService.listReconciliationRuns(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useReconciliationRun(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_RECONCILIATIONS, id],
    queryFn: () => reconciliationsService.getReconciliationRunById(id as string),
    enabled: !!id,
  });
}

export function useReconciliationRunHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_RECONCILIATIONS, id, 'history'],
    queryFn: () => reconciliationsService.getReconciliationRunHistory(id as string),
    enabled: !!id,
  });
}

export function useReconciliationLines(runId: string | undefined, params: { page?: number; limit?: number; classification?: string; findingStatus?: string } = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.INVENTORY_RECONCILIATIONS, runId, 'lines', params],
    queryFn: () => reconciliationsService.listReconciliationLines(runId as string, params),
    enabled: !!runId,
  });
}

export function useCreateReconciliationRun() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateReconciliationRunPayload) => reconciliationsService.createReconciliationRun(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_RECONCILIATIONS] });
      toast.success('Reconciliation run started');
    },
    onError: () => toast.error('Could not start reconciliation', 'Please try again.'),
  });
}

export function useCancelReconciliationRun(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason?: string) => reconciliationsService.cancelReconciliationRun(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_RECONCILIATIONS] });
      toast.success('Run cancelled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

function useLineAction(runId: string, action: (lineId: string, value?: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ lineId, value }: { lineId: string; value?: string }) => action(lineId, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVENTORY_RECONCILIATIONS, runId, 'lines'] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useApproveReconciliationLine(runId: string) {
  return useLineAction(runId, reconciliationsService.approveReconciliationLine, 'Line approved');
}

export function useRejectReconciliationLine(runId: string) {
  return useLineAction(runId, reconciliationsService.rejectReconciliationLine, 'Line rejected');
}

export function useIgnoreReconciliationLine(runId: string) {
  return useLineAction(runId, reconciliationsService.ignoreReconciliationLine, 'Line ignored');
}

export function useResolveReconciliationLine(runId: string) {
  return useLineAction(runId, reconciliationsService.resolveReconciliationLine, 'Line resolved');
}

export function useReopenReconciliationLine(runId: string) {
  return useLineAction(runId, reconciliationsService.reopenReconciliationLine, 'Line reopened');
}
