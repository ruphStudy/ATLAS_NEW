import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as workflowService from '@/services/enterprise-workflow-engine.service';
import { QUERY_KEYS } from '@/constants';
import { useToast } from './use-toast';
import type {
  CreateEnterpriseWorkflowDefinitionPayload,
  EnterpriseWorkflowDefinitionFilterParams,
  EnterpriseWorkflowExecutionFilterParams,
  ExecuteEnterpriseWorkflowPayload,
  ReassignEnterpriseWorkflowStepPayload,
  ResumeEnterpriseWorkflowStepExecutionPayload,
  UpdateEnterpriseWorkflowDefinitionPayload,
} from '@/types';

export function useWorkflowDefinitions(params: EnterpriseWorkflowDefinitionFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.ENTERPRISE_WORKFLOW_DEFINITIONS, params],
    queryFn: () => workflowService.listWorkflowDefinitions(params),
    staleTime: 30 * 1000,
  });
}

export function useWorkflowDefinition(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.ENTERPRISE_WORKFLOW_DEFINITIONS, id],
    queryFn: () => workflowService.getWorkflowDefinitionById(id as string),
    enabled: !!id,
  });
}

export function useWorkflowDefinitionHistory(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.ENTERPRISE_WORKFLOW_DEFINITIONS, id, 'history'],
    queryFn: () => workflowService.getWorkflowDefinitionHistory(id as string),
    enabled: !!id,
  });
}

function invalidateDefinitions(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ENTERPRISE_WORKFLOW_DEFINITIONS] });
}

export function useCreateWorkflowDefinition() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateEnterpriseWorkflowDefinitionPayload) => workflowService.createWorkflowDefinition(payload),
    onSuccess: () => {
      invalidateDefinitions(queryClient);
      toast.success('Workflow definition created');
    },
    onError: () => toast.error('Could not create workflow', 'Please try again.'),
  });
}

export function useUpdateWorkflowDefinition(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateEnterpriseWorkflowDefinitionPayload) => workflowService.updateWorkflowDefinition(id, payload),
    onSuccess: () => {
      invalidateDefinitions(queryClient);
      toast.success('Workflow definition updated');
    },
    onError: () => toast.error('Could not update workflow', 'Please try again.'),
  });
}

function useDefinitionAction(id: string, action: (id: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(id),
    onSuccess: () => {
      invalidateDefinitions(queryClient);
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function usePublishWorkflowDefinition(id: string) {
  return useDefinitionAction(id, workflowService.publishWorkflowDefinition, 'Workflow published');
}

export function usePauseWorkflowDefinition(id: string) {
  return useDefinitionAction(id, workflowService.pauseWorkflowDefinition, 'Workflow paused');
}

export function useResumeWorkflowDefinition(id: string) {
  return useDefinitionAction(id, workflowService.resumeWorkflowDefinition, 'Workflow resumed');
}

export function useArchiveWorkflowDefinition(id: string) {
  return useDefinitionAction(id, workflowService.archiveWorkflowDefinition, 'Workflow archived');
}

export function useRestoreWorkflowDefinition(id: string) {
  return useDefinitionAction(id, workflowService.restoreWorkflowDefinition, 'Workflow restored');
}

export function useExecuteWorkflow() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ExecuteEnterpriseWorkflowPayload) => workflowService.executeWorkflow(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ENTERPRISE_WORKFLOW_EXECUTIONS] });
      toast.success('Workflow execution started');
    },
    onError: () => toast.error('Could not start execution', 'Please try again.'),
  });
}

export function useEnterpriseWorkflowExecutions(params: EnterpriseWorkflowExecutionFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.ENTERPRISE_WORKFLOW_EXECUTIONS, params],
    queryFn: () => workflowService.listEnterpriseWorkflowExecutions(params),
    staleTime: 15 * 1000,
  });
}

export function useEnterpriseWorkflowExecution(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.ENTERPRISE_WORKFLOW_EXECUTIONS, id],
    queryFn: () => workflowService.getEnterpriseWorkflowExecutionById(id as string),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'RUNNING' || status === 'WAITING' || status === 'COMPENSATING' ? 5000 : false;
    },
  });
}

function invalidateExecutions(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ENTERPRISE_WORKFLOW_EXECUTIONS] });
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ENTERPRISE_WORKFLOW_EXECUTIONS, id] });
}

export function usePauseEnterpriseWorkflowExecution(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => workflowService.pauseEnterpriseWorkflowExecution(id),
    onSuccess: () => {
      invalidateExecutions(queryClient, id);
      toast.success('Execution paused');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useResumeEnterpriseWorkflowExecution(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => workflowService.resumeEnterpriseWorkflowExecution(id),
    onSuccess: () => {
      invalidateExecutions(queryClient, id);
      toast.success('Execution resumed');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useCancelEnterpriseWorkflowExecution(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (reason?: string) => workflowService.cancelEnterpriseWorkflowExecution(id, reason),
    onSuccess: () => {
      invalidateExecutions(queryClient, id);
      toast.success('Execution cancelled');
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useResumeWorkflowStepExecution(executionId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ stepExecutionId, payload }: { stepExecutionId: string; payload: ResumeEnterpriseWorkflowStepExecutionPayload }) =>
      workflowService.resumeWorkflowStepExecution(executionId, stepExecutionId, payload),
    onSuccess: () => {
      invalidateExecutions(queryClient, executionId);
      toast.success('Step resumed');
    },
    onError: () => toast.error('Could not resume step', 'Please try again.'),
  });
}

export function useReassignWorkflowStep(executionId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ stepExecutionId, payload }: { stepExecutionId: string; payload: ReassignEnterpriseWorkflowStepPayload }) =>
      workflowService.reassignWorkflowStep(executionId, stepExecutionId, payload),
    onSuccess: () => {
      invalidateExecutions(queryClient, executionId);
      toast.success('Step reassigned');
    },
    onError: () => toast.error('Could not reassign step', 'Please try again.'),
  });
}
