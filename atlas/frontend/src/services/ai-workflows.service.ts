import { apiClient } from '@/lib/api/axios';
import type {
  AiWorkflow,
  AiWorkflowFilterParams,
  AiWorkflowListResult,
  AiWorkflowSchedule,
  AiWorkflowStats,
  CreateAiWorkflowPayload,
  CreateWorkflowSchedulePayload,
  AiWorkflowExecution,
  ExecuteWorkflowPayload,
  UpdateAiWorkflowPayload,
  UpdateWorkflowSchedulePayload,
  WorkflowExecutionFilterParams,
  WorkflowExecutionListResult,
  WorkflowExecutionResult,
} from '@/types';

const BASE = '/ai-workflow';

export async function listAiWorkflows(params: AiWorkflowFilterParams = {}): Promise<AiWorkflowListResult> {
  const { data } = await apiClient.get<AiWorkflowListResult>(`${BASE}/workflows`, { params });
  return data;
}

export async function getAiWorkflowById(id: string, workspaceId: string): Promise<AiWorkflow> {
  const { data } = await apiClient.get<AiWorkflow>(`${BASE}/workflows/${id}`, { params: { workspaceId } });
  return data;
}

export async function createAiWorkflow(payload: CreateAiWorkflowPayload): Promise<AiWorkflow> {
  const { data } = await apiClient.post<AiWorkflow>(`${BASE}/workflows`, payload);
  return data;
}

export async function updateAiWorkflow(id: string, workspaceId: string, payload: UpdateAiWorkflowPayload): Promise<AiWorkflow> {
  const { data } = await apiClient.patch<AiWorkflow>(`${BASE}/workflows/${id}`, payload, { params: { workspaceId } });
  return data;
}

export async function deleteAiWorkflow(id: string, workspaceId: string): Promise<void> {
  await apiClient.delete(`${BASE}/workflows/${id}`, { params: { workspaceId } });
}

export async function publishAiWorkflow(id: string, workspaceId: string, publishedBy?: string): Promise<AiWorkflow> {
  const { data } = await apiClient.post<AiWorkflow>(`${BASE}/workflows/${id}/publish`, {}, { params: { workspaceId, publishedBy } });
  return data;
}

export async function pauseAiWorkflow(id: string): Promise<AiWorkflow> {
  const { data } = await apiClient.patch<AiWorkflow>(`${BASE}/workflows/${id}/pause`);
  return data;
}

export async function resumeAiWorkflow(id: string): Promise<AiWorkflow> {
  const { data } = await apiClient.patch<AiWorkflow>(`${BASE}/workflows/${id}/resume`);
  return data;
}

export async function archiveAiWorkflow(id: string): Promise<AiWorkflow> {
  const { data } = await apiClient.patch<AiWorkflow>(`${BASE}/workflows/${id}/archive`);
  return data;
}

export async function executeAiWorkflow(payload: ExecuteWorkflowPayload): Promise<WorkflowExecutionResult> {
  const { data } = await apiClient.post<WorkflowExecutionResult>(`${BASE}/execute`, payload);
  return data;
}

export async function listWorkflowExecutions(params: WorkflowExecutionFilterParams = {}): Promise<WorkflowExecutionListResult> {
  const { data } = await apiClient.get<WorkflowExecutionListResult>(`${BASE}/executions`, { params });
  return data;
}

export async function getWorkflowExecutionById(id: string, workspaceId: string): Promise<AiWorkflowExecution> {
  const { data } = await apiClient.get<AiWorkflowExecution>(`${BASE}/executions/${id}`, { params: { workspaceId } });
  return data;
}

export async function cancelWorkflowExecution(id: string, workspaceId: string): Promise<AiWorkflowExecution> {
  const { data } = await apiClient.post<AiWorkflowExecution>(`${BASE}/executions/${id}/cancel`, {}, { params: { workspaceId } });
  return data;
}

export async function pauseWorkflowExecution(id: string, workspaceId: string): Promise<AiWorkflowExecution> {
  const { data } = await apiClient.post<AiWorkflowExecution>(`${BASE}/executions/${id}/pause`, {}, { params: { workspaceId } });
  return data;
}

export async function resumeWorkflowExecution(id: string, workspaceId: string): Promise<AiWorkflowExecution> {
  const { data } = await apiClient.post<AiWorkflowExecution>(`${BASE}/executions/${id}/resume`, {}, { params: { workspaceId } });
  return data;
}

export async function createWorkflowSchedule(payload: CreateWorkflowSchedulePayload): Promise<AiWorkflowSchedule> {
  const { data } = await apiClient.post<AiWorkflowSchedule>(`${BASE}/schedules`, payload);
  return data;
}

export async function updateWorkflowSchedule(id: string, workspaceId: string, payload: UpdateWorkflowSchedulePayload): Promise<AiWorkflowSchedule> {
  const { data } = await apiClient.patch<AiWorkflowSchedule>(`${BASE}/schedules/${id}`, payload, { params: { workspaceId } });
  return data;
}

export async function deleteWorkflowSchedule(id: string, workspaceId: string): Promise<void> {
  await apiClient.delete(`${BASE}/schedules/${id}`, { params: { workspaceId } });
}

export async function getWorkflowStats(workspaceId: string, startDate?: string, endDate?: string): Promise<AiWorkflowStats> {
  const { data } = await apiClient.get<AiWorkflowStats>(`${BASE}/stats`, { params: { workspaceId, startDate, endDate } });
  return data;
}
