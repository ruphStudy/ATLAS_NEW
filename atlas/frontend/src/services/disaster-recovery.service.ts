import { apiClient } from '@/lib/api/axios';
import type {
  CreateDrPolicyPayload,
  CreateDrRecoveryPlanPayload,
  DetectDrDisasterPayload,
  DrExecutionFilterParams,
  DrPolicy,
  DrPolicyFilterParams,
  DrPolicyHistoryEntry,
  DrPolicyListResult,
  DrRecoveryExecution,
  DrRecoveryExecutionListResult,
  DrRecoveryPlan,
  DrRecoveryPlanFilterParams,
  DrRecoveryPlanListResult,
  TriggerDrRecoveryPayload,
  UpdateDrPolicyPayload,
  UpdateDrRecoveryPlanPayload,
} from '@/types';

const BASE = '/disaster-recovery';

export async function listDrPolicies(params: DrPolicyFilterParams = {}): Promise<DrPolicyListResult> {
  const { data } = await apiClient.get(`${BASE}/policies`, { params });
  return data;
}

export async function getDrPolicyById(id: string): Promise<DrPolicy> {
  const { data } = await apiClient.get(`${BASE}/policies/${id}`);
  return data;
}

export async function createDrPolicy(payload: CreateDrPolicyPayload): Promise<DrPolicy> {
  const { data } = await apiClient.post(`${BASE}/policies`, payload);
  return data;
}

export async function updateDrPolicy(id: string, payload: UpdateDrPolicyPayload): Promise<DrPolicy> {
  const { data } = await apiClient.patch(`${BASE}/policies/${id}`, payload);
  return data;
}

export async function activateDrPolicy(id: string): Promise<DrPolicy> {
  const { data } = await apiClient.post(`${BASE}/policies/${id}/activate`);
  return data;
}

export async function pauseDrPolicy(id: string): Promise<DrPolicy> {
  const { data } = await apiClient.post(`${BASE}/policies/${id}/pause`);
  return data;
}

export async function archiveDrPolicy(id: string): Promise<DrPolicy> {
  const { data } = await apiClient.post(`${BASE}/policies/${id}/archive`);
  return data;
}

export async function restoreDrPolicy(id: string): Promise<DrPolicy> {
  const { data } = await apiClient.post(`${BASE}/policies/${id}/restore`);
  return data;
}

export async function getDrPolicyHistory(id: string): Promise<DrPolicyHistoryEntry[]> {
  const { data } = await apiClient.get(`${BASE}/policies/${id}/history`);
  return data;
}

export async function listDrRecoveryPlans(params: DrRecoveryPlanFilterParams = {}): Promise<DrRecoveryPlanListResult> {
  const { data } = await apiClient.get(`${BASE}/plans`, { params });
  return data;
}

export async function getDrRecoveryPlanById(id: string): Promise<DrRecoveryPlan> {
  const { data } = await apiClient.get(`${BASE}/plans/${id}`);
  return data;
}

export async function createDrRecoveryPlan(payload: CreateDrRecoveryPlanPayload): Promise<DrRecoveryPlan> {
  const { data } = await apiClient.post(`${BASE}/plans`, payload);
  return data;
}

export async function updateDrRecoveryPlan(id: string, payload: UpdateDrRecoveryPlanPayload): Promise<DrRecoveryPlan> {
  const { data } = await apiClient.patch(`${BASE}/plans/${id}`, payload);
  return data;
}

export async function publishDrRecoveryPlan(id: string): Promise<DrRecoveryPlan> {
  const { data } = await apiClient.post(`${BASE}/plans/${id}/publish`);
  return data;
}

export async function archiveDrRecoveryPlan(id: string): Promise<DrRecoveryPlan> {
  const { data } = await apiClient.post(`${BASE}/plans/${id}/archive`);
  return data;
}

export async function triggerDrRecovery(planId: string, payload: TriggerDrRecoveryPayload = {}): Promise<DrRecoveryExecution> {
  const { data } = await apiClient.post(`${BASE}/plans/${planId}/trigger`, payload);
  return data;
}

export async function detectDrDisaster(payload: DetectDrDisasterPayload): Promise<void> {
  await apiClient.post(`${BASE}/disasters/detect`, payload);
}

export async function listDrExecutions(params: DrExecutionFilterParams = {}): Promise<DrRecoveryExecutionListResult> {
  const { data } = await apiClient.get(`${BASE}/executions`, { params });
  return data;
}

export async function getDrExecutionById(id: string): Promise<DrRecoveryExecution> {
  const { data } = await apiClient.get(`${BASE}/executions/${id}`);
  return data;
}

export async function cancelDrExecution(id: string): Promise<DrRecoveryExecution> {
  const { data } = await apiClient.post(`${BASE}/executions/${id}/cancel`);
  return data;
}

export async function rollbackDrExecution(id: string): Promise<DrRecoveryExecution> {
  const { data } = await apiClient.post(`${BASE}/executions/${id}/rollback`);
  return data;
}

export async function forceReleaseDrLock(scopeKey: string): Promise<void> {
  await apiClient.post(`${BASE}/locks/${scopeKey}/force-release`);
}
