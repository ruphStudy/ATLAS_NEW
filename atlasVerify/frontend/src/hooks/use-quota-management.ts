import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as quotaService from '@/services/quota-management.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type {
  CheckQuotaPayload,
  CreateQuotaOverridePayload,
  CreateQuotaPolicyPayload,
  QuotaOverrideFilterParams,
  QuotaPolicyFilterParams,
  QuotaReasonPayload,
  UpdateQuotaPolicyPayload,
} from '@/types';

const QUOTA_KEY = 'quota-management';

export function useQuotaPolicies(params: QuotaPolicyFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUOTA_KEY, 'policies', params],
    queryFn: () => quotaService.listQuotaPolicies(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useQuotaPolicy(id: string | undefined) {
  return useQuery({
    queryKey: [QUOTA_KEY, 'policy', id],
    queryFn: () => quotaService.getQuotaPolicy(id as string),
    enabled: !!id,
  });
}

export function useQuotaPolicyHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUOTA_KEY, 'policy-history', id],
    queryFn: () => quotaService.getQuotaPolicyHistory(id as string),
    enabled: !!id,
  });
}

export function useQuotaOverrides(params: QuotaOverrideFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [QUOTA_KEY, 'overrides', params],
    queryFn: () => quotaService.listQuotaOverrides(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

function invalidateQuota(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUOTA_KEY] });
}

export function useCheckQuota() {
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CheckQuotaPayload) => quotaService.checkQuota(payload),
    onError: () => toast.error('Could not check quota', 'Please try again.'),
  });
}

export function useCreateQuotaPolicy() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateQuotaPolicyPayload) => quotaService.createQuotaPolicy(payload),
    onSuccess: () => {
      invalidateQuota(queryClient);
      toast.success('Quota policy created');
    },
    onError: () => toast.error('Could not create quota policy', 'Please try again.'),
  });
}

export function useUpdateQuotaPolicy(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateQuotaPolicyPayload) => quotaService.updateQuotaPolicy(id, payload),
    onSuccess: () => {
      invalidateQuota(queryClient);
      toast.success('Quota policy updated');
    },
    onError: () => toast.error('Could not update quota policy', 'Please try again.'),
  });
}

export function useEnableQuotaPolicy(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => quotaService.enableQuotaPolicy(id),
    onSuccess: () => {
      invalidateQuota(queryClient);
      toast.success('Quota policy enabled');
    },
    onError: () => toast.error('Could not enable quota policy', 'Please try again.'),
  });
}

export function useDisableQuotaPolicy(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => quotaService.disableQuotaPolicy(id),
    onSuccess: () => {
      invalidateQuota(queryClient);
      toast.success('Quota policy disabled');
    },
    onError: () => toast.error('Could not disable quota policy', 'Please try again.'),
  });
}

export function useArchiveQuotaPolicy(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => quotaService.archiveQuotaPolicy(id),
    onSuccess: () => {
      invalidateQuota(queryClient);
      toast.success('Quota policy archived');
    },
    onError: () => toast.error('Could not archive quota policy', 'Please try again.'),
  });
}

export function useCreateQuotaOverride(policyId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateQuotaOverridePayload) => quotaService.createQuotaOverride(policyId, payload),
    onSuccess: () => {
      invalidateQuota(queryClient);
      toast.success('Quota override granted');
    },
    onError: () => toast.error('Could not grant quota override', 'Please try again.'),
  });
}

export function useRevokeQuotaOverride(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: QuotaReasonPayload = {}) => quotaService.revokeQuotaOverride(id, payload),
    onSuccess: () => {
      invalidateQuota(queryClient);
      toast.success('Quota override revoked');
    },
    onError: () => toast.error('Could not revoke quota override', 'Please try again.'),
  });
}
