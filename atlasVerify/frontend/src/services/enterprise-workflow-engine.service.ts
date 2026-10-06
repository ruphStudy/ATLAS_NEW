import { apiClient } from '@/lib/api/axios';
import type {
  CreateEnterpriseWorkflowDefinitionPayload,
  EnterpriseWorkflowDefinition,
  EnterpriseWorkflowDefinitionFilterParams,
  EnterpriseWorkflowDefinitionHistoryEntry,
  EnterpriseWorkflowDefinitionListResult,
  EnterpriseWorkflowExecution,
  EnterpriseWorkflowExecutionFilterParams,
  EnterpriseWorkflowExecutionListResult,
  ExecuteEnterpriseWorkflowPayload,
  ReassignEnterpriseWorkflowStepPayload,
  ResumeEnterpriseWorkflowStepExecutionPayload,
  UpdateEnterpriseWorkflowDefinitionPayload,
} from '@/types';

const BASE = '/enterprise-workflow-engine';

export async function listWorkflowDefinitions(params: EnterpriseWorkflowDefinitionFilterParams = {}): Promise<EnterpriseWorkflowDefinitionListResult> {
  const { data } = await apiClient.get(`${BASE}/definitions`, { params });
  return data;
}

export async function getWorkflowDefinitionById(id: string): Promise<EnterpriseWorkflowDefinition> {
  const { data } = await apiClient.get(`${BASE}/definitions/${id}`);
  return data;
}

export async function createWorkflowDefinition(payload: CreateEnterpriseWorkflowDefinitionPayload): Promise<EnterpriseWorkflowDefinition> {
  const { data } = await apiClient.post(`${BASE}/definitions`, payload);
  return data;
}

export async function updateWorkflowDefinition(id: string, payload: UpdateEnterpriseWorkflowDefinitionPayload): Promise<EnterpriseWorkflowDefinition> {
  const { data } = await apiClient.patch(`${BASE}/definitions/${id}`, payload);
  return data;
}

export async function publishWorkflowDefinition(id: string): Promise<EnterpriseWorkflowDefinition> {
  const { data } = await apiClient.post(`${BASE}/definitions/${id}/publish`);
  return data;
}

export async function pauseWorkflowDefinition(id: string): Promise<EnterpriseWorkflowDefinition> {
  const { data } = await apiClient.post(`${BASE}/definitions/${id}/pause`);
  return data;
}

export async function resumeWorkflowDefinition(id: string): Promise<EnterpriseWorkflowDefinition> {
  const { data } = await apiClient.post(`${BASE}/definitions/${id}/resume`);
  return data;
}

export async function archiveWorkflowDefinition(id: string): Promise<EnterpriseWorkflowDefinition> {
  const { data } = await apiClient.post(`${BASE}/definitions/${id}/archive`);
  return data;
}

export async function restoreWorkflowDefinition(id: string): Promise<EnterpriseWorkflowDefinition> {
  const { data } = await apiClient.post(`${BASE}/definitions/${id}/restore`);
  return data;
}

export async function getWorkflowDefinitionHistory(id: string): Promise<EnterpriseWorkflowDefinitionHistoryEntry[]> {
  const { data } = await apiClient.get(`${BASE}/definitions/${id}/history`);
  return data;
}

export async function executeWorkflow(payload: ExecuteEnterpriseWorkflowPayload): Promise<EnterpriseWorkflowExecution> {
  const { data } = await apiClient.post(`${BASE}/executions`, payload);
  return data;
}

export async function listEnterpriseWorkflowExecutions(params: EnterpriseWorkflowExecutionFilterParams = {}): Promise<EnterpriseWorkflowExecutionListResult> {
  const { data } = await apiClient.get(`${BASE}/executions`, { params });
  return data;
}

export async function getEnterpriseWorkflowExecutionById(id: string): Promise<EnterpriseWorkflowExecution> {
  const { data } = await apiClient.get(`${BASE}/executions/${id}`);
  return data;
}

export async function pauseEnterpriseWorkflowExecution(id: string): Promise<EnterpriseWorkflowExecution> {
  const { data } = await apiClient.post(`${BASE}/executions/${id}/pause`);
  return data;
}

export async function resumeEnterpriseWorkflowExecution(id: string): Promise<EnterpriseWorkflowExecution> {
  const { data } = await apiClient.post(`${BASE}/executions/${id}/resume`);
  return data;
}

export async function cancelEnterpriseWorkflowExecution(id: string, reason?: string): Promise<EnterpriseWorkflowExecution> {
  const { data } = await apiClient.post(`${BASE}/executions/${id}/cancel`, { reason });
  return data;
}

export async function resumeWorkflowStepExecution(
  executionId: string,
  stepExecutionId: string,
  payload: ResumeEnterpriseWorkflowStepExecutionPayload,
): Promise<EnterpriseWorkflowExecution> {
  const { data } = await apiClient.post(`${BASE}/executions/${executionId}/steps/${stepExecutionId}/resume`, payload);
  return data;
}

export async function reassignWorkflowStep(
  executionId: string,
  stepExecutionId: string,
  payload: ReassignEnterpriseWorkflowStepPayload,
): Promise<EnterpriseWorkflowExecution> {
  const { data } = await apiClient.post(`${BASE}/executions/${executionId}/steps/${stepExecutionId}/reassign`, payload);
  return data;
}
