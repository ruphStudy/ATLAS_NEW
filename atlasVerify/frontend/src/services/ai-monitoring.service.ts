import { apiClient } from '@/lib/api/axios';
import type {
  AiHealthCheck,
  AiHealthCheckFilterParams,
  AiHealthCheckListResult,
  AiHealthIncident,
  AiHealthIncidentFilterParams,
  AiHealthIncidentListResult,
  HealthCheckRequestPayload,
  ModelHealthSummary,
  ProviderHealthSummary,
  UpdateHealthIncidentPayload,
  WorkspaceHealthSummary,
} from '@/types';

const BASE = '/ai-monitoring-health';

export async function performHealthCheck(payload: HealthCheckRequestPayload): Promise<AiHealthCheck> {
  const { data } = await apiClient.post<AiHealthCheck>(`${BASE}/check`, payload);
  return data;
}

export async function listHealthChecks(params: AiHealthCheckFilterParams): Promise<AiHealthCheckListResult> {
  const { data } = await apiClient.get<AiHealthCheckListResult>(`${BASE}/checks`, { params });
  return data;
}

export async function getHealthCheckById(id: string, workspaceId: string): Promise<AiHealthCheck> {
  const { data } = await apiClient.get<AiHealthCheck>(`${BASE}/checks/${id}`, { params: { workspaceId } });
  return data;
}

export async function listHealthIncidents(params: AiHealthIncidentFilterParams): Promise<AiHealthIncidentListResult> {
  const { data } = await apiClient.get<AiHealthIncidentListResult>(`${BASE}/incidents`, { params });
  return data;
}

export async function getHealthIncidentById(id: string, workspaceId: string): Promise<AiHealthIncident> {
  const { data } = await apiClient.get<AiHealthIncident>(`${BASE}/incidents/${id}`, { params: { workspaceId } });
  return data;
}

export async function updateHealthIncident(id: string, workspaceId: string, payload: UpdateHealthIncidentPayload): Promise<AiHealthIncident> {
  const { data } = await apiClient.patch<AiHealthIncident>(`${BASE}/incidents/${id}`, payload, { params: { workspaceId } });
  return data;
}

export async function resolveHealthIncident(id: string, workspaceId: string): Promise<AiHealthIncident> {
  const { data } = await apiClient.post<AiHealthIncident>(`${BASE}/incidents/${id}/resolve`, {}, { params: { workspaceId } });
  return data;
}

export async function getProviderHealthSummary(workspaceId: string, provider: string, startDate?: string, endDate?: string): Promise<ProviderHealthSummary> {
  const { data } = await apiClient.get<ProviderHealthSummary>(`${BASE}/summary/provider`, { params: { workspaceId, provider, startDate, endDate } });
  return data;
}

export async function getModelHealthSummary(workspaceId: string, provider: string, model: string, startDate?: string, endDate?: string): Promise<ModelHealthSummary> {
  const { data } = await apiClient.get<ModelHealthSummary>(`${BASE}/summary/model`, { params: { workspaceId, provider, model, startDate, endDate } });
  return data;
}

export async function getWorkspaceHealthSummary(workspaceId: string, startDate?: string, endDate?: string): Promise<WorkspaceHealthSummary> {
  const { data } = await apiClient.get<WorkspaceHealthSummary>(`${BASE}/summary/workspace`, { params: { workspaceId, startDate, endDate } });
  return data;
}
