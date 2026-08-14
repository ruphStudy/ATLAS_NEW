import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as decisionsService from '@/services/ai-decisions.service';
import { QUERY_KEYS } from '@/constants';
import type {
  ApproveDecisionPayload,
  CreateDecisionRulePayload,
  DecisionFilterParams,
  EvaluateDecisionPayload,
  OverrideDecisionPayload,
  RejectDecisionPayload,
  ReviewDecisionPayload,
  UpdateDecisionRulePayload,
} from '@/types';
import { useToast } from './use-toast';

export function useEvaluateDecision() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: EvaluateDecisionPayload) => decisionsService.evaluateDecision(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_DECISIONS] });
    },
    onError: () => toast.error('Evaluation failed', 'Please try again.'),
  });
}

export function useDecisions(params: DecisionFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_DECISIONS, params],
    queryFn: () => decisionsService.listDecisions(params),
    enabled: !!params.workspaceId,
    staleTime: 15 * 1000,
  });
}

export function useDecision(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_DECISIONS, id],
    queryFn: () => decisionsService.getDecisionById(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useDecisionCandidates(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_DECISIONS, id, 'candidates'],
    queryFn: () => decisionsService.getDecisionCandidates(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useDecisionHistory(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_DECISIONS, id, 'history'],
    queryFn: () => decisionsService.getDecisionHistory(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useDecisionOverrides(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_DECISIONS, id, 'overrides'],
    queryFn: () => decisionsService.getDecisionOverrides(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

function useDecisionAction<T>(id: string, action: (id: string, payload: T) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: T) => action(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_DECISIONS] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useApproveDecision(id: string) {
  return useDecisionAction<ApproveDecisionPayload>(id, decisionsService.approveDecision, 'Decision approved');
}
export function useRejectDecision(id: string) {
  return useDecisionAction<RejectDecisionPayload>(id, decisionsService.rejectDecision, 'Decision rejected');
}
export function useReviewDecision(id: string) {
  return useDecisionAction<ReviewDecisionPayload>(id, decisionsService.reviewDecision, 'Decision reviewed');
}
export function useOverrideDecision(id: string) {
  return useDecisionAction<OverrideDecisionPayload>(id, decisionsService.overrideDecision, 'Decision overridden');
}

export function useDecisionStats(workspaceId: string | undefined, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_DECISIONS, 'stats', workspaceId, startDate, endDate],
    queryFn: () => decisionsService.getDecisionStats(workspaceId as string, startDate, endDate),
    enabled: !!workspaceId,
  });
}

export function useCreateDecisionRule() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateDecisionRulePayload) => decisionsService.createDecisionRule(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_DECISION_RULES] });
      toast.success('Rule created');
    },
    onError: () => toast.error('Could not create rule', 'Please try again.'),
  });
}

export function useUpdateDecisionRule(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateDecisionRulePayload) => decisionsService.updateDecisionRule(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_DECISION_RULES] });
      toast.success('Rule updated');
    },
    onError: () => toast.error('Could not update rule', 'Please try again.'),
  });
}

export function useDeleteDecisionRule() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => decisionsService.deleteDecisionRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_DECISION_RULES] });
      toast.success('Rule deleted');
    },
    onError: () => toast.error('Could not delete rule', 'Please try again.'),
  });
}

export function useDecisionRule(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_DECISION_RULES, id],
    queryFn: () => decisionsService.getDecisionRuleById(id as string),
    enabled: !!id,
  });
}
