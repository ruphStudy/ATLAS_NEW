import { apiClient } from '@/lib/api/axios';
import type {
  AgentExecutionFilterParams,
  AgentExecutionListResult,
  AgentExecutionResult,
  AiAgent,
  AiAgentConfiguration,
  AiAgentExecution,
  AiAgentFilterParams,
  AiAgentListResult,
  AiAgentStats,
  CreateAgentConfigurationPayload,
  CreateAiAgentPayload,
  ExecuteAgentPayload,
  UpdateAgentConfigurationPayload,
  UpdateAiAgentPayload,
} from '@/types';

const BASE = '/ai-agent';

export async function listAiAgents(params: AiAgentFilterParams = {}): Promise<AiAgentListResult> {
  const { data } = await apiClient.get<AiAgentListResult>(`${BASE}/agents`, { params });
  return data;
}

export async function getAiAgentById(id: string, workspaceId?: string): Promise<AiAgent> {
  const { data } = await apiClient.get<AiAgent>(`${BASE}/agents/${id}`, { params: { workspaceId } });
  return data;
}

export async function createAiAgent(payload: CreateAiAgentPayload): Promise<AiAgent> {
  const { data } = await apiClient.post<AiAgent>(`${BASE}/agents`, payload);
  return data;
}

export async function updateAiAgent(id: string, payload: UpdateAiAgentPayload, workspaceId?: string): Promise<AiAgent> {
  const { data } = await apiClient.patch<AiAgent>(`${BASE}/agents/${id}`, payload, { params: { workspaceId } });
  return data;
}

export async function deleteAiAgent(id: string, workspaceId?: string): Promise<void> {
  await apiClient.delete(`${BASE}/agents/${id}`, { params: { workspaceId } });
}

export async function activateAiAgent(id: string): Promise<AiAgent> {
  const { data } = await apiClient.patch<AiAgent>(`${BASE}/agents/${id}/activate`);
  return data;
}

export async function deactivateAiAgent(id: string): Promise<AiAgent> {
  const { data } = await apiClient.patch<AiAgent>(`${BASE}/agents/${id}/deactivate`);
  return data;
}

export async function archiveAiAgent(id: string): Promise<AiAgent> {
  const { data } = await apiClient.patch<AiAgent>(`${BASE}/agents/${id}/archive`);
  return data;
}

export async function createAgentConfiguration(payload: CreateAgentConfigurationPayload): Promise<AiAgentConfiguration> {
  const { data } = await apiClient.post<AiAgentConfiguration>(`${BASE}/configurations`, payload);
  return data;
}

export async function updateAgentConfiguration(id: string, workspaceId: string, payload: UpdateAgentConfigurationPayload): Promise<AiAgentConfiguration> {
  const { data } = await apiClient.patch<AiAgentConfiguration>(`${BASE}/configurations/${id}`, payload, { params: { workspaceId } });
  return data;
}

export async function deleteAgentConfiguration(id: string, workspaceId: string): Promise<void> {
  await apiClient.delete(`${BASE}/configurations/${id}`, { params: { workspaceId } });
}

export async function executeAgent(payload: ExecuteAgentPayload): Promise<AgentExecutionResult> {
  const { data } = await apiClient.post<AgentExecutionResult>(`${BASE}/execute`, payload);
  return data;
}

export async function listAgentExecutions(params: AgentExecutionFilterParams = {}): Promise<AgentExecutionListResult> {
  const { data } = await apiClient.get<AgentExecutionListResult>(`${BASE}/executions`, { params });
  return data;
}

export async function getAgentExecutionById(id: string, workspaceId: string): Promise<AiAgentExecution> {
  const { data } = await apiClient.get<AiAgentExecution>(`${BASE}/executions/${id}`, { params: { workspaceId } });
  return data;
}

export async function cancelAgentExecution(id: string, workspaceId: string): Promise<AiAgentExecution> {
  const { data } = await apiClient.post<AiAgentExecution>(`${BASE}/executions/${id}/cancel`, {}, { params: { workspaceId } });
  return data;
}

export async function getAgentStats(workspaceId: string, startDate?: string, endDate?: string): Promise<AiAgentStats> {
  const { data } = await apiClient.get<AiAgentStats>(`${BASE}/stats`, { params: { workspaceId, startDate, endDate } });
  return data;
}
