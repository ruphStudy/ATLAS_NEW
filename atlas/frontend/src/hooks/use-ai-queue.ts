import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as queueService from '@/services/ai-queue.service';
import { QUERY_KEYS } from '@/constants';
import type { AiQueueFilterParams, CreateAiQueuePayload, EnqueueBatchPayload, EnqueueJobPayload, QueueJobFilterParams, UpdateAiQueuePayload } from '@/types';
import { useToast } from './use-toast';

export function useAiQueues(params: AiQueueFilterParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_QUEUES, params],
    queryFn: () => queueService.listAiQueues(params),
    staleTime: 15 * 1000,
  });
}

export function useAiQueue(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_QUEUES, id],
    queryFn: () => queueService.getAiQueueById(id as string),
    enabled: !!id,
  });
}

export function useCreateAiQueue() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateAiQueuePayload) => queueService.createAiQueue(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_QUEUES] });
      toast.success('Queue created');
    },
    onError: () => toast.error('Could not create queue', 'Please try again.'),
  });
}

export function useUpdateAiQueue(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateAiQueuePayload) => queueService.updateAiQueue(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_QUEUES] });
      toast.success('Queue updated');
    },
    onError: () => toast.error('Could not update queue', 'Please try again.'),
  });
}

export function useDeleteAiQueue() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => queueService.deleteAiQueue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_QUEUES] });
      toast.success('Queue deleted');
    },
    onError: () => toast.error('Could not delete queue', 'Please try again.'),
  });
}

function useAiQueueAction(id: string, action: (id: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_QUEUES] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function usePauseAiQueue(id: string) {
  return useAiQueueAction(id, queueService.pauseAiQueue, 'Queue paused');
}
export function useResumeAiQueue(id: string) {
  return useAiQueueAction(id, queueService.resumeAiQueue, 'Queue resumed');
}
export function useDrainAiQueue(id: string) {
  return useAiQueueAction(id, queueService.drainAiQueue, 'Queue draining');
}
export function useStopAiQueue(id: string) {
  return useAiQueueAction(id, queueService.stopAiQueue, 'Queue stopped');
}

export function useEnqueueJob() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: EnqueueJobPayload) => queueService.enqueueJob(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_QUEUE_JOBS] });
      toast.success('Job enqueued');
    },
    onError: () => toast.error('Could not enqueue job', 'Please try again.'),
  });
}

export function useEnqueueBatch() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: EnqueueBatchPayload) => queueService.enqueueBatch(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_QUEUE_JOBS] });
      toast.success('Batch enqueued');
    },
    onError: () => toast.error('Could not enqueue batch', 'Please try again.'),
  });
}

export function useQueueJobs(params: QueueJobFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_QUEUE_JOBS, params],
    queryFn: () => queueService.listQueueJobs(params),
    enabled: !!params.workspaceId,
  });
}

export function useQueueJob(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_QUEUE_JOBS, id],
    queryFn: () => queueService.getQueueJobById(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useCancelQueueJob(id: string, workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => queueService.cancelQueueJob(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_QUEUE_JOBS] });
      toast.success('Job cancelled');
    },
    onError: () => toast.error('Could not cancel job', 'Please try again.'),
  });
}

export function useQueueStats(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_QUEUES, id, 'stats'],
    queryFn: () => queueService.getQueueStats(id as string),
    enabled: !!id,
    refetchInterval: 10 * 1000,
  });
}
