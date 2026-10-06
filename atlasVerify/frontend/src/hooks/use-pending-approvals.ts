import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as approvalService from '@/services/approval-workflow.service';
import { listApprovalRequests } from '@/services/approval-workflow.service';
import { useAuthStore } from '@/stores';
import { useToast } from './use-toast';
import type {
  ApprovalActionReasonPayload,
  ApprovalRequestListParams,
  DecideApprovalPayload,
  DelegateApprovalPayload,
  OverrideApprovalPayload,
  ReassignApprovalPayload,
} from '@/types';

const APPROVALS_KEY = 'approval-workflow';

export function usePendingApprovals() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['approval-workflow-pending-mine'],
    queryFn: () => listApprovalRequests({ assignedToMe: true, status: 'PENDING', limit: 10 }),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useApprovalRequests(params: ApprovalRequestListParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [APPROVALS_KEY, 'requests', params],
    queryFn: () => approvalService.listApprovalRequestsFull(params),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useApprovalRequest(id: string | undefined) {
  return useQuery({
    queryKey: [APPROVALS_KEY, 'request', id],
    queryFn: () => approvalService.getApprovalRequest(id as string),
    enabled: !!id,
  });
}

export function useApprovalStepInstances(id: string | undefined) {
  return useQuery({
    queryKey: [APPROVALS_KEY, 'steps', id],
    queryFn: () => approvalService.getApprovalStepInstances(id as string),
    enabled: !!id,
  });
}

export function useApprovalDecisionHistory(id: string | undefined) {
  return useQuery({
    queryKey: [APPROVALS_KEY, 'decisions', id],
    queryFn: () => approvalService.getApprovalDecisionHistory(id as string),
    enabled: !!id,
  });
}

function useApprovalActionMutation<TVariables>(mutationFn: (vars: TVariables) => Promise<unknown>, id: string, successMessage: string, errorMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [APPROVALS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['approval-workflow-pending-mine'] });
      toast.success(successMessage);
      void id;
    },
    onError: () => toast.error(errorMessage, 'Please try again.'),
  });
}

export function useDecideApproval(id: string) {
  return useApprovalActionMutation<{ stepInstanceId: string; payload: DecideApprovalPayload }>(
    ({ stepInstanceId, payload }) => approvalService.decideApproval(id, stepInstanceId, payload),
    id,
    'Decision recorded',
    'Could not record decision',
  );
}

export function useDelegateApproval(id: string) {
  return useApprovalActionMutation<{ stepInstanceId: string; payload: DelegateApprovalPayload }>(
    ({ stepInstanceId, payload }) => approvalService.delegateApproval(id, stepInstanceId, payload),
    id,
    'Approval delegated',
    'Could not delegate approval',
  );
}

export function useReassignApproval(id: string) {
  return useApprovalActionMutation<{ stepInstanceId: string; assignmentId: string; payload: ReassignApprovalPayload }>(
    ({ stepInstanceId, assignmentId, payload }) => approvalService.reassignApproval(id, stepInstanceId, assignmentId, payload),
    id,
    'Approval reassigned',
    'Could not reassign approval',
  );
}

export function useResubmitApproval(id: string) {
  return useApprovalActionMutation<ApprovalActionReasonPayload | undefined>(
    (payload) => approvalService.resubmitApproval(id, payload ?? {}),
    id,
    'Request resubmitted',
    'Could not resubmit request',
  );
}

export function useCancelApproval(id: string) {
  return useApprovalActionMutation<ApprovalActionReasonPayload | undefined>(
    (payload) => approvalService.cancelApproval(id, payload ?? {}),
    id,
    'Request cancelled',
    'Could not cancel request',
  );
}

export function useRecallApproval(id: string) {
  return useApprovalActionMutation<ApprovalActionReasonPayload | undefined>(
    (payload) => approvalService.recallApproval(id, payload ?? {}),
    id,
    'Request recalled',
    'Could not recall request',
  );
}

export function useOverrideApproval(id: string) {
  return useApprovalActionMutation<OverrideApprovalPayload>(
    (payload) => approvalService.overrideApproval(id, payload),
    id,
    'Approval overridden',
    'Could not override approval',
  );
}
