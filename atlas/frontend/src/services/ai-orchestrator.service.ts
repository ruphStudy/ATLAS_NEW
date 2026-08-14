import { apiClient } from '@/lib/api/axios';
import type {
  AiExecutionLogFilterParams,
  AiExecutionLogListResult,
  AiOrchestratorStats,
  AiRequest,
  AiRequestFilterParams,
  AiRequestListResult,
  CreateAiRequestPayload,
} from '@/types';

const BASE = '/ai-orchestrator';

export async function listAiRequests(params: AiRequestFilterParams = {}): Promise<AiRequestListResult> {
  const { data } = await apiClient.get<AiRequestListResult>(`${BASE}/requests`, { params });
  return data;
}

export async function getAiRequestById(id: string, workspaceId: string): Promise<AiRequest> {
  const { data } = await apiClient.get<AiRequest>(`${BASE}/requests/${id}`, { params: { workspaceId } });
  return data;
}

export async function createAiRequest(payload: CreateAiRequestPayload): Promise<AiRequest> {
  const { data } = await apiClient.post<AiRequest>(`${BASE}/requests`, payload);
  return data;
}

export async function cancelAiRequest(id: string, workspaceId: string): Promise<AiRequest> {
  const { data } = await apiClient.post<AiRequest>(`${BASE}/requests/${id}/cancel`, {}, { params: { workspaceId } });
  return data;
}

export async function listAiExecutionLogs(params: AiExecutionLogFilterParams = {}): Promise<AiExecutionLogListResult> {
  const { data } = await apiClient.get<AiExecutionLogListResult>(`${BASE}/execution-logs`, { params });
  return data;
}

export async function getOrchestratorStats(workspaceId: string, startDate?: string, endDate?: string): Promise<AiOrchestratorStats> {
  const { data } = await apiClient.get<AiOrchestratorStats>(`${BASE}/stats`, { params: { workspaceId, startDate, endDate } });
  return data;
}
