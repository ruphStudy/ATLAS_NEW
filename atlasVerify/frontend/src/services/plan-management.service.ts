import { apiClient } from '@/lib/api/axios';
import type {
  CreatePlanPayload,
  PaginatedResult,
  Plan,
  PlanCompatibilityResult,
  PlanEntitlementSnapshot,
  PlanFilterParams,
  PlanHistoryEntry,
  PlanReasonPayload,
  PublishPlanPayload,
  UpdatePlanPayload,
} from '@/types';

const BASE = '/plan-management';

export async function listPlans(params: PlanFilterParams = {}): Promise<PaginatedResult<Plan>> {
  const { data } = await apiClient.get<PaginatedResult<Plan>>(`${BASE}/plans`, { params });
  return data;
}

export async function getPlan(id: string): Promise<Plan> {
  const { data } = await apiClient.get<Plan>(`${BASE}/plans/${id}`);
  return data;
}

export async function getPlanHistory(id: string): Promise<PlanHistoryEntry[]> {
  const { data } = await apiClient.get<PlanHistoryEntry[]>(`${BASE}/plans/${id}/history`);
  return data;
}

export async function listPlanVersions(code: string): Promise<Plan[]> {
  const { data } = await apiClient.get<Plan[]>(`${BASE}/codes/${code}/versions`);
  return data;
}

export async function getPlanByCodeAndVersion(code: string, version: number): Promise<Plan> {
  const { data } = await apiClient.get<Plan>(`${BASE}/codes/${code}/versions/${version}`);
  return data;
}

export async function getEffectivePlanVersion(code: string): Promise<Plan | null> {
  const { data } = await apiClient.get<Plan | null>(`${BASE}/codes/${code}/effective`);
  return data;
}

export async function getPlanEntitlementSnapshot(code: string, version?: number): Promise<PlanEntitlementSnapshot> {
  const { data } = await apiClient.get<PlanEntitlementSnapshot>(`${BASE}/codes/${code}/entitlements`, {
    params: version !== undefined ? { version } : undefined,
  });
  return data;
}

export async function checkPlanCompatibility(fromCode: string, toCode: string): Promise<PlanCompatibilityResult> {
  const { data } = await apiClient.get<PlanCompatibilityResult>(`${BASE}/compatibility`, { params: { fromCode, toCode } });
  return data;
}

export async function createPlan(payload: CreatePlanPayload): Promise<Plan> {
  const { data } = await apiClient.post<Plan>(`${BASE}/plans`, payload);
  return data;
}

export async function createPlanVersion(code: string, payload: PlanReasonPayload = {}): Promise<Plan> {
  const { data } = await apiClient.post<Plan>(`${BASE}/codes/${code}/versions`, payload);
  return data;
}

export async function updatePlan(id: string, payload: UpdatePlanPayload): Promise<Plan> {
  const { data } = await apiClient.patch<Plan>(`${BASE}/plans/${id}`, payload);
  return data;
}

export async function publishPlan(id: string, payload: PublishPlanPayload = {}): Promise<Plan> {
  const { data } = await apiClient.post<Plan>(`${BASE}/plans/${id}/publish`, payload);
  return data;
}

export async function deprecatePlan(id: string, payload: PlanReasonPayload = {}): Promise<Plan> {
  const { data } = await apiClient.post<Plan>(`${BASE}/plans/${id}/deprecate`, payload);
  return data;
}

export async function archivePlan(id: string, payload: PlanReasonPayload = {}): Promise<Plan> {
  const { data } = await apiClient.post<Plan>(`${BASE}/plans/${id}/archive`, payload);
  return data;
}

export async function restorePlan(id: string, payload: PlanReasonPayload = {}): Promise<Plan> {
  const { data } = await apiClient.post<Plan>(`${BASE}/plans/${id}/restore`, payload);
  return data;
}
