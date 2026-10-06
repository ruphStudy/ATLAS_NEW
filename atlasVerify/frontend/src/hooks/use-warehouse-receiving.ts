import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as receivingService from '@/services/warehouse-receiving.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CreateReceivingPayload, ReceiveLinesPayload, ReceivingFilterParams } from '@/types';
import { useToast } from './use-toast';

export function useReceivings(params: ReceivingFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.WAREHOUSE_RECEIVING, params],
    queryFn: () => receivingService.listReceivings(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useReceiving(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.WAREHOUSE_RECEIVING, id],
    queryFn: () => receivingService.getReceivingById(id as string),
    enabled: !!id,
  });
}

export function useCreateReceiving() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateReceivingPayload) => receivingService.createReceiving(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WAREHOUSE_RECEIVING] });
      toast.success('Receiving record created');
    },
    onError: () => toast.error('Could not create receiving record', 'Please check the form and try again.'),
  });
}

function useReceivingAction<T = void>(id: string, action: (id: string, payload: T) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: T) => action(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WAREHOUSE_RECEIVING] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useStartReceiving(id: string) {
  return useReceivingAction<{ receivedBy?: string }>(id, receivingService.startReceiving, 'Receiving started');
}

export function useReceiveLines(id: string) {
  return useReceivingAction<ReceiveLinesPayload>(id, receivingService.receiveLines, 'Lines received');
}

export function useCompleteReceiving(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (notes?: string) => receivingService.completeReceiving(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WAREHOUSE_RECEIVING] });
      toast.success('Receiving completed');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useCancelReceiving(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason: string) => receivingService.cancelReceiving(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WAREHOUSE_RECEIVING] });
      toast.success('Receiving cancelled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useReopenReceiving(id: string) {
  return useReceivingAction<string | undefined>(id, receivingService.reopenReceiving, 'Receiving reopened');
}
