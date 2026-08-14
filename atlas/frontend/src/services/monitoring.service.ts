import { apiClient } from '@/lib/api/axios';
import type {
  CreateMonitoringAlertRulePayload,
  CreateMonitoringSloPayload,
  MonitoringAlertRule,
  MonitoringAlertRuleFilterParams,
  MonitoringAlertRuleListResult,
  MonitoringCorrelationEvent,
  MonitoringDashboard,
  MonitoringIncident,
  MonitoringIncidentFilterParams,
  MonitoringIncidentListResult,
  MonitoringSlo,
  MonitoringSloFilterParams,
  MonitoringSloListResult,
  ResolveMonitoringIncidentPayload,
  UpdateMonitoringSloPayload,
} from '@/types';

const BASE = '/monitoring-framework';

export async function getWorkspaceHealthDashboard(workspaceId: string): Promise<MonitoringDashboard> {
  const { data } = await apiClient.get<MonitoringDashboard>(`${BASE}/dashboard/workspace/${workspaceId}`);
  return data;
}

export async function getPlatformHealthDashboard(): Promise<MonitoringDashboard> {
  const { data } = await apiClient.get<MonitoringDashboard>(`${BASE}/dashboard/platform`);
  return data;
}

export async function listMonitoringSlos(params: MonitoringSloFilterParams = {}): Promise<MonitoringSloListResult> {
  const { data } = await apiClient.get(`${BASE}/slos`, { params });
  return data;
}

export async function getMonitoringSloById(id: string): Promise<MonitoringSlo> {
  const { data } = await apiClient.get(`${BASE}/slos/${id}`);
  return data;
}

export async function createMonitoringSlo(payload: CreateMonitoringSloPayload): Promise<MonitoringSlo> {
  const { data } = await apiClient.post(`${BASE}/slos`, payload);
  return data;
}

export async function updateMonitoringSlo(id: string, payload: UpdateMonitoringSloPayload): Promise<MonitoringSlo> {
  const { data } = await apiClient.patch(`${BASE}/slos/${id}`, payload);
  return data;
}

export async function activateMonitoringSlo(id: string): Promise<MonitoringSlo> {
  const { data } = await apiClient.post(`${BASE}/slos/${id}/activate`);
  return data;
}

export async function pauseMonitoringSlo(id: string): Promise<MonitoringSlo> {
  const { data } = await apiClient.post(`${BASE}/slos/${id}/pause`);
  return data;
}

export async function archiveMonitoringSlo(id: string): Promise<MonitoringSlo> {
  const { data } = await apiClient.post(`${BASE}/slos/${id}/archive`);
  return data;
}

export async function restoreMonitoringSlo(id: string): Promise<MonitoringSlo> {
  const { data } = await apiClient.post(`${BASE}/slos/${id}/restore`);
  return data;
}

export async function listMonitoringAlertRules(params: MonitoringAlertRuleFilterParams = {}): Promise<MonitoringAlertRuleListResult> {
  const { data } = await apiClient.get(`${BASE}/alert-rules`, { params });
  return data;
}

export async function createMonitoringAlertRule(payload: CreateMonitoringAlertRulePayload): Promise<MonitoringAlertRule> {
  const { data } = await apiClient.post(`${BASE}/alert-rules`, payload);
  return data;
}

export async function activateMonitoringAlertRule(id: string): Promise<MonitoringAlertRule> {
  const { data } = await apiClient.post(`${BASE}/alert-rules/${id}/activate`);
  return data;
}

export async function pauseMonitoringAlertRule(id: string): Promise<MonitoringAlertRule> {
  const { data } = await apiClient.post(`${BASE}/alert-rules/${id}/pause`);
  return data;
}

export async function detectCascadingFailures(workspaceId: string): Promise<unknown> {
  const { data } = await apiClient.post(`${BASE}/detect-cascading-failures/${workspaceId}`);
  return data;
}

export async function listMonitoringIncidents(params: MonitoringIncidentFilterParams = {}): Promise<MonitoringIncidentListResult> {
  const { data } = await apiClient.get(`${BASE}/incidents`, { params });
  return data;
}

export async function getMonitoringIncidentById(id: string): Promise<MonitoringIncident> {
  const { data } = await apiClient.get(`${BASE}/incidents/${id}`);
  return data;
}

export async function acknowledgeMonitoringIncident(id: string): Promise<MonitoringIncident> {
  const { data } = await apiClient.post(`${BASE}/incidents/${id}/acknowledge`);
  return data;
}

export async function resolveMonitoringIncident(id: string, payload: ResolveMonitoringIncidentPayload): Promise<MonitoringIncident> {
  const { data } = await apiClient.post(`${BASE}/incidents/${id}/resolve`, payload);
  return data;
}

export async function getMonitoringCorrelationTrace(correlationId: string): Promise<MonitoringCorrelationEvent[]> {
  const { data } = await apiClient.get(`${BASE}/correlation/${correlationId}`);
  return data;
}
