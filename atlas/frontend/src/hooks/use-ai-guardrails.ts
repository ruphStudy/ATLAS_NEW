import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as guardrailsService from '@/services/ai-guardrails.service';
import { QUERY_KEYS } from '@/constants';
import type {
  CreateGuardrailOverridePayload,
  CreateGuardrailRulePayload,
  DecideGuardrailApprovalPayload,
  EvaluateGuardrailPayload,
  GuardrailApprovalFilterParams,
  GuardrailEvaluationFilterParams,
  GuardrailIncidentFilterParams,
  GuardrailOverrideFilterParams,
  GuardrailRuleFilterParams,
  UpdateGuardrailIncidentPayload,
  UpdateGuardrailOverridePayload,
  UpdateGuardrailRulePayload,
} from '@/types';
import { useToast } from './use-toast';

export function useEvaluateGuardrail() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: EvaluateGuardrailPayload) => guardrailsService.evaluateGuardrail(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_GUARDRAIL_EVALUATIONS] });
    },
    onError: () => toast.error('Evaluation failed', 'Please try again.'),
  });
}

export function useGuardrailRules(params: GuardrailRuleFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_GUARDRAIL_RULES, params],
    queryFn: () => guardrailsService.listGuardrailRules(params),
    enabled: !!params.workspaceId,
  });
}

export function useGuardrailRule(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_GUARDRAIL_RULES, id],
    queryFn: () => guardrailsService.getGuardrailRuleById(id as string),
    enabled: !!id,
  });
}

export function useCreateGuardrailRule() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateGuardrailRulePayload) => guardrailsService.createGuardrailRule(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_GUARDRAIL_RULES] });
      toast.success('Rule created');
    },
    onError: () => toast.error('Could not create rule', 'Please try again.'),
  });
}

export function useUpdateGuardrailRule(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateGuardrailRulePayload) => guardrailsService.updateGuardrailRule(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_GUARDRAIL_RULES] });
      toast.success('Rule updated');
    },
    onError: () => toast.error('Could not update rule', 'Please try again.'),
  });
}

export function useDeleteGuardrailRule() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => guardrailsService.deleteGuardrailRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_GUARDRAIL_RULES] });
      toast.success('Rule deleted');
    },
    onError: () => toast.error('Could not delete rule', 'Please try again.'),
  });
}

export function useGuardrailOverrides(params: GuardrailOverrideFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_GUARDRAIL_OVERRIDES, params],
    queryFn: () => guardrailsService.listGuardrailOverrides(params),
    enabled: !!params.workspaceId,
  });
}

export function useCreateGuardrailOverride() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateGuardrailOverridePayload) => guardrailsService.createGuardrailOverride(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_GUARDRAIL_OVERRIDES] });
      toast.success('Override created');
    },
    onError: () => toast.error('Could not create override', 'Please try again.'),
  });
}

export function useUpdateGuardrailOverride(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateGuardrailOverridePayload) => guardrailsService.updateGuardrailOverride(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_GUARDRAIL_OVERRIDES] });
      toast.success('Override updated');
    },
    onError: () => toast.error('Could not update override', 'Please try again.'),
  });
}

export function useDeleteGuardrailOverride() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => guardrailsService.deleteGuardrailOverride(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_GUARDRAIL_OVERRIDES] });
      toast.success('Override deleted');
    },
    onError: () => toast.error('Could not delete override', 'Please try again.'),
  });
}

export function useGuardrailEvaluations(params: GuardrailEvaluationFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_GUARDRAIL_EVALUATIONS, params],
    queryFn: () => guardrailsService.listGuardrailEvaluations(params),
    enabled: !!params.workspaceId,
  });
}

export function useGuardrailEvaluation(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_GUARDRAIL_EVALUATIONS, id],
    queryFn: () => guardrailsService.getGuardrailEvaluationById(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useGuardrailEvaluationResults(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_GUARDRAIL_EVALUATIONS, id, 'results'],
    queryFn: () => guardrailsService.getGuardrailEvaluationResults(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useGuardrailIncidents(params: GuardrailIncidentFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_GUARDRAIL_INCIDENTS, params],
    queryFn: () => guardrailsService.listGuardrailIncidents(params),
    enabled: !!params.workspaceId,
  });
}

export function useGuardrailIncident(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_GUARDRAIL_INCIDENTS, id],
    queryFn: () => guardrailsService.getGuardrailIncidentById(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useUpdateGuardrailIncident(id: string, workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateGuardrailIncidentPayload) => guardrailsService.updateGuardrailIncident(id, workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_GUARDRAIL_INCIDENTS] });
      toast.success('Incident updated');
    },
    onError: () => toast.error('Could not update incident', 'Please try again.'),
  });
}

export function useGuardrailApprovals(params: GuardrailApprovalFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_GUARDRAIL_APPROVALS, params],
    queryFn: () => guardrailsService.listGuardrailApprovals(params),
    enabled: !!params.workspaceId,
  });
}

export function useGuardrailApproval(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_GUARDRAIL_APPROVALS, id],
    queryFn: () => guardrailsService.getGuardrailApprovalById(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useDecideGuardrailApproval(id: string, workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: DecideGuardrailApprovalPayload) => guardrailsService.decideGuardrailApproval(id, workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_GUARDRAIL_APPROVALS] });
      toast.success('Decision recorded');
    },
    onError: () => toast.error('Could not record decision', 'Please try again.'),
  });
}

export function useGuardrailStats(workspaceId: string | undefined, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_GUARDRAIL_RULES, 'stats', workspaceId, startDate, endDate],
    queryFn: () => guardrailsService.getGuardrailStats(workspaceId as string, startDate, endDate),
    enabled: !!workspaceId,
  });
}
