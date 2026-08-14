import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as orchestratorService from '@/services/ai-orchestrator.service';
import { QUERY_KEYS } from '@/constants';
import type { AiExecutionLogFilterParams, AiRequestFilterParams, CreateAiRequestPayload } from '@/types';
import { useToast } from './use-toast';

export function useAiRequests(params: AiRequestFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_REQUESTS, params],
    queryFn: () => orchestratorService.listAiRequests(params),
    staleTime: 15 * 1000,
  });
}

export function useAiRequest(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_REQUESTS, id],
    queryFn: () => orchestratorService.getAiRequestById(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useCreateAiRequest() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateAiRequestPayload) => orchestratorService.createAiRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_REQUESTS] });
      toast.success('Request created');
    },
    onError: () => toast.error('Could not create request', 'Please try again.'),
  });
}

export function useCancelAiRequest(id: string, workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => orchestratorService.cancelAiRequest(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_REQUESTS] });
      toast.success('Request cancelled');
    },
    onError: () => toast.error('Could not cancel request', 'Please try again.'),
  });
}

export function useAiExecutionLogs(params: AiExecutionLogFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_EXECUTION_LOGS, params],
    queryFn: () => orchestratorService.listAiExecutionLogs(params),
  });
}

export function useOrchestratorStats(workspaceId: string | undefined, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_ORCHESTRATOR_STATS, workspaceId, startDate, endDate],
    queryFn: () => orchestratorService.getOrchestratorStats(workspaceId as string, startDate, endDate),
    enabled: !!workspaceId,
  });
}
