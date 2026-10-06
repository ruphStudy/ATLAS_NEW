import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as verificationService from '@/services/supplier-verification.service';
import { QUERY_KEYS } from '@/constants';
import type { ManualOverridePayload, StartVerificationPayload } from '@/types';
import { useToast } from './use-toast';

export function useLatestSupplierVerification(supplierId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.SUPPLIER_VERIFICATION, supplierId, 'latest'],
    queryFn: () => verificationService.getLatestVerificationForSupplier(supplierId as string),
    enabled: !!supplierId,
    retry: false,
  });
}

export function useStartSupplierVerification(supplierId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: StartVerificationPayload = {}) => verificationService.startVerification(supplierId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUPPLIER_VERIFICATION, supplierId] });
      toast.success('Verification started');
    },
    onError: () => toast.error('Could not start verification', 'Please try again.'),
  });
}

export function useManualOverrideVerification(id: string, supplierId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ManualOverridePayload) => verificationService.manualOverrideVerification(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SUPPLIER_VERIFICATION, supplierId] });
      toast.success('Verification status overridden');
    },
    onError: () => toast.error('Could not override verification', 'Please try again.'),
  });
}
