import { apiClient } from '@/lib/api/axios';
import type {
  AiJob,
  AiJobExecution,
  AiJobFilterParams,
  AiJobListResult,
  AiJobSchedulerStats,
  CreateAiJobPayload,
  CreateJobDependencyPayload,
  ExecuteJobPayload,
  JobExecutionFilterParams,
  JobExecutionListResult,
  UpdateAiJobPayload,
} from '@/types';

const BASE = '/ai-job-scheduler';

export async function listAiJobs(params: AiJobFilterParams): Promise<AiJobListResult> {
  const { data } = await apiClient.get<AiJobListResult>(`${BASE}/jobs`, { params });
  return data;
}

export async function getAiJobById(id: string, workspaceId: string): Promise<AiJob> {
  const { data } = await apiClient.get<AiJob>(`${BASE}/jobs/${id}`, { params: { workspaceId } });
  return data;
}

export async function createAiJob(payload: CreateAiJobPayload): Promise<AiJob> {
  const { data } = await apiClient.post<AiJob>(`${BASE}/jobs`, payload);
  return data;
}

export async function updateAiJob(id: string, workspaceId: string, payload: UpdateAiJobPayload): Promise<AiJob> {
  const { data } = await apiClient.patch<AiJob>(`${BASE}/jobs/${id}`, payload, { params: { workspaceId } });
  return data;
}

export async function deleteAiJob(id: string, workspaceId: string): Promise<void> {
  await apiClient.delete(`${BASE}/jobs/${id}`, { params: { workspaceId } });
}

export async function pauseAiJob(id: string, workspaceId: string): Promise<AiJob> {
  const { data } = await apiClient.patch<AiJob>(`${BASE}/jobs/${id}/pause`, {}, { params: { workspaceId } });
  return data;
}

export async function resumeAiJob(id: string, workspaceId: string): Promise<AiJob> {
  const { data } = await apiClient.patch<AiJob>(`${BASE}/jobs/${id}/resume`, {}, { params: { workspaceId } });
  return data;
}

export async function archiveAiJob(id: string, workspaceId: string): Promise<void> {
  await apiClient.patch(`${BASE}/jobs/${id}/archive`, {}, { params: { workspaceId } });
}

export async function executeAiJob(payload: ExecuteJobPayload): Promise<AiJobExecution> {
  const { data } = await apiClient.post<AiJobExecution>(`${BASE}/execute`, payload);
  return data;
}

export async function listJobExecutions(params: JobExecutionFilterParams): Promise<JobExecutionListResult> {
  const { data } = await apiClient.get<JobExecutionListResult>(`${BASE}/executions`, { params });
  return data;
}

export async function getJobExecutionById(id: string, workspaceId: string): Promise<AiJobExecution> {
  const { data } = await apiClient.get<AiJobExecution>(`${BASE}/executions/${id}`, { params: { workspaceId } });
  return data;
}

export async function cancelJobExecution(id: string, workspaceId: string): Promise<AiJobExecution> {
  const { data } = await apiClient.post<AiJobExecution>(`${BASE}/executions/${id}/cancel`, {}, { params: { workspaceId } });
  return data;
}

export async function createJobDependency(payload: CreateJobDependencyPayload): Promise<unknown> {
  const { data } = await apiClient.post(`${BASE}/dependencies`, payload);
  return data;
}

export async function getJobSchedulerStats(workspaceId: string, startDate?: string, endDate?: string): Promise<AiJobSchedulerStats> {
  const { data } = await apiClient.get<AiJobSchedulerStats>(`${BASE}/stats`, { params: { workspaceId, startDate, endDate } });
  return data;
}
