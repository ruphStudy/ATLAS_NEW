import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as drService from '@/services/disaster-recovery.service';
import { QUERY_KEYS } from '@/constants';
import { useToast } from './use-toast';
import type {
  CreateDrPolicyPayload,
  CreateDrRecoveryPlanPayload,
  DetectDrDisasterPayload,
  DrExecutionFilterParams,
  DrPolicyFilterParams,
  DrRecoveryPlanFilterParams,
  TriggerDrRecoveryPayload,
  UpdateDrPolicyPayload,
  UpdateDrRecoveryPlanPayload,
} from '@/types';

export function useDrPolicies(params: DrPolicyFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.DR_POLICIES, params],
    queryFn: () => drService.listDrPolicies(params),
    staleTime: 30 * 1000,
  });
}

export function useDrPolicy(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.DR_POLICIES, id],
    queryFn: () => drService.getDrPolicyById(id as string),
    enabled: !!id,
  });
}

export function useDrPolicyHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.DR_POLICIES, id, 'history'],
    queryFn: () => drService.getDrPolicyHistory(id as string),
    enabled: !!id,
  });
}

function invalidateDrPolicies(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DR_POLICIES] });
}

export function useCreateDrPolicy() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateDrPolicyPayload) => drService.createDrPolicy(payload),
    onSuccess: () => {
      invalidateDrPolicies(queryClient);
      toast.success('DR policy created');
    },
    onError: () => toast.error('Could not create policy', 'Please try again.'),
  });
}

export function useUpdateDrPolicy(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateDrPolicyPayload) => drService.updateDrPolicy(id, payload),
    onSuccess: () => {
      invalidateDrPolicies(queryClient);
      toast.success('DR policy updated');
    },
    onError: () => toast.error('Could not update policy', 'Please try again.'),
  });
}

function useDrPolicyAction(id: string, action: (id: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(id),
    onSuccess: () => {
      invalidateDrPolicies(queryClient);
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useActivateDrPolicy(id: string) {
  return useDrPolicyAction(id, drService.activateDrPolicy, 'Policy activated');
}

export function usePauseDrPolicy(id: string) {
  return useDrPolicyAction(id, drService.pauseDrPolicy, 'Policy paused');
}

export function useArchiveDrPolicy(id: string) {
  return useDrPolicyAction(id, drService.archiveDrPolicy, 'Policy archived');
}

export function useRestoreDrPolicy(id: string) {
  return useDrPolicyAction(id, drService.restoreDrPolicy, 'Policy restored');
}

export function useDrRecoveryPlans(params: DrRecoveryPlanFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.DR_RECOVERY_PLANS, params],
    queryFn: () => drService.listDrRecoveryPlans(params),
    staleTime: 30 * 1000,
  });
}

export function useDrRecoveryPlan(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.DR_RECOVERY_PLANS, id],
    queryFn: () => drService.getDrRecoveryPlanById(id as string),
    enabled: !!id,
  });
}

function invalidatePlans(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DR_RECOVERY_PLANS] });
}

export function useCreateDrRecoveryPlan() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateDrRecoveryPlanPayload) => drService.createDrRecoveryPlan(payload),
    onSuccess: () => {
      invalidatePlans(queryClient);
      toast.success('Recovery plan created');
    },
    onError: () => toast.error('Could not create plan', 'Please try again.'),
  });
}

export function useUpdateDrRecoveryPlan(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateDrRecoveryPlanPayload) => drService.updateDrRecoveryPlan(id, payload),
    onSuccess: () => {
      invalidatePlans(queryClient);
      toast.success('Recovery plan updated');
    },
    onError: () => toast.error('Could not update plan', 'Please try again.'),
  });
}

export function usePublishDrRecoveryPlan(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => drService.publishDrRecoveryPlan(id),
    onSuccess: () => {
      invalidatePlans(queryClient);
      toast.success('Recovery plan published');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useArchiveDrRecoveryPlan(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => drService.archiveDrRecoveryPlan(id),
    onSuccess: () => {
      invalidatePlans(queryClient);
      toast.success('Recovery plan archived');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useTriggerDrRecovery(planId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: TriggerDrRecoveryPayload) => drService.triggerDrRecovery(planId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DR_RECOVERY_EXECUTIONS] });
      toast.success('Recovery triggered');
    },
    onError: () => toast.error('Could not trigger recovery', 'Please try again.'),
  });
}

export function useDetectDrDisaster() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: DetectDrDisasterPayload) => drService.detectDrDisaster(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DR_RECOVERY_EXECUTIONS] });
      toast.success('Disaster detection recorded');
    },
    onError: () => toast.error('Could not record detection', 'Please try again.'),
  });
}

export function useDrExecutions(params: DrExecutionFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.DR_RECOVERY_EXECUTIONS, params],
    queryFn: () => drService.listDrExecutions(params),
    staleTime: 10 * 1000,
  });
}

export function useDrExecution(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.DR_RECOVERY_EXECUTIONS, id],
    queryFn: () => drService.getDrExecutionById(id as string),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'RUNNING' || status === 'VALIDATING' || status === 'ROLLING_BACK' || status === 'AWAITING_APPROVAL' ? 5000 : false;
    },
  });
}

function invalidateExecutions(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DR_RECOVERY_EXECUTIONS] });
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DR_RECOVERY_EXECUTIONS, id] });
}

export function useCancelDrExecution(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => drService.cancelDrExecution(id),
    onSuccess: () => {
      invalidateExecutions(queryClient, id);
      toast.success('Execution cancelled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useRollbackDrExecution(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => drService.rollbackDrExecution(id),
    onSuccess: () => {
      invalidateExecutions(queryClient, id);
      toast.success('Rollback initiated');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useForceReleaseDrLock() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (scopeKey: string) => drService.forceReleaseDrLock(scopeKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DR_RECOVERY_EXECUTIONS] });
      toast.success('Lock released');
    },
    onError: () => toast.error('Could not release lock', 'Please try again.'),
  });
}
