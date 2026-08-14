import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as workflowsService from '@/services/ai-workflows.service';
import { QUERY_KEYS } from '@/constants';
import type {
  AiWorkflowFilterParams,
  CreateAiWorkflowPayload,
  CreateWorkflowSchedulePayload,
  ExecuteWorkflowPayload,
  UpdateAiWorkflowPayload,
  UpdateWorkflowSchedulePayload,
  WorkflowExecutionFilterParams,
} from '@/types';
import { useToast } from './use-toast';

export function useAiWorkflows(params: AiWorkflowFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_WORKFLOWS, params],
    queryFn: () => workflowsService.listAiWorkflows(params),
    staleTime: 30 * 1000,
  });
}

export function useAiWorkflow(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_WORKFLOWS, id],
    queryFn: () => workflowsService.getAiWorkflowById(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useCreateAiWorkflow() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateAiWorkflowPayload) => workflowsService.createAiWorkflow(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_WORKFLOWS] });
      toast.success('Workflow created');
    },
    onError: () => toast.error('Could not create workflow', 'Please try again.'),
  });
}

export function useUpdateAiWorkflow(id: string, workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateAiWorkflowPayload) => workflowsService.updateAiWorkflow(id, workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_WORKFLOWS] });
      toast.success('Workflow updated');
    },
    onError: () => toast.error('Could not update workflow', 'Please try again.'),
  });
}

export function useDeleteAiWorkflow(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => workflowsService.deleteAiWorkflow(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_WORKFLOWS] });
      toast.success('Workflow deleted');
    },
    onError: () => toast.error('Could not delete workflow', 'Please try again.'),
  });
}

export function usePublishAiWorkflow(id: string, workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (publishedBy?: string) => workflowsService.publishAiWorkflow(id, workspaceId, publishedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_WORKFLOWS] });
      toast.success('Workflow published');
    },
    onError: () => toast.error('Publish failed', 'Please try again.'),
  });
}

function useAiWorkflowAction(id: string, action: (id: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_WORKFLOWS] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function usePauseAiWorkflow(id: string) {
  return useAiWorkflowAction(id, workflowsService.pauseAiWorkflow, 'Workflow paused');
}
export function useResumeAiWorkflow(id: string) {
  return useAiWorkflowAction(id, workflowsService.resumeAiWorkflow, 'Workflow resumed');
}
export function useArchiveAiWorkflow(id: string) {
  return useAiWorkflowAction(id, workflowsService.archiveAiWorkflow, 'Workflow archived');
}

export function useExecuteAiWorkflow() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ExecuteWorkflowPayload) => workflowsService.executeAiWorkflow(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_WORKFLOW_EXECUTIONS] });
      toast.success('Workflow execution started');
    },
    onError: () => toast.error('Execution failed', 'Please try again.'),
  });
}

export function useWorkflowExecutions(params: WorkflowExecutionFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_WORKFLOW_EXECUTIONS, params],
    queryFn: () => workflowsService.listWorkflowExecutions(params),
  });
}

export function useWorkflowExecution(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_WORKFLOW_EXECUTIONS, id],
    queryFn: () => workflowsService.getWorkflowExecutionById(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

function useWorkflowExecutionAction(id: string, workspaceId: string, action: (id: string, workspaceId: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_WORKFLOW_EXECUTIONS] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useCancelWorkflowExecution(id: string, workspaceId: string) {
  return useWorkflowExecutionAction(id, workspaceId, workflowsService.cancelWorkflowExecution, 'Execution cancelled');
}
export function usePauseWorkflowExecution(id: string, workspaceId: string) {
  return useWorkflowExecutionAction(id, workspaceId, workflowsService.pauseWorkflowExecution, 'Execution paused');
}
export function useResumeWorkflowExecution(id: string, workspaceId: string) {
  return useWorkflowExecutionAction(id, workspaceId, workflowsService.resumeWorkflowExecution, 'Execution resumed');
}

export function useCreateWorkflowSchedule() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateWorkflowSchedulePayload) => workflowsService.createWorkflowSchedule(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_WORKFLOW_SCHEDULES] });
      toast.success('Schedule created');
    },
    onError: () => toast.error('Could not create schedule', 'Please try again.'),
  });
}

export function useUpdateWorkflowSchedule(id: string, workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateWorkflowSchedulePayload) => workflowsService.updateWorkflowSchedule(id, workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_WORKFLOW_SCHEDULES] });
      toast.success('Schedule updated');
    },
    onError: () => toast.error('Could not update schedule', 'Please try again.'),
  });
}

export function useDeleteWorkflowSchedule(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => workflowsService.deleteWorkflowSchedule(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_WORKFLOW_SCHEDULES] });
      toast.success('Schedule deleted');
    },
    onError: () => toast.error('Could not delete schedule', 'Please try again.'),
  });
}

export function useWorkflowStats(workspaceId: string | undefined, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_WORKFLOWS, 'stats', workspaceId, startDate, endDate],
    queryFn: () => workflowsService.getWorkflowStats(workspaceId as string, startDate, endDate),
    enabled: !!workspaceId,
  });
}
