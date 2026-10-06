import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as agentsService from '@/services/ai-agents.service';
import { QUERY_KEYS } from '@/constants';
import type {
  AgentExecutionFilterParams,
  AiAgentFilterParams,
  CreateAgentConfigurationPayload,
  CreateAiAgentPayload,
  ExecuteAgentPayload,
  UpdateAgentConfigurationPayload,
  UpdateAiAgentPayload,
} from '@/types';
import { useToast } from './use-toast';

export function useAiAgents(params: AiAgentFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_AGENTS, params],
    queryFn: () => agentsService.listAiAgents(params),
    staleTime: 30 * 1000,
  });
}

export function useAiAgent(id: string | undefined, workspaceId?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_AGENTS, id],
    queryFn: () => agentsService.getAiAgentById(id as string, workspaceId),
    enabled: !!id,
  });
}

export function useCreateAiAgent() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateAiAgentPayload) => agentsService.createAiAgent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_AGENTS] });
      toast.success('Agent created');
    },
    onError: () => toast.error('Could not create agent', 'Please try again.'),
  });
}

export function useUpdateAiAgent(id: string, workspaceId?: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateAiAgentPayload) => agentsService.updateAiAgent(id, payload, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_AGENTS] });
      toast.success('Agent updated');
    },
    onError: () => toast.error('Could not update agent', 'Please try again.'),
  });
}

export function useDeleteAiAgent() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, workspaceId }: { id: string; workspaceId?: string }) => agentsService.deleteAiAgent(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_AGENTS] });
      toast.success('Agent deleted');
    },
    onError: () => toast.error('Could not delete agent', 'Please try again.'),
  });
}

function useAiAgentAction(id: string, action: (id: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_AGENTS] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useActivateAiAgent(id: string) {
  return useAiAgentAction(id, agentsService.activateAiAgent, 'Agent activated');
}
export function useDeactivateAiAgent(id: string) {
  return useAiAgentAction(id, agentsService.deactivateAiAgent, 'Agent deactivated');
}
export function useArchiveAiAgent(id: string) {
  return useAiAgentAction(id, agentsService.archiveAiAgent, 'Agent archived');
}

export function useCreateAgentConfiguration() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateAgentConfigurationPayload) => agentsService.createAgentConfiguration(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_AGENTS] });
      toast.success('Configuration created');
    },
    onError: () => toast.error('Could not create configuration', 'Please try again.'),
  });
}

export function useUpdateAgentConfiguration(id: string, workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateAgentConfigurationPayload) => agentsService.updateAgentConfiguration(id, workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_AGENTS] });
      toast.success('Configuration updated');
    },
    onError: () => toast.error('Could not update configuration', 'Please try again.'),
  });
}

export function useDeleteAgentConfiguration(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => agentsService.deleteAgentConfiguration(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_AGENTS] });
      toast.success('Configuration deleted');
    },
    onError: () => toast.error('Could not delete configuration', 'Please try again.'),
  });
}

export function useExecuteAgent() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ExecuteAgentPayload) => agentsService.executeAgent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_AGENT_EXECUTIONS] });
      toast.success('Agent execution started');
    },
    onError: () => toast.error('Execution failed', 'Please try again.'),
  });
}

export function useAgentExecutions(params: AgentExecutionFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_AGENT_EXECUTIONS, params],
    queryFn: () => agentsService.listAgentExecutions(params),
  });
}

export function useAgentExecution(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_AGENT_EXECUTIONS, id],
    queryFn: () => agentsService.getAgentExecutionById(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useCancelAgentExecution(id: string, workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => agentsService.cancelAgentExecution(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_AGENT_EXECUTIONS] });
      toast.success('Execution cancelled');
    },
    onError: () => toast.error('Could not cancel execution', 'Please try again.'),
  });
}

export function useAgentStats(workspaceId: string | undefined, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_AGENTS, 'stats', workspaceId, startDate, endDate],
    queryFn: () => agentsService.getAgentStats(workspaceId as string, startDate, endDate),
    enabled: !!workspaceId,
  });
}
