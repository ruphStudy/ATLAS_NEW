import { apiClient } from '@/lib/api/axios';
import type {
  CheckLogFilterParams,
  IncidentFilterParams,
  OperationsHealthCheckLog,
  OperationsHealthIncident,
  OperationsHealthModuleKey,
  OperationsHealthSnapshot,
  PaginatedResult,
  OperationsWorkspaceHealthSummary,
} from '@/types';

const BASE = '/operations-health';

export async function checkAllModules(): Promise<OperationsHealthSnapshot[]> {
  const { data } = await apiClient.post<OperationsHealthSnapshot[]>(`${BASE}/check`);
  return data;
}

export async function checkModule(module: OperationsHealthModuleKey): Promise<OperationsHealthSnapshot> {
  const { data } = await apiClient.post<OperationsHealthSnapshot>(`${BASE}/check/${module}`);
  return data;
}

export async function getOperationsWorkspaceHealthSummary(): Promise<OperationsWorkspaceHealthSummary> {
  const { data } = await apiClient.get<OperationsWorkspaceHealthSummary>(`${BASE}/summary/workspace`);
  return data;
}

export async function getModuleSnapshot(module: OperationsHealthModuleKey): Promise<OperationsHealthSnapshot | null> {
  const { data } = await apiClient.get<OperationsHealthSnapshot | null>(`${BASE}/modules/${module}`);
  return data;
}

export async function getIncidents(params: IncidentFilterParams = {}): Promise<PaginatedResult<OperationsHealthIncident>> {
  const { data } = await apiClient.get<PaginatedResult<OperationsHealthIncident>>(`${BASE}/incidents`, { params });
  return data;
}

export async function getIncidentById(id: string): Promise<OperationsHealthIncident> {
  const { data } = await apiClient.get<OperationsHealthIncident>(`${BASE}/incidents/${id}`);
  return data;
}

export async function getCheckLogs(params: CheckLogFilterParams = {}): Promise<PaginatedResult<OperationsHealthCheckLog>> {
  const { data } = await apiClient.get<PaginatedResult<OperationsHealthCheckLog>>(`${BASE}/check-logs`, { params });
  return data;
}
