import { apiClient } from '@/lib/api/axios';
import type {
  PlatformHealthSummary,
  SaasHealthCheckLogFilterParams,
  SaasHealthCheckLogListResult,
  SaasHealthIncident,
  SaasHealthIncidentFilterParams,
  SaasHealthIncidentListResult,
  SaasHealthModuleKey,
  SaasHealthSnapshot,
  TenantHealthSummary,
} from '@/types';

const BASE = '/saas-monitoring';

export async function checkAllModules(): Promise<SaasHealthSnapshot[]> {
  const { data } = await apiClient.post<SaasHealthSnapshot[]>(`${BASE}/check`);
  return data;
}

export async function checkModule(module: SaasHealthModuleKey): Promise<SaasHealthSnapshot> {
  const { data } = await apiClient.post<SaasHealthSnapshot>(`${BASE}/check/${module}`);
  return data;
}

export async function getTenantHealthSummary(): Promise<TenantHealthSummary> {
  const { data } = await apiClient.get<TenantHealthSummary>(`${BASE}/summary/tenant`);
  return data;
}

export async function getModuleSnapshot(module: SaasHealthModuleKey): Promise<SaasHealthSnapshot | null> {
  const { data } = await apiClient.get<SaasHealthSnapshot | null>(`${BASE}/modules/${module}`);
  return data;
}

export async function getIncidents(filter: SaasHealthIncidentFilterParams = {}): Promise<SaasHealthIncidentListResult> {
  const { data } = await apiClient.get<SaasHealthIncidentListResult>(`${BASE}/incidents`, { params: filter });
  return data;
}

export async function getIncidentById(id: string): Promise<SaasHealthIncident> {
  const { data } = await apiClient.get<SaasHealthIncident>(`${BASE}/incidents/${id}`);
  return data;
}

export async function getCheckLogs(filter: SaasHealthCheckLogFilterParams = {}): Promise<SaasHealthCheckLogListResult> {
  const { data } = await apiClient.get<SaasHealthCheckLogListResult>(`${BASE}/check-logs`, { params: filter });
  return data;
}

export async function getPlatformSummary(): Promise<PlatformHealthSummary> {
  const { data } = await apiClient.get<PlatformHealthSummary>(`${BASE}/summary/platform`);
  return data;
}

export async function getIncidentsPlatformWide(filter: SaasHealthIncidentFilterParams = {}): Promise<SaasHealthIncidentListResult> {
  const { data } = await apiClient.get<SaasHealthIncidentListResult>(`${BASE}/platform/incidents`, { params: filter });
  return data;
}
