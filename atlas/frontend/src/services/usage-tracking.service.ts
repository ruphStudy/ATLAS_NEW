import { apiClient } from '@/lib/api/axios';
import type {
  AdjustResourceUsagePayload,
  BatchRecordResourceUsagePayload,
  PaginatedResult,
  RecordResourceUsagePayload,
  ResourceUsageBreakdownFilterParams,
  ResourceUsageBucket,
  ResourceUsageCorrection,
  ResourceUsageEntitlementComparison,
  ResourceUsageFilterParams,
  ResourceUsageRecord,
  ResourceUsageSummary,
  ReverseResourceUsagePayload,
} from '@/types';

const BASE = '/usage-tracking';

export async function getUsageSummary(resourceKey?: string): Promise<ResourceUsageSummary[]> {
  const { data } = await apiClient.get<ResourceUsageSummary[]>(`${BASE}/summary`, { params: resourceKey ? { resourceKey } : undefined });
  return data;
}

export async function compareUsageToEntitlement(resourceKey: string): Promise<ResourceUsageEntitlementComparison> {
  const { data } = await apiClient.get<ResourceUsageEntitlementComparison>(`${BASE}/entitlement/${resourceKey}`);
  return data;
}

export async function getUsageBreakdown(params: ResourceUsageBreakdownFilterParams): Promise<ResourceUsageBucket[]> {
  const { data } = await apiClient.get<ResourceUsageBucket[]>(`${BASE}/breakdown`, { params });
  return data;
}

export async function recordUsage(payload: RecordResourceUsagePayload): Promise<ResourceUsageRecord> {
  const { data } = await apiClient.post<ResourceUsageRecord>(`${BASE}/records`, payload);
  return data;
}

export async function batchRecordUsage(payload: BatchRecordResourceUsagePayload): Promise<ResourceUsageRecord[]> {
  const { data } = await apiClient.post<ResourceUsageRecord[]>(`${BASE}/records/batch`, payload);
  return data;
}

export async function listUsageRecords(params: ResourceUsageFilterParams = {}): Promise<PaginatedResult<ResourceUsageRecord>> {
  const { data } = await apiClient.get<PaginatedResult<ResourceUsageRecord>>(`${BASE}/records`, { params });
  return data;
}

export async function getUsageRecord(id: string): Promise<ResourceUsageRecord> {
  const { data } = await apiClient.get<ResourceUsageRecord>(`${BASE}/records/${id}`);
  return data;
}

export async function reverseUsageRecord(id: string, payload: ReverseResourceUsagePayload): Promise<ResourceUsageCorrection> {
  const { data } = await apiClient.post<ResourceUsageCorrection>(`${BASE}/records/${id}/reverse`, payload);
  return data;
}

export async function adjustUsageRecord(id: string, payload: AdjustResourceUsagePayload): Promise<ResourceUsageCorrection> {
  const { data } = await apiClient.post<ResourceUsageCorrection>(`${BASE}/records/${id}/adjust`, payload);
  return data;
}
