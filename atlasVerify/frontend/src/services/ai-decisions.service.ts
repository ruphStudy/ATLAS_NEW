import { apiClient } from '@/lib/api/axios';
import type {
  AiDecision,
  AiDecisionStats,
  ApproveDecisionPayload,
  CreateDecisionRulePayload,
  DecisionFilterParams,
  DecisionListResult,
  DecisionResult,
  DecisionRule,
  EvaluateDecisionPayload,
  OverrideDecisionPayload,
  RejectDecisionPayload,
  ReviewDecisionPayload,
  UpdateDecisionRulePayload,
} from '@/types';

const BASE = '/ai-decision-engine';

export async function evaluateDecision(payload: EvaluateDecisionPayload): Promise<DecisionResult> {
  const { data } = await apiClient.post<DecisionResult>(`${BASE}/evaluate`, payload);
  return data;
}

export async function listDecisions(params: DecisionFilterParams): Promise<DecisionListResult> {
  const { data } = await apiClient.get<DecisionListResult>(`${BASE}/decisions`, { params });
  return data;
}

export async function getDecisionById(id: string, workspaceId: string): Promise<AiDecision> {
  const { data } = await apiClient.get<AiDecision>(`${BASE}/decisions/${id}`, { params: { workspaceId } });
  return data;
}

export async function getDecisionCandidates(id: string, workspaceId: string): Promise<unknown[]> {
  const { data } = await apiClient.get<unknown[]>(`${BASE}/decisions/${id}/candidates`, { params: { workspaceId } });
  return data;
}

export async function getDecisionHistory(id: string, workspaceId: string): Promise<unknown[]> {
  const { data } = await apiClient.get<unknown[]>(`${BASE}/decisions/${id}/history`, { params: { workspaceId } });
  return data;
}

export async function getDecisionOverrides(id: string, workspaceId: string): Promise<unknown[]> {
  const { data } = await apiClient.get<unknown[]>(`${BASE}/decisions/${id}/overrides`, { params: { workspaceId } });
  return data;
}

export async function approveDecision(id: string, payload: ApproveDecisionPayload): Promise<AiDecision> {
  const { data } = await apiClient.post<AiDecision>(`${BASE}/decisions/${id}/approve`, payload);
  return data;
}

export async function rejectDecision(id: string, payload: RejectDecisionPayload): Promise<AiDecision> {
  const { data } = await apiClient.post<AiDecision>(`${BASE}/decisions/${id}/reject`, payload);
  return data;
}

export async function reviewDecision(id: string, payload: ReviewDecisionPayload): Promise<AiDecision> {
  const { data } = await apiClient.post<AiDecision>(`${BASE}/decisions/${id}/review`, payload);
  return data;
}

export async function overrideDecision(id: string, payload: OverrideDecisionPayload): Promise<AiDecision> {
  const { data } = await apiClient.post<AiDecision>(`${BASE}/decisions/${id}/override`, payload);
  return data;
}

export async function getDecisionStats(workspaceId: string, startDate?: string, endDate?: string): Promise<AiDecisionStats> {
  const { data } = await apiClient.get<AiDecisionStats>(`${BASE}/stats`, { params: { workspaceId, startDate, endDate } });
  return data;
}

export async function createDecisionRule(payload: CreateDecisionRulePayload): Promise<DecisionRule> {
  const { data } = await apiClient.post<DecisionRule>(`${BASE}/rules`, payload);
  return data;
}

export async function updateDecisionRule(id: string, payload: UpdateDecisionRulePayload): Promise<DecisionRule> {
  const { data } = await apiClient.patch<DecisionRule>(`${BASE}/rules/${id}`, payload);
  return data;
}

export async function deleteDecisionRule(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/rules/${id}`);
}

export async function getDecisionRuleById(id: string): Promise<DecisionRule> {
  const { data } = await apiClient.get<DecisionRule>(`${BASE}/rules/${id}`);
  return data;
}
