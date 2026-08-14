import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as promptsService from '@/services/ai-prompts.service';
import { QUERY_KEYS } from '@/constants';
import type {
  AiPromptFilterParams,
  CompilePromptPayload,
  CreateAiPromptPayload,
  CreatePromptVersionPayload,
  ResolvePromptParams,
  RollbackPromptPayload,
  UpdateAiPromptPayload,
} from '@/types';
import { useToast } from './use-toast';

export function useAiPrompts(params: AiPromptFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_PROMPTS, params],
    queryFn: () => promptsService.listAiPrompts(params),
    staleTime: 30 * 1000,
  });
}

export function useAiPrompt(id: string | undefined, workspaceId?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_PROMPTS, id],
    queryFn: () => promptsService.getAiPromptById(id as string, workspaceId),
    enabled: !!id,
  });
}

export function useCreateAiPrompt() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateAiPromptPayload) => promptsService.createAiPrompt(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROMPTS] });
      toast.success('Prompt created');
    },
    onError: () => toast.error('Could not create prompt', 'Please try again.'),
  });
}

export function useUpdateAiPrompt(id: string, workspaceId?: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateAiPromptPayload) => promptsService.updateAiPrompt(id, payload, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROMPTS] });
      toast.success('Prompt updated');
    },
    onError: () => toast.error('Could not update prompt', 'Please try again.'),
  });
}

export function useDeleteAiPrompt() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, workspaceId }: { id: string; workspaceId?: string }) => promptsService.deleteAiPrompt(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROMPTS] });
      toast.success('Prompt deleted');
    },
    onError: () => toast.error('Could not delete prompt', 'Please try again.'),
  });
}

export function usePublishAiPrompt(id: string, workspaceId?: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (publishedBy?: string) => promptsService.publishAiPrompt(id, workspaceId, publishedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROMPTS] });
      toast.success('Prompt published');
    },
    onError: () => toast.error('Publish failed', 'Please try again.'),
  });
}

function useAiPromptAction(id: string, action: (id: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROMPTS] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function useDeprecateAiPrompt(id: string) {
  return useAiPromptAction(id, promptsService.deprecateAiPrompt, 'Prompt deprecated');
}
export function useArchiveAiPrompt(id: string) {
  return useAiPromptAction(id, promptsService.archiveAiPrompt, 'Prompt archived');
}

export function useCreatePromptVersion() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreatePromptVersionPayload) => promptsService.createPromptVersion(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROMPTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROMPT_VERSIONS] });
      toast.success('Version created');
    },
    onError: () => toast.error('Could not create version', 'Please try again.'),
  });
}

export function usePromptVersions(promptId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_PROMPT_VERSIONS, promptId],
    queryFn: () => promptsService.listPromptVersions(promptId as string),
    enabled: !!promptId,
  });
}

export function useRollbackPrompt() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: RollbackPromptPayload) => promptsService.rollbackPrompt(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROMPTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_PROMPT_VERSIONS] });
      toast.success('Prompt rolled back');
    },
    onError: () => toast.error('Rollback failed', 'Please try again.'),
  });
}

export function useResolvePrompt() {
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ResolvePromptParams) => promptsService.resolvePrompt(payload),
    onError: () => toast.error('Could not resolve prompt', 'Please try again.'),
  });
}

export function useCompilePrompt() {
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CompilePromptPayload) => promptsService.compilePrompt(payload),
    onError: () => toast.error('Compile failed', 'Please check variables and try again.'),
  });
}

export function usePromptStats(id: string | undefined, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_PROMPTS, id, 'stats', startDate, endDate],
    queryFn: () => promptsService.getPromptStats(id as string, startDate, endDate),
    enabled: !!id,
  });
}
