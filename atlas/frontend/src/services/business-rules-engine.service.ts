import { apiClient } from '@/lib/api/axios';
import type {
  CreateRulePayload,
  PaginatedResult,
  RollbackRulePayload,
  Rule,
  RuleExecution,
  RuleExecutionFilterParams,
  RuleFilterParams,
  RuleHistoryEntry,
  RuleSimulationResult,
  RuleValidationIssue,
  SimulateRulePayload,
  UpdateRulePayload,
} from '@/types';

const BASE = '/business-rules-engine';

export async function validateRuleDraft(payload: CreateRulePayload): Promise<RuleValidationIssue[]> {
  const { data } = await apiClient.post<RuleValidationIssue[]>(`${BASE}/validate`, payload);
  return data;
}

export async function getRuleExecutions(params: RuleExecutionFilterParams = {}): Promise<PaginatedResult<RuleExecution>> {
  const { data } = await apiClient.get<PaginatedResult<RuleExecution>>(`${BASE}/executions`, { params });
  return data;
}

export async function getRuleExecution(id: string): Promise<RuleExecution> {
  const { data } = await apiClient.get<RuleExecution>(`${BASE}/executions/${id}`);
  return data;
}

export async function createRule(payload: CreateRulePayload): Promise<Rule> {
  const { data } = await apiClient.post<Rule>(`${BASE}/rules`, payload);
  return data;
}

export async function listRules(params: RuleFilterParams = {}): Promise<PaginatedResult<Rule>> {
  const { data } = await apiClient.get<PaginatedResult<Rule>>(`${BASE}/rules`, { params });
  return data;
}

export async function getRule(id: string): Promise<Rule> {
  const { data } = await apiClient.get<Rule>(`${BASE}/rules/${id}`);
  return data;
}

export async function updateRule(id: string, payload: UpdateRulePayload): Promise<Rule> {
  const { data } = await apiClient.patch<Rule>(`${BASE}/rules/${id}`, payload);
  return data;
}

export async function getRuleHistory(id: string): Promise<RuleHistoryEntry[]> {
  const { data } = await apiClient.get<RuleHistoryEntry[]>(`${BASE}/rules/${id}/history`);
  return data;
}

export async function validateRule(id: string): Promise<RuleValidationIssue[]> {
  const { data } = await apiClient.get<RuleValidationIssue[]>(`${BASE}/rules/${id}/validate`);
  return data;
}

export async function simulateRule(id: string, payload: SimulateRulePayload): Promise<RuleSimulationResult> {
  const { data } = await apiClient.post<RuleSimulationResult>(`${BASE}/rules/${id}/simulate`, payload);
  return data;
}

export async function publishRule(id: string): Promise<Rule> {
  const { data } = await apiClient.post<Rule>(`${BASE}/rules/${id}/publish`);
  return data;
}

export async function enableRule(id: string): Promise<Rule> {
  const { data } = await apiClient.post<Rule>(`${BASE}/rules/${id}/enable`);
  return data;
}

export async function disableRule(id: string): Promise<Rule> {
  const { data } = await apiClient.post<Rule>(`${BASE}/rules/${id}/disable`);
  return data;
}

export async function archiveRule(id: string): Promise<Rule> {
  const { data } = await apiClient.post<Rule>(`${BASE}/rules/${id}/archive`);
  return data;
}

export async function restoreRule(id: string): Promise<Rule> {
  const { data } = await apiClient.post<Rule>(`${BASE}/rules/${id}/restore`);
  return data;
}

export async function rollbackRule(id: string, payload: RollbackRulePayload): Promise<Rule> {
  const { data } = await apiClient.post<Rule>(`${BASE}/rules/${id}/rollback`, payload);
  return data;
}
