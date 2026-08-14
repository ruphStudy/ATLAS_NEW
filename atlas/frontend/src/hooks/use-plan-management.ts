import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as planService from '@/services/plan-management.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type { CreatePlanPayload, PlanFilterParams, PlanReasonPayload, PublishPlanPayload, UpdatePlanPayload } from '@/types';

const PLAN_KEY = 'plan-management';

export function usePlans(params: PlanFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [PLAN_KEY, 'list', params],
    queryFn: () => planService.listPlans(params),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function usePlan(id: string | undefined) {
  return useQuery({
    queryKey: [PLAN_KEY, 'detail', id],
    queryFn: () => planService.getPlan(id as string),
    enabled: !!id,
  });
}

export function usePlanHistory(id: string | undefined) {
  return useQuery({
    queryKey: [PLAN_KEY, 'history', id],
    queryFn: () => planService.getPlanHistory(id as string),
    enabled: !!id,
  });
}

export function usePlanVersions(code: string | undefined) {
  return useQuery({
    queryKey: [PLAN_KEY, 'versions', code],
    queryFn: () => planService.listPlanVersions(code as string),
    enabled: !!code,
  });
}

export function useEffectivePlanVersion(code: string | undefined) {
  return useQuery({
    queryKey: [PLAN_KEY, 'effective', code],
    queryFn: () => planService.getEffectivePlanVersion(code as string),
    enabled: !!code,
  });
}

export function usePlanEntitlementSnapshot(code: string | undefined, version?: number) {
  return useQuery({
    queryKey: [PLAN_KEY, 'entitlements', code, version],
    queryFn: () => planService.getPlanEntitlementSnapshot(code as string, version),
    enabled: !!code,
  });
}

export function usePlanCompatibility(fromCode: string | undefined, toCode: string | undefined) {
  return useQuery({
    queryKey: [PLAN_KEY, 'compatibility', fromCode, toCode],
    queryFn: () => planService.checkPlanCompatibility(fromCode as string, toCode as string),
    enabled: !!fromCode && !!toCode && fromCode !== toCode,
  });
}

function invalidatePlans(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [PLAN_KEY, 'list'] });
  queryClient.invalidateQueries({ queryKey: [PLAN_KEY, 'versions'] });
  queryClient.invalidateQueries({ queryKey: [PLAN_KEY, 'effective'] });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreatePlanPayload) => planService.createPlan(payload),
    onSuccess: () => {
      invalidatePlans(queryClient);
      toast.success('Plan created');
    },
    onError: () => toast.error('Could not create plan', 'Please check the form and try again.'),
  });
}

export function useCreatePlanVersion(code: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: PlanReasonPayload = {}) => planService.createPlanVersion(code, payload),
    onSuccess: () => {
      invalidatePlans(queryClient);
      toast.success('New draft version created');
    },
    onError: () => toast.error('Could not create a new version', 'Please try again.'),
  });
}

export function useUpdatePlan(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdatePlanPayload) => planService.updatePlan(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PLAN_KEY, 'detail', id] });
      queryClient.invalidateQueries({ queryKey: [PLAN_KEY, 'history', id] });
      invalidatePlans(queryClient);
      toast.success('Plan updated');
    },
    onError: () => toast.error('Could not update plan', 'Please try again.'),
  });
}

export function usePublishPlan(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: PublishPlanPayload = {}) => planService.publishPlan(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PLAN_KEY, 'detail', id] });
      queryClient.invalidateQueries({ queryKey: [PLAN_KEY, 'history', id] });
      invalidatePlans(queryClient);
      toast.success('Plan published');
    },
    onError: () => toast.error('Could not publish plan', 'Please try again.'),
  });
}

export function useDeprecatePlan(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: PlanReasonPayload = {}) => planService.deprecatePlan(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PLAN_KEY, 'detail', id] });
      queryClient.invalidateQueries({ queryKey: [PLAN_KEY, 'history', id] });
      invalidatePlans(queryClient);
      toast.success('Plan deprecated');
    },
    onError: () => toast.error('Could not deprecate plan', 'Please try again.'),
  });
}

export function useArchivePlan(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: PlanReasonPayload = {}) => planService.archivePlan(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PLAN_KEY, 'detail', id] });
      queryClient.invalidateQueries({ queryKey: [PLAN_KEY, 'history', id] });
      invalidatePlans(queryClient);
      toast.success('Plan archived');
    },
    onError: () => toast.error('Could not archive plan', 'Please try again.'),
  });
}

export function useRestorePlan(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => planService.restorePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PLAN_KEY, 'detail', id] });
      queryClient.invalidateQueries({ queryKey: [PLAN_KEY, 'history', id] });
      invalidatePlans(queryClient);
      toast.success('Plan restored');
    },
    onError: () => toast.error('Could not restore plan', 'Please try again.'),
  });
}
