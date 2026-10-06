import { apiClient } from '@/lib/api/axios';
import type {
  AiGuardrailStats,
  CreateGuardrailOverridePayload,
  CreateGuardrailRulePayload,
  DecideGuardrailApprovalPayload,
  EvaluateGuardrailPayload,
  GuardrailApproval,
  GuardrailApprovalFilterParams,
  GuardrailApprovalListResult,
  GuardrailEvaluation,
  GuardrailEvaluationFilterParams,
  GuardrailEvaluationListResult,
  GuardrailEvaluationOutcome,
  GuardrailEvaluationResultEntry,
  GuardrailIncident,
  GuardrailIncidentFilterParams,
  GuardrailIncidentListResult,
  GuardrailOverride,
  GuardrailOverrideFilterParams,
  GuardrailOverrideListResult,
  GuardrailRule,
  GuardrailRuleFilterParams,
  GuardrailRuleListResult,
  UpdateGuardrailIncidentPayload,
  UpdateGuardrailOverridePayload,
  UpdateGuardrailRulePayload,
} from '@/types';

const BASE = '/ai-guardrails';

export async function evaluateGuardrail(payload: EvaluateGuardrailPayload): Promise<GuardrailEvaluationOutcome> {
  const { data } = await apiClient.post<GuardrailEvaluationOutcome>(`${BASE}/evaluate`, payload);
  return data;
}

export async function listGuardrailRules(params: GuardrailRuleFilterParams): Promise<GuardrailRuleListResult> {
  const { data } = await apiClient.get<GuardrailRuleListResult>(`${BASE}/rules`, { params });
  return data;
}

export async function getGuardrailRuleById(id: string): Promise<GuardrailRule> {
  const { data } = await apiClient.get<GuardrailRule>(`${BASE}/rules/${id}`);
  return data;
}

export async function createGuardrailRule(payload: CreateGuardrailRulePayload): Promise<GuardrailRule> {
  const { data } = await apiClient.post<GuardrailRule>(`${BASE}/rules`, payload);
  return data;
}

export async function updateGuardrailRule(id: string, payload: UpdateGuardrailRulePayload): Promise<GuardrailRule> {
  const { data } = await apiClient.patch<GuardrailRule>(`${BASE}/rules/${id}`, payload);
  return data;
}

export async function deleteGuardrailRule(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/rules/${id}`);
}

export async function listGuardrailOverrides(params: GuardrailOverrideFilterParams): Promise<GuardrailOverrideListResult> {
  const { data } = await apiClient.get<GuardrailOverrideListResult>(`${BASE}/overrides`, { params });
  return data;
}

export async function createGuardrailOverride(payload: CreateGuardrailOverridePayload): Promise<GuardrailOverride> {
  const { data } = await apiClient.post<GuardrailOverride>(`${BASE}/overrides`, payload);
  return data;
}

export async function updateGuardrailOverride(id: string, payload: UpdateGuardrailOverridePayload): Promise<GuardrailOverride> {
  const { data } = await apiClient.patch<GuardrailOverride>(`${BASE}/overrides/${id}`, payload);
  return data;
}

export async function deleteGuardrailOverride(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/overrides/${id}`);
}

export async function listGuardrailEvaluations(params: GuardrailEvaluationFilterParams): Promise<GuardrailEvaluationListResult> {
  const { data } = await apiClient.get<GuardrailEvaluationListResult>(`${BASE}/evaluations`, { params });
  return data;
}

export async function getGuardrailEvaluationById(id: string, workspaceId: string): Promise<GuardrailEvaluation> {
  const { data } = await apiClient.get<GuardrailEvaluation>(`${BASE}/evaluations/${id}`, { params: { workspaceId } });
  return data;
}

export async function getGuardrailEvaluationResults(id: string, workspaceId: string): Promise<GuardrailEvaluationResultEntry[]> {
  const { data } = await apiClient.get<GuardrailEvaluationResultEntry[]>(`${BASE}/evaluations/${id}/results`, { params: { workspaceId } });
  return data;
}

export async function listGuardrailIncidents(params: GuardrailIncidentFilterParams): Promise<GuardrailIncidentListResult> {
  const { data } = await apiClient.get<GuardrailIncidentListResult>(`${BASE}/incidents`, { params });
  return data;
}

export async function getGuardrailIncidentById(id: string, workspaceId: string): Promise<GuardrailIncident> {
  const { data } = await apiClient.get<GuardrailIncident>(`${BASE}/incidents/${id}`, { params: { workspaceId } });
  return data;
}

export async function updateGuardrailIncident(id: string, workspaceId: string, payload: UpdateGuardrailIncidentPayload): Promise<GuardrailIncident> {
  const { data } = await apiClient.patch<GuardrailIncident>(`${BASE}/incidents/${id}`, payload, { params: { workspaceId } });
  return data;
}

export async function listGuardrailApprovals(params: GuardrailApprovalFilterParams): Promise<GuardrailApprovalListResult> {
  const { data } = await apiClient.get<GuardrailApprovalListResult>(`${BASE}/approvals`, { params });
  return data;
}

export async function getGuardrailApprovalById(id: string, workspaceId: string): Promise<GuardrailApproval> {
  const { data } = await apiClient.get<GuardrailApproval>(`${BASE}/approvals/${id}`, { params: { workspaceId } });
  return data;
}

export async function decideGuardrailApproval(id: string, workspaceId: string, payload: DecideGuardrailApprovalPayload): Promise<GuardrailApproval> {
  const { data } = await apiClient.post<GuardrailApproval>(`${BASE}/approvals/${id}/decide`, payload, { params: { workspaceId } });
  return data;
}

export async function getGuardrailStats(workspaceId: string, startDate?: string, endDate?: string): Promise<AiGuardrailStats> {
  const { data } = await apiClient.get<AiGuardrailStats>(`${BASE}/stats`, { params: { workspaceId, startDate, endDate } });
  return data;
}
