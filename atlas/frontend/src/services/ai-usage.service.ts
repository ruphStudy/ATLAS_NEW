import { apiClient } from '@/lib/api/axios';
import type {
  AiUsageQuota,
  AiUsageQuotaAlert,
  AiUsageRecord,
  AiUsageRecordFilterParams,
  AiUsageRecordListResult,
  AiUsageSummary,
  CreateUsageQuotaPayload,
  UpdateUsageQuotaPayload,
  UsageBreakdownBucket,
  UsageBreakdownFilterParams,
  UsageQuotaFilterParams,
  UsageQuotaListResult,
  UsageReconciliationResult,
  UsageSummaryFilterParams,
} from '@/types';

const BASE = '/ai-usage-tracking';

export async function listUsageRecords(params: AiUsageRecordFilterParams): Promise<AiUsageRecordListResult> {
  const { data } = await apiClient.get<AiUsageRecordListResult>(`${BASE}/records`, { params });
  return data;
}

export async function getUsageRecordById(id: string, workspaceId: string): Promise<AiUsageRecord> {
  const { data } = await apiClient.get<AiUsageRecord>(`${BASE}/records/${id}`, { params: { workspaceId } });
  return data;
}

export async function getUsageSummary(params: UsageSummaryFilterParams): Promise<AiUsageSummary> {
  const { data } = await apiClient.get<AiUsageSummary>(`${BASE}/summary`, { params });
  return data;
}

export async function getUsageBreakdown(params: UsageBreakdownFilterParams): Promise<UsageBreakdownBucket[]> {
  const { data } = await apiClient.get<UsageBreakdownBucket[]>(`${BASE}/breakdown`, { params });
  return data;
}

export async function reconcileUsage(workspaceId: string, startDate?: string, endDate?: string): Promise<UsageReconciliationResult> {
  const { data } = await apiClient.get<UsageReconciliationResult>(`${BASE}/reconcile`, { params: { workspaceId, startDate, endDate } });
  return data;
}

export async function listUsageQuotas(params: UsageQuotaFilterParams): Promise<UsageQuotaListResult> {
  const { data } = await apiClient.get<UsageQuotaListResult>(`${BASE}/quotas`, { params });
  return data;
}

export async function getUsageQuotaById(id: string): Promise<AiUsageQuota> {
  const { data } = await apiClient.get<AiUsageQuota>(`${BASE}/quotas/${id}`);
  return data;
}

export async function createUsageQuota(payload: CreateUsageQuotaPayload): Promise<AiUsageQuota> {
  const { data } = await apiClient.post<AiUsageQuota>(`${BASE}/quotas`, payload);
  return data;
}

export async function updateUsageQuota(id: string, payload: UpdateUsageQuotaPayload): Promise<AiUsageQuota> {
  const { data } = await apiClient.patch<AiUsageQuota>(`${BASE}/quotas/${id}`, payload);
  return data;
}

export async function deleteUsageQuota(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/quotas/${id}`);
}

export async function getUsageQuotaAlerts(id: string): Promise<AiUsageQuotaAlert[]> {
  const { data } = await apiClient.get<AiUsageQuotaAlert[]>(`${BASE}/quotas/${id}/alerts`);
  return data;
}
