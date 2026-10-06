import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as rulesService from '@/services/business-rules-engine.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type { CreateRulePayload, RollbackRulePayload, RuleExecutionFilterParams, RuleFilterParams, SimulateRulePayload, UpdateRulePayload } from '@/types';

const RULES_KEY = 'business-rules-engine';

export function useRules(params: RuleFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [RULES_KEY, 'rules', params],
    queryFn: () => rulesService.listRules(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useRule(id: string | undefined) {
  return useQuery({
    queryKey: [RULES_KEY, 'rule', id],
    queryFn: () => rulesService.getRule(id as string),
    enabled: !!id,
  });
}

export function useRuleHistory(id: string | undefined) {
  return useQuery({
    queryKey: [RULES_KEY, 'history', id],
    queryFn: () => rulesService.getRuleHistory(id as string),
    enabled: !!id,
  });
}

export function useRuleValidation(id: string | undefined) {
  return useQuery({
    queryKey: [RULES_KEY, 'validate', id],
    queryFn: () => rulesService.validateRule(id as string),
    enabled: !!id,
  });
}

export function useRuleExecutions(params: RuleExecutionFilterParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [RULES_KEY, 'executions', params],
    queryFn: () => rulesService.getRuleExecutions(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useValidateRuleDraft() {
  return useMutation({
    mutationFn: (payload: CreateRulePayload) => rulesService.validateRuleDraft(payload),
  });
}

export function useSimulateRule(id: string) {
  return useMutation({
    mutationFn: (payload: SimulateRulePayload) => rulesService.simulateRule(id, payload),
  });
}

function invalidateRules(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [RULES_KEY] });
}

export function useCreateRule() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateRulePayload) => rulesService.createRule(payload),
    onSuccess: () => {
      invalidateRules(queryClient);
      toast.success('Rule created');
    },
    onError: () => toast.error('Could not create rule', 'Please try again.'),
  });
}

export function useUpdateRule(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateRulePayload) => rulesService.updateRule(id, payload),
    onSuccess: () => {
      invalidateRules(queryClient);
      toast.success('Rule updated');
    },
    onError: () => toast.error('Could not update rule', 'Please try again.'),
  });
}

function useRuleAction(id: string, fn: () => Promise<unknown>, successMessage?: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      invalidateRules(queryClient);
      if (successMessage) toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function usePublishRule(id: string) {
  return useRuleAction(id, () => rulesService.publishRule(id), 'Rule published');
}

export function useEnableRule(id: string) {
  return useRuleAction(id, () => rulesService.enableRule(id), 'Rule enabled');
}

export function useDisableRule(id: string) {
  return useRuleAction(id, () => rulesService.disableRule(id), 'Rule disabled');
}

export function useArchiveRule(id: string) {
  return useRuleAction(id, () => rulesService.archiveRule(id), 'Rule archived');
}

export function useRestoreRule(id: string) {
  return useRuleAction(id, () => rulesService.restoreRule(id), 'Rule restored');
}

export function useRollbackRule(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RollbackRulePayload) => rulesService.rollbackRule(id, payload),
    onSuccess: () => {
      invalidateRules(queryClient);
      toast.success('Rule rolled back');
    },
    onError: () => toast.error('Could not roll back rule', 'Please try again.'),
  });
}
