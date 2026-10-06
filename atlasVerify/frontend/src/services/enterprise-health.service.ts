import { apiClient } from '@/lib/api/axios';
import type {
  EnterpriseHealthDashboard,
  EnterpriseHealthIncident,
  EnterpriseHealthIncidentFilterParams,
  EnterpriseHealthIncidentListResult,
  EnterpriseHealthSweepResult,
  RunEnterpriseHealthSweepPayload,
} from '@/types';

const BASE = '/enterprise-health';

export async function getPlatformDashboard(): Promise<EnterpriseHealthDashboard> {
  const { data } = await apiClient.get(`${BASE}/platform`);
  return data;
}

export async function getOrganizationDashboard(organizationId: string): Promise<EnterpriseHealthDashboard> {
  const { data } = await apiClient.get(`${BASE}/organizations/${organizationId}`);
  return data;
}

export async function getBusinessDashboard(organizationId: string, businessId: string): Promise<EnterpriseHealthDashboard> {
  const { data } = await apiClient.get(`${BASE}/organizations/${organizationId}/businesses/${businessId}`);
  return data;
}

export async function getWorkspaceScopedDashboard(organizationId: string, targetWorkspaceId: string): Promise<EnterpriseHealthDashboard> {
  const { data } = await apiClient.get(`${BASE}/organizations/${organizationId}/workspaces/${targetWorkspaceId}`);
  return data;
}

export async function getRegionDashboard(organizationId: string, region: string): Promise<EnterpriseHealthDashboard> {
  const { data } = await apiClient.get(`${BASE}/organizations/${organizationId}/regions/${region}`);
  return data;
}

export async function getProviderDashboard(organizationId: string, provider: string): Promise<EnterpriseHealthDashboard> {
  const { data } = await apiClient.get(`${BASE}/organizations/${organizationId}/providers/${provider}`);
  return data;
}

export async function runEnterpriseHealthDetectionSweep(organizationId: string, payload: RunEnterpriseHealthSweepPayload = {}): Promise<EnterpriseHealthSweepResult> {
  const { data } = await apiClient.post(`${BASE}/organizations/${organizationId}/detection/sweep`, payload);
  return data;
}

export async function listEnterpriseHealthIncidents(organizationId: string, params: EnterpriseHealthIncidentFilterParams = {}): Promise<EnterpriseHealthIncidentListResult> {
  const { data } = await apiClient.get(`${BASE}/organizations/${organizationId}/incidents`, { params });
  return data;
}

export async function getEnterpriseHealthIncident(organizationId: string, id: string): Promise<EnterpriseHealthIncident> {
  const { data } = await apiClient.get(`${BASE}/organizations/${organizationId}/incidents/${id}`);
  return data;
}

export async function acknowledgeEnterpriseHealthIncident(organizationId: string, id: string): Promise<EnterpriseHealthIncident> {
  const { data } = await apiClient.post(`${BASE}/organizations/${organizationId}/incidents/${id}/acknowledge`);
  return data;
}

export async function resolveEnterpriseHealthIncident(organizationId: string, id: string, reason: string): Promise<EnterpriseHealthIncident> {
  const { data } = await apiClient.post(`${BASE}/organizations/${organizationId}/incidents/${id}/resolve`, { reason });
  return data;
}
