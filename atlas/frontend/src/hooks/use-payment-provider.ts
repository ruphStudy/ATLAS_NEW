import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as paymentService from '@/services/payment-provider.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type {
  CapturePaymentPayload,
  ConfigurePaymentCredentialsPayload,
  CreatePaymentPayload,
  RefundPaymentPayload,
  RegisterPaymentProviderAccountPayload,
  TransactionFilterParams,
  UpdatePaymentProviderAccountPayload,
} from '@/types';

const PAYMENT_KEY = 'payment-provider';

export function usePaymentProviderAccounts(providerKey?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [PAYMENT_KEY, 'accounts', providerKey],
    queryFn: () => paymentService.listPaymentProviderAccounts(providerKey),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function usePaymentProviderAccount(id: string | undefined) {
  return useQuery({
    queryKey: [PAYMENT_KEY, 'account', id],
    queryFn: () => paymentService.getPaymentProviderAccount(id as string),
    enabled: !!id,
  });
}

export function usePaymentTransactions(params: TransactionFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [PAYMENT_KEY, 'transactions', params],
    queryFn: () => paymentService.listPaymentTransactions(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function usePaymentTransaction(id: string | undefined) {
  return useQuery({
    queryKey: [PAYMENT_KEY, 'transaction', id],
    queryFn: () => paymentService.getPaymentTransaction(id as string),
    enabled: !!id,
  });
}

function invalidatePayments(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [PAYMENT_KEY] });
}

export function useRegisterPaymentProviderAccount() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RegisterPaymentProviderAccountPayload) => paymentService.registerPaymentProviderAccount(payload),
    onSuccess: () => {
      invalidatePayments(queryClient);
      toast.success('Payment provider account registered');
    },
    onError: () => toast.error('Could not register account', 'Please try again.'),
  });
}

export function useUpdatePaymentProviderAccount(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdatePaymentProviderAccountPayload) => paymentService.updatePaymentProviderAccount(id, payload),
    onSuccess: () => {
      invalidatePayments(queryClient);
      toast.success('Account updated');
    },
    onError: () => toast.error('Could not update account', 'Please try again.'),
  });
}

export function useConfigurePaymentCredentials(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ConfigurePaymentCredentialsPayload) => paymentService.configurePaymentCredentials(id, payload),
    onSuccess: () => {
      invalidatePayments(queryClient);
      toast.success('Credentials configured');
    },
    onError: () => toast.error('Could not configure credentials', 'Please check the values and try again.'),
  });
}

export function useTestPaymentProviderConnection(id: string) {
  const toast = useToast();
  return useMutation({
    mutationFn: () => paymentService.testPaymentProviderConnection(id),
    onError: () => toast.error('Connection test failed', 'Please try again.'),
  });
}

export function useCheckAllPaymentProviderHealth() {
  const toast = useToast();
  return useMutation({
    mutationFn: () => paymentService.checkAllPaymentProviderHealth(),
    onError: () => toast.error('Could not check provider health', 'Please try again.'),
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreatePaymentPayload) => paymentService.createPayment(payload),
    onSuccess: () => {
      invalidatePayments(queryClient);
      toast.success('Payment initiated');
    },
    onError: () => toast.error('Payment failed', 'Please try again.'),
  });
}

export function useCapturePayment(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CapturePaymentPayload = {}) => paymentService.capturePayment(id, payload),
    onSuccess: () => {
      invalidatePayments(queryClient);
      toast.success('Payment captured');
    },
    onError: () => toast.error('Could not capture payment', 'Please try again.'),
  });
}

export function useCancelPayment(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => paymentService.cancelPayment(id),
    onSuccess: () => {
      invalidatePayments(queryClient);
      toast.success('Payment cancelled');
    },
    onError: () => toast.error('Could not cancel payment', 'Please try again.'),
  });
}

export function useRefundPayment(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RefundPaymentPayload) => paymentService.refundPayment(id, payload),
    onSuccess: () => {
      invalidatePayments(queryClient);
      toast.success('Refund processed');
    },
    onError: () => toast.error('Could not process refund', 'Please try again.'),
  });
}
