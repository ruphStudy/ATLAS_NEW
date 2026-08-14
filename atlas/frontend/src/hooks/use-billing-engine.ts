import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as billingService from '@/services/billing-engine.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type {
  AddBillingAdjustmentPayload,
  BillingFilterParams,
  CreateBillingRulePayload,
  GenerateBillingPeriodPayload,
  RecordBillingPaymentPayload,
  RefundBillingPeriodPayload,
  BillingReasonPayload,
  UpdateBillingRulePayload,
} from '@/types';

const BILLING_KEY = 'billing-engine';

export function useBillingRules() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [BILLING_KEY, 'rules'],
    queryFn: () => billingService.listBillingRules(),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useBillingPeriods(params: BillingFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [BILLING_KEY, 'periods', params],
    queryFn: () => billingService.listBillingPeriods(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useBillingPeriod(id: string | undefined) {
  return useQuery({
    queryKey: [BILLING_KEY, 'period', id],
    queryFn: () => billingService.getBillingPeriod(id as string),
    enabled: !!id,
  });
}

export function useBillingPeriodItems(id: string | undefined) {
  return useQuery({
    queryKey: [BILLING_KEY, 'period-items', id],
    queryFn: () => billingService.getBillingPeriodItems(id as string),
    enabled: !!id,
  });
}

export function useBillingPeriodHistory(id: string | undefined) {
  return useQuery({
    queryKey: [BILLING_KEY, 'period-history', id],
    queryFn: () => billingService.getBillingPeriodHistory(id as string),
    enabled: !!id,
  });
}

function invalidateBilling(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [BILLING_KEY] });
}

export function useCreateBillingRule() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateBillingRulePayload) => billingService.createBillingRule(payload),
    onSuccess: () => {
      invalidateBilling(queryClient);
      toast.success('Billing rule created');
    },
    onError: () => toast.error('Could not create billing rule', 'Please try again.'),
  });
}

export function useUpdateBillingRule(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateBillingRulePayload) => billingService.updateBillingRule(id, payload),
    onSuccess: () => {
      invalidateBilling(queryClient);
      toast.success('Billing rule updated');
    },
    onError: () => toast.error('Could not update billing rule', 'Please try again.'),
  });
}

export function useGenerateBillingPeriod() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: GenerateBillingPeriodPayload) => billingService.generateBillingPeriod(payload),
    onSuccess: () => {
      invalidateBilling(queryClient);
      toast.success('Billing period generated');
    },
    onError: () => toast.error('Could not generate billing period', 'Please try again.'),
  });
}

export function useAddBillingAdjustment(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: AddBillingAdjustmentPayload) => billingService.addBillingAdjustment(id, payload),
    onSuccess: () => {
      invalidateBilling(queryClient);
      toast.success('Adjustment added');
    },
    onError: () => toast.error('Could not add adjustment', 'Please try again.'),
  });
}

export function useBillBillingPeriod(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => billingService.billBillingPeriod(id),
    onSuccess: () => {
      invalidateBilling(queryClient);
      toast.success('Billing period billed');
    },
    onError: () => toast.error('Could not bill period', 'Please try again.'),
  });
}

export function useRecordBillingPayment(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RecordBillingPaymentPayload) => billingService.recordBillingPayment(id, payload),
    onSuccess: () => {
      invalidateBilling(queryClient);
      toast.success('Payment recorded');
    },
    onError: () => toast.error('Could not record payment', 'Please try again.'),
  });
}

export function useVoidBillingPeriod(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: BillingReasonPayload) => billingService.voidBillingPeriod(id, payload),
    onSuccess: () => {
      invalidateBilling(queryClient);
      toast.success('Billing period voided');
    },
    onError: () => toast.error('Could not void period', 'Please try again.'),
  });
}

export function useRefundBillingPeriod(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RefundBillingPeriodPayload) => billingService.refundBillingPeriod(id, payload),
    onSuccess: () => {
      invalidateBilling(queryClient);
      toast.success('Refund processed');
    },
    onError: () => toast.error('Could not process refund', 'Please try again.'),
  });
}

export function useReconcileBillingPeriod(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => billingService.reconcileBillingPeriod(id),
    onSuccess: () => toast.success('Reconciliation complete'),
    onError: () => toast.error('Could not reconcile period', 'Please try again.'),
  });
}
