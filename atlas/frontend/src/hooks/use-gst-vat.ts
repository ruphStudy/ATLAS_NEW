import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as gstVatService from '@/services/gst-vat.service';
import { QUERY_KEYS } from '@/constants';
import { useToast } from './use-toast';
import type {
  ApplyGstVatPayload,
  CreateGstVatRegistrationPayload,
  CreateGstVatTaxCodePayload,
  GstVatRegistrationFilterParams,
  GstVatTaxCodeFilterParams,
  GstVatTransactionFilterParams,
  RecordGstVatAdjustmentPayload,
  UpdateGstVatRegistrationPayload,
  UpdateGstVatTaxCodePayload,
} from '@/types';

export function useGstVatRegistrations(params: GstVatRegistrationFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.GST_VAT_REGISTRATIONS, params],
    queryFn: () => gstVatService.listGstVatRegistrations(params),
    staleTime: 60 * 1000,
  });
}

export function useGstVatRegistration(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.GST_VAT_REGISTRATIONS, id],
    queryFn: () => gstVatService.getGstVatRegistrationById(id as string),
    enabled: !!id,
  });
}

export function useGstVatRegistrationHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.GST_VAT_REGISTRATIONS, id, 'history'],
    queryFn: () => gstVatService.getGstVatRegistrationHistory(id as string),
    enabled: !!id,
  });
}

function invalidateRegistrations(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GST_VAT_REGISTRATIONS] });
}

export function useCreateGstVatRegistration() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateGstVatRegistrationPayload) => gstVatService.createGstVatRegistration(payload),
    onSuccess: () => {
      invalidateRegistrations(queryClient);
      toast.success('Registration created');
    },
    onError: () => toast.error('Could not create registration', 'Please try again.'),
  });
}

export function useUpdateGstVatRegistration(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateGstVatRegistrationPayload) => gstVatService.updateGstVatRegistration(id, payload),
    onSuccess: () => {
      invalidateRegistrations(queryClient);
      toast.success('Registration updated');
    },
    onError: () => toast.error('Could not update registration', 'Please try again.'),
  });
}

export function useGstVatTaxCodes(params: GstVatTaxCodeFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.GST_VAT_TAX_CODES, params],
    queryFn: () => gstVatService.listGstVatTaxCodes(params),
    staleTime: 60 * 1000,
  });
}

function invalidateTaxCodes(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GST_VAT_TAX_CODES] });
}

export function useCreateGstVatTaxCode() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateGstVatTaxCodePayload) => gstVatService.createGstVatTaxCode(payload),
    onSuccess: () => {
      invalidateTaxCodes(queryClient);
      toast.success('Tax code created');
    },
    onError: () => toast.error('Could not create tax code', 'Please try again.'),
  });
}

export function useUpdateGstVatTaxCode(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateGstVatTaxCodePayload) => gstVatService.updateGstVatTaxCode(id, payload),
    onSuccess: () => {
      invalidateTaxCodes(queryClient);
      toast.success('Tax code updated');
    },
    onError: () => toast.error('Could not update tax code', 'Please try again.'),
  });
}

export function useApplyGstVat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApplyGstVatPayload) => gstVatService.applyGstVat(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GST_VAT_TRANSACTIONS] }),
  });
}

export function useValidateGstVatConfiguration() {
  return useMutation({
    mutationFn: (payload: ApplyGstVatPayload) => gstVatService.validateGstVatConfiguration(payload),
  });
}

export function useGstVatTransactions(params: GstVatTransactionFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.GST_VAT_TRANSACTIONS, params],
    queryFn: () => gstVatService.getGstVatTransactions(params),
    staleTime: 30 * 1000,
  });
}

export function useGstVatAdjustments(transactionId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.GST_VAT_TRANSACTIONS, transactionId, 'adjustments'],
    queryFn: () => gstVatService.getGstVatAdjustments(transactionId as string),
    enabled: !!transactionId,
  });
}

export function useRecordGstVatAdjustment() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RecordGstVatAdjustmentPayload) => gstVatService.recordGstVatAdjustment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GST_VAT_TRANSACTIONS] });
      toast.success('Adjustment recorded');
    },
    onError: () => toast.error('Could not record adjustment', 'Please try again.'),
  });
}
