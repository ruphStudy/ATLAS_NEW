import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as procurementService from '@/services/procurement.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CreateProcurementPayload, ProcurementFilterParams, UpdateProcurementPayload } from '@/types';
import { useToast } from './use-toast';

export function useProcurements(params: ProcurementFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.PROCUREMENT, params],
    queryFn: () => procurementService.listProcurements(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useProcurement(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PROCUREMENT, id],
    queryFn: () => procurementService.getProcurementById(id as string),
    enabled: !!id,
  });
}

export function useProcurementHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PROCUREMENT, id, 'history'],
    queryFn: () => procurementService.getProcurementHistory(id as string),
    enabled: !!id,
  });
}

export function useProcurementStats() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.PROCUREMENT, 'stats'],
    queryFn: procurementService.getProcurementStats,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useCreateProcurement() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateProcurementPayload) => procurementService.createProcurement(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROCUREMENT] });
      toast.success('Procurement created');
    },
    onError: () => toast.error('Could not create procurement', 'Please check the form and try again.'),
  });
}

export function useUpdateProcurement(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateProcurementPayload) => procurementService.updateProcurement(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROCUREMENT] });
      toast.success('Procurement updated');
    },
    onError: () => toast.error('Could not update procurement', 'Please try again.'),
  });
}

function useProcurementAction(id: string, action: (id: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROCUREMENT] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROCUREMENT, id, 'history'] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useSubmitProcurementForApproval(id: string) {
  return useProcurementAction(id, procurementService.submitProcurementForApproval, 'Submitted for approval');
}

export function useApproveProcurement(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (notes?: string) => procurementService.approveProcurement(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROCUREMENT] });
      toast.success('Procurement approved');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useMarkProcurementOrdered(id: string) {
  return useProcurementAction(id, procurementService.markProcurementOrdered, 'Marked as ordered');
}

export function useMarkProcurementInProgress(id: string) {
  return useProcurementAction(id, procurementService.markProcurementInProgress, 'Marked in progress');
}

export function useMarkProcurementPartiallyReceived(id: string) {
  return useProcurementAction(id, procurementService.markProcurementPartiallyReceived, 'Marked as partially received');
}

export function useCompleteProcurement(id: string) {
  return useProcurementAction(id, procurementService.completeProcurement, 'Procurement completed');
}

export function useCancelProcurement(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason: string) => procurementService.cancelProcurement(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROCUREMENT] });
      toast.success('Procurement cancelled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useDeleteProcurement() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => procurementService.deleteProcurement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROCUREMENT] });
      toast.success('Procurement deleted');
    },
    onError: () => toast.error('Could not delete procurement', 'Please try again.'),
  });
}
