import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as saasAdminService from '@/services/saas-administration.service';
import { QUERY_KEYS } from '@/constants';
import type {
  ActivateTenantPayload,
  AddTenantNotePayload,
  AdminActionLogFilterParams,
  AssignPlanPayload,
  FeatureOverridePayload,
  QuotaOverridePayload,
  StartImpersonationPayload,
  SubscriptionOverridePayload,
  SuspendTenantPayload,
  TenantFilterParams,
  TerminateTenantPayload,
  UpdateInternalFlagsPayload,
  UpdateSupportStatusPayload,
} from '@/types';
import { useToast } from './use-toast';

export function useTenants(filter: TenantFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.PLATFORM_TENANTS, filter],
    queryFn: () => saasAdminService.searchTenants(filter),
    staleTime: 30 * 1000,
  });
}

export function useTenantOverview(workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PLATFORM_TENANTS, workspaceId, 'overview'],
    queryFn: () => saasAdminService.getTenantOverview(workspaceId as string),
    enabled: !!workspaceId,
  });
}

function invalidateTenant(queryClient: ReturnType<typeof useQueryClient>, workspaceId: string) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PLATFORM_TENANTS] });
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PLATFORM_TENANTS, workspaceId] });
}

export function useActivateTenant(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ActivateTenantPayload = {}) => saasAdminService.activateTenant(workspaceId, payload),
    onSuccess: () => {
      invalidateTenant(queryClient, workspaceId);
      toast.success('Tenant activated');
    },
    onError: () => toast.error('Could not activate tenant', 'Please try again.'),
  });
}

export function useSuspendTenant(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: SuspendTenantPayload) => saasAdminService.suspendTenant(workspaceId, payload),
    onSuccess: () => {
      invalidateTenant(queryClient, workspaceId);
      toast.success('Tenant suspended');
    },
    onError: () => toast.error('Could not suspend tenant', 'Please try again.'),
  });
}

export function useReactivateTenant(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ActivateTenantPayload = {}) => saasAdminService.reactivateTenant(workspaceId, payload),
    onSuccess: () => {
      invalidateTenant(queryClient, workspaceId);
      toast.success('Tenant reactivated');
    },
    onError: () => toast.error('Could not reactivate tenant', 'Please try again.'),
  });
}

export function useTerminateTenant(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: TerminateTenantPayload) => saasAdminService.terminateTenant(workspaceId, payload),
    onSuccess: () => {
      invalidateTenant(queryClient, workspaceId);
      toast.success('Tenant terminated');
    },
    onError: () => toast.error('Could not terminate tenant', 'Please try again.'),
  });
}

export function useAssignTenantPlan(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: AssignPlanPayload) => saasAdminService.assignTenantPlan(workspaceId, payload),
    onSuccess: () => {
      invalidateTenant(queryClient, workspaceId);
      toast.success('Plan assigned');
    },
    onError: () => toast.error('Could not assign plan', 'Please try again.'),
  });
}

export function useOverrideTenantSubscription(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: SubscriptionOverridePayload) => saasAdminService.overrideTenantSubscription(workspaceId, payload),
    onSuccess: () => {
      invalidateTenant(queryClient, workspaceId);
      toast.success('Subscription overridden');
    },
    onError: () => toast.error('Could not override subscription', 'Please try again.'),
  });
}

export function useOverrideTenantQuota(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: QuotaOverridePayload) => saasAdminService.overrideTenantQuota(workspaceId, payload),
    onSuccess: () => {
      invalidateTenant(queryClient, workspaceId);
      toast.success('Quota overridden');
    },
    onError: () => toast.error('Could not override quota', 'Please try again.'),
  });
}

export function useOverrideTenantFeature(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: FeatureOverridePayload) => saasAdminService.overrideTenantFeature(workspaceId, payload),
    onSuccess: () => {
      invalidateTenant(queryClient, workspaceId);
      toast.success('Feature overridden');
    },
    onError: () => toast.error('Could not override feature', 'Please try again.'),
  });
}

export function useTenantLicenses(workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PLATFORM_TENANTS, workspaceId, 'licenses'],
    queryFn: () => saasAdminService.listTenantLicenses(workspaceId as string),
    enabled: !!workspaceId,
  });
}

export function useTenantUsage(workspaceId: string | undefined, resourceKey?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.PLATFORM_TENANTS, workspaceId, 'usage', resourceKey],
    queryFn: () => saasAdminService.getTenantUsage(workspaceId as string, resourceKey),
    enabled: !!workspaceId,
  });
}

export function useTenantNotes(workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PLATFORM_TENANTS, workspaceId, 'notes'],
    queryFn: () => saasAdminService.listTenantNotes(workspaceId as string),
    enabled: !!workspaceId,
  });
}

export function useAddTenantNote(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: AddTenantNotePayload) => saasAdminService.addTenantNote(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PLATFORM_TENANTS, workspaceId, 'notes'] });
      toast.success('Note added');
    },
    onError: () => toast.error('Could not add note', 'Please try again.'),
  });
}

export function useTenantAdminProfile(workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.PLATFORM_TENANTS, workspaceId, 'profile'],
    queryFn: () => saasAdminService.getTenantAdminProfile(workspaceId as string),
    enabled: !!workspaceId,
  });
}

export function useUpdateTenantFlags(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateInternalFlagsPayload) => saasAdminService.updateTenantFlags(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PLATFORM_TENANTS, workspaceId, 'profile'] });
      toast.success('Flags updated');
    },
    onError: () => toast.error('Could not update flags', 'Please try again.'),
  });
}

export function useUpdateTenantSupportStatus(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateSupportStatusPayload) => saasAdminService.updateTenantSupportStatus(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PLATFORM_TENANTS, workspaceId, 'profile'] });
      toast.success('Support status updated');
    },
    onError: () => toast.error('Could not update support status', 'Please try again.'),
  });
}

export function useStartImpersonation(workspaceId: string) {
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: StartImpersonationPayload) => saasAdminService.startImpersonation(workspaceId, payload),
    onError: () => toast.error('Could not start impersonation', 'Please try again.'),
  });
}

export function useEndImpersonation() {
  const toast = useToast();
  return useMutation({
    mutationFn: (sessionId: string) => saasAdminService.endImpersonation(sessionId),
    onError: () => toast.error('Could not end impersonation', 'Please try again.'),
  });
}

export function useAdminActionLog(filter: AdminActionLogFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.ADMIN_ACTION_LOG, filter],
    queryFn: () => saasAdminService.listAdminActionLog(filter),
    staleTime: 30 * 1000,
  });
}
