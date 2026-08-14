import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as schedulerService from '@/services/ai-scheduler.service';
import { QUERY_KEYS } from '@/constants';
import type { AiJobFilterParams, CreateAiJobPayload, CreateJobDependencyPayload, ExecuteJobPayload, JobExecutionFilterParams, UpdateAiJobPayload } from '@/types';
import { useToast } from './use-toast';

export function useAiJobs(params: AiJobFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_JOBS, params],
    queryFn: () => schedulerService.listAiJobs(params),
    enabled: !!params.workspaceId,
    staleTime: 15 * 1000,
  });
}

export function useAiJob(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_JOBS, id],
    queryFn: () => schedulerService.getAiJobById(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useCreateAiJob() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateAiJobPayload) => schedulerService.createAiJob(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_JOBS] });
      toast.success('Job created');
    },
    onError: () => toast.error('Could not create job', 'Please try again.'),
  });
}

export function useUpdateAiJob(id: string, workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: UpdateAiJobPayload) => schedulerService.updateAiJob(id, workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_JOBS] });
      toast.success('Job updated');
    },
    onError: () => toast.error('Could not update job', 'Please try again.'),
  });
}

export function useDeleteAiJob(workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => schedulerService.deleteAiJob(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_JOBS] });
      toast.success('Job deleted');
    },
    onError: () => toast.error('Could not delete job', 'Please try again.'),
  });
}

function useAiJobAction(id: string, workspaceId: string, action: (id: string, workspaceId: string) => Promise<unknown>, successMessage: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => action(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_JOBS] });
      toast.success(successMessage);
    },
    onError: () => toast.error('Action failed', 'Please try again.'),
  });
}

export function usePauseAiJob(id: string, workspaceId: string) {
  return useAiJobAction(id, workspaceId, schedulerService.pauseAiJob, 'Job paused');
}
export function useResumeAiJob(id: string, workspaceId: string) {
  return useAiJobAction(id, workspaceId, schedulerService.resumeAiJob, 'Job resumed');
}
export function useArchiveAiJob(id: string, workspaceId: string) {
  return useAiJobAction(id, workspaceId, schedulerService.archiveAiJob, 'Job archived');
}

export function useExecuteAiJob() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: ExecuteJobPayload) => schedulerService.executeAiJob(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_JOB_EXECUTIONS] });
      toast.success('Job executed');
    },
    onError: () => toast.error('Execution failed', 'Please try again.'),
  });
}

export function useJobExecutions(params: JobExecutionFilterParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_JOB_EXECUTIONS, params],
    queryFn: () => schedulerService.listJobExecutions(params),
    enabled: !!params.workspaceId,
  });
}

export function useJobExecution(id: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_JOB_EXECUTIONS, id],
    queryFn: () => schedulerService.getJobExecutionById(id as string, workspaceId as string),
    enabled: !!id && !!workspaceId,
  });
}

export function useCancelJobExecution(id: string, workspaceId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: () => schedulerService.cancelJobExecution(id, workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_JOB_EXECUTIONS] });
      toast.success('Execution cancelled');
    },
    onError: () => toast.error('Could not cancel execution', 'Please try again.'),
  });
}

export function useCreateJobDependency() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (payload: CreateJobDependencyPayload) => schedulerService.createJobDependency(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.AI_JOBS] });
      toast.success('Dependency added');
    },
    onError: () => toast.error('Could not add dependency', 'Please try again.'),
  });
}

export function useJobSchedulerStats(workspaceId: string | undefined, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.AI_JOBS, 'stats', workspaceId, startDate, endDate],
    queryFn: () => schedulerService.getJobSchedulerStats(workspaceId as string, startDate, endDate),
    enabled: !!workspaceId,
  });
}
