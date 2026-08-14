import { apiClient } from '@/lib/api/axios';
import type {
  CheckQuotaPayload,
  CreateQuotaOverridePayload,
  CreateQuotaPolicyPayload,
  PaginatedResult,
  QuotaCheckResult,
  QuotaHistoryEntry,
  QuotaOverride,
  QuotaOverrideFilterParams,
  QuotaPolicy,
  QuotaPolicyFilterParams,
  QuotaReasonPayload,
  UpdateQuotaPolicyPayload,
} from '@/types';

const BASE = '/quota-management';

export async function checkQuota(payload: CheckQuotaPayload): Promise<QuotaCheckResult> {
  const { data } = await apiClient.post<QuotaCheckResult>(`${BASE}/check`, payload);
  return data;
}

export async function createQuotaPolicy(payload: CreateQuotaPolicyPayload): Promise<QuotaPolicy> {
  const { data } = await apiClient.post<QuotaPolicy>(`${BASE}/policies`, payload);
  return data;
}

export async function listQuotaPolicies(params: QuotaPolicyFilterParams = {}): Promise<PaginatedResult<QuotaPolicy>> {
  const { data } = await apiClient.get<PaginatedResult<QuotaPolicy>>(`${BASE}/policies`, { params });
  return data;
}

export async function getQuotaPolicy(id: string): Promise<QuotaPolicy> {
  const { data } = await apiClient.get<QuotaPolicy>(`${BASE}/policies/${id}`);
  return data;
}

export async function updateQuotaPolicy(id: string, payload: UpdateQuotaPolicyPayload): Promise<QuotaPolicy> {
  const { data } = await apiClient.patch<QuotaPolicy>(`${BASE}/policies/${id}`, payload);
  return data;
}

export async function getQuotaPolicyHistory(id: string): Promise<QuotaHistoryEntry[]> {
  const { data } = await apiClient.get<QuotaHistoryEntry[]>(`${BASE}/policies/${id}/history`);
  return data;
}

export async function enableQuotaPolicy(id: string): Promise<QuotaPolicy> {
  const { data } = await apiClient.post<QuotaPolicy>(`${BASE}/policies/${id}/enable`);
  return data;
}

export async function disableQuotaPolicy(id: string): Promise<QuotaPolicy> {
  const { data } = await apiClient.post<QuotaPolicy>(`${BASE}/policies/${id}/disable`);
  return data;
}

export async function archiveQuotaPolicy(id: string): Promise<QuotaPolicy> {
  const { data } = await apiClient.post<QuotaPolicy>(`${BASE}/policies/${id}/archive`);
  return data;
}

export async function createQuotaOverride(policyId: string, payload: CreateQuotaOverridePayload): Promise<QuotaOverride> {
  const { data } = await apiClient.post<QuotaOverride>(`${BASE}/policies/${policyId}/overrides`, payload);
  return data;
}

export async function listQuotaOverrides(params: QuotaOverrideFilterParams = {}): Promise<PaginatedResult<QuotaOverride>> {
  const { data } = await apiClient.get<PaginatedResult<QuotaOverride>>(`${BASE}/overrides`, { params });
  return data;
}

export async function getQuotaOverride(id: string): Promise<QuotaOverride> {
  const { data } = await apiClient.get<QuotaOverride>(`${BASE}/overrides/${id}`);
  return data;
}

export async function revokeQuotaOverride(id: string, payload: QuotaReasonPayload = {}): Promise<QuotaOverride> {
  const { data } = await apiClient.post<QuotaOverride>(`${BASE}/overrides/${id}/revoke`, payload);
  return data;
}
