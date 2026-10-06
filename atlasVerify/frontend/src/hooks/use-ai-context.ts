import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as contextService from '@/services/ai-context.service';
import { QUERY_KEYS } from '@/constants';
import type { AiContextFilterParams, CreateAiContextPayload, MergeContextPayload } from '@/types';
import { useToast } from './use-toast';

export function useAiContexts(params: AiContextFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_CONTEXTS, params],
    queryFn: () => contextService.listAiContexts(params),
    enabled: !!params.workspaceId,
    staleTime: 15 * 1000,
  });
}

export function useAiContext(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_CONTEXTS, id],
    queryFn: () => contextService.getAiContextById(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useCreateAiContext() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateAiContextPayload) => contextService.createAiContext(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_CONTEXTS] });
      toast.success('Context created');
    },
    onError: () => toast.error('Could not create context', 'Please try again.'),
  });
}

export function useDeleteAiContext(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => contextService.deleteAiContext(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_CONTEXTS] });
      toast.success('Context deleted');
    },
    onError: () => toast.error('Could not delete context', 'Please try again.'),
  });
}

export function useMergeAiContexts() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: MergeContextPayload) => contextService.mergeAiContexts(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_CONTEXTS] });
      toast.success('Contexts merged');
    },
    onError: () => toast.error('Merge failed', 'Please try again.'),
  });
}

function useAiContextAction(id: string, workspaceId: string, action: (id: string, workspaceId: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_CONTEXTS] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useSummarizeAiContext(id: string, workspaceId: string) {
  return useAiContextAction(id, workspaceId, contextService.summarizeAiContext, 'Context summarized');
}
export function useExpireAiContext(id: string, workspaceId: string) {
  return useAiContextAction(id, workspaceId, contextService.expireAiContext, 'Context expired');
}
export function useArchiveAiContext(id: string, workspaceId: string) {
  return useAiContextAction(id, workspaceId, contextService.archiveAiContext, 'Context archived');
}

export function useTrimAiContext(id: string, workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (maxTokens: number) => contextService.trimAiContext(id, workspaceId, maxTokens),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_CONTEXTS] });
      toast.success('Context trimmed');
    },
    onError: () => toast.error('Trim failed', 'Please try again.'),
  });
}

export function useAiContextVersions(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_CONTEXTS, id, 'versions'],
    queryFn: () => contextService.listAiContextVersions(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useAiContextStats(workspaceId: string | undefined, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_CONTEXTS, 'stats', workspaceId, startDate, endDate],
    queryFn: () => contextService.getAiContextStats(workspaceId as string, startDate, endDate),
    enabled: !!workspaceId,
  });
}
