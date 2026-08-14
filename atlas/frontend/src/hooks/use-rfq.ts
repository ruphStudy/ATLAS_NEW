import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as rfqService from '@/services/rfq.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';
import type { CreateRfqPayload, RfqFilterParams, SubmitRfqResponsePayload, UpdateRfqPayload } from '@/types';
import { useToast } from './use-toast';

export function useRfqs(params: RfqFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.RFQS, params],
    queryFn: () => rfqService.listRfqs(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useRfq(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.RFQS, id],
    queryFn: () => rfqService.getRfqById(id as string),
    enabled: !!id,
  });
}

export function useRfqStats() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUERY_KEYS.RFQS, 'stats'],
    queryFn: rfqService.getRfqStats,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useCreateRfq() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateRfqPayload) => rfqService.createRfq(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RFQS] });
      toast.success('RFQ created');
    },
    onError: () => toast.error('Could not create RFQ', 'Please check the form and try again.'),
  });
}

export function useUpdateRfq(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateRfqPayload) => rfqService.updateRfq(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RFQS] });
      toast.success('RFQ updated');
    },
    onError: () => toast.error('Could not update RFQ', 'Please try again.'),
  });
}

function useRfqAction(id: string, action: () => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: action,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RFQS] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useSendRfq(id: string) {
  return useRfqAction(id, () => rfqService.sendRfq(id), 'RFQ sent to suppliers');
}

export function useSubmitRfqSupplierResponse(rfqId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ supplierId, payload }: { supplierId: string; payload: SubmitRfqResponsePayload }) =>
      rfqService.submitRfqSupplierResponse(rfqId, supplierId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RFQS] });
      toast.success('Supplier response recorded');
    },
    onError: () => toast.error('Could not record response', 'Please try again.'),
  });
}

export function useCancelRfq(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason: string) => rfqService.cancelRfq(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RFQS] });
      toast.success('RFQ cancelled');
    },
    onError: () => toast.error('Could not cancel RFQ', 'Please try again.'),
  });
}

export function useCloseRfq(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason?: string) => rfqService.closeRfq(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RFQS] });
      toast.success('RFQ closed');
    },
    onError: () => toast.error('Could not close RFQ', 'Please try again.'),
  });
}

export function useDeleteRfq() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => rfqService.deleteRfq(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RFQS] });
      toast.success('RFQ deleted');
    },
    onError: () => toast.error('Could not delete RFQ', 'Please try again.'),
  });
}
