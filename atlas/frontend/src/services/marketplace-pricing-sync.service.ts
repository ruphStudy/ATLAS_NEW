import { apiClient } from '@/lib/api/axios';
import type {
  CreatePriceSyncSchedulePayload,
  PriceConflict,
  PriceConflictFilterParams,
  PriceExternalRef,
  PriceExternalRefFilterParams,
  PriceSyncItemResult,
  PriceSyncItemResultFilterParams,
  PriceSyncJob,
  PriceSyncJobFilterParams,
  PriceSyncMetrics,
  PriceSyncPaginatedResult,
  PriceSyncSchedule,
  RetryFailedPriceItemsPayload,
  StartPriceSyncPayload,
  UpdatePriceSyncSchedulePayload,
} from '@/types';

const BASE = '/marketplace-pricing-sync';

export async function startPriceSync(payload: StartPriceSyncPayload): Promise<PriceSyncJob> {
  const { data } = await apiClient.post<PriceSyncJob>(`${BASE}/sync`, payload);
  return data;
}

export async function cancelPriceSync(jobId: string, workspaceId: string): Promise<PriceSyncJob> {
  const { data } = await apiClient.post<PriceSyncJob>(`${BASE}/sync/${workspaceId}/${jobId}/cancel`);
  return data;
}

export async function retryFailedPriceItems(payload: RetryFailedPriceItemsPayload): Promise<PriceSyncJob> {
  const { data } = await apiClient.post<PriceSyncJob>(`${BASE}/sync/retry`, payload);
  return data;
}

export async function listPriceSyncJobs(params: PriceSyncJobFilterParams = {}): Promise<{ items: PriceSyncJob[]; total: number; page: number; limit: number; totalPages: number }> {
  const { data } = await apiClient.get(`${BASE}/jobs`, { params });
  return data;
}

export async function getPriceSyncJob(jobId: string, workspaceId: string): Promise<PriceSyncJob> {
  const { data } = await apiClient.get<PriceSyncJob>(`${BASE}/jobs/${workspaceId}/${jobId}`);
  return data;
}

export async function getPriceSyncItemResults(jobId: string, workspaceId: string, params: PriceSyncItemResultFilterParams = {}): Promise<PriceSyncPaginatedResult<PriceSyncItemResult>> {
  const { data } = await apiClient.get<PriceSyncPaginatedResult<PriceSyncItemResult>>(`${BASE}/jobs/${workspaceId}/${jobId}/items`, { params });
  return data;
}

export async function getPriceExternalRefs(workspaceId: string, accountId: string, params: PriceExternalRefFilterParams = {}): Promise<PriceSyncPaginatedResult<PriceExternalRef>> {
  const { data } = await apiClient.get<PriceSyncPaginatedResult<PriceExternalRef>>(`${BASE}/external-refs/${workspaceId}/${accountId}`, { params });
  return data;
}

export async function getPriceConflicts(workspaceId: string, params: PriceConflictFilterParams = {}): Promise<PriceSyncPaginatedResult<PriceConflict>> {
  const { data } = await apiClient.get<PriceSyncPaginatedResult<PriceConflict>>(`${BASE}/conflicts/${workspaceId}`, { params });
  return data;
}

export async function resolvePriceConflict(conflictId: string, workspaceId: string, resolution: string, resolvedBy: string, notes?: string): Promise<unknown> {
  const { data } = await apiClient.post(`${BASE}/conflicts/${workspaceId}/${conflictId}/resolve`, { resolution, resolvedBy, notes });
  return data;
}

export async function createPriceSyncSchedule(payload: CreatePriceSyncSchedulePayload): Promise<PriceSyncSchedule> {
  const { data } = await apiClient.post<PriceSyncSchedule>(`${BASE}/schedules`, payload);
  return data;
}

export async function updatePriceSyncSchedule(scheduleId: string, workspaceId: string, payload: UpdatePriceSyncSchedulePayload): Promise<PriceSyncSchedule> {
  const { data } = await apiClient.patch<PriceSyncSchedule>(`${BASE}/schedules/${workspaceId}/${scheduleId}`, payload);
  return data;
}

export async function deletePriceSyncSchedule(scheduleId: string, workspaceId: string): Promise<void> {
  await apiClient.delete(`${BASE}/schedules/${workspaceId}/${scheduleId}`);
}

export async function getPriceSyncSchedules(workspaceId: string): Promise<PriceSyncSchedule[]> {
  const { data } = await apiClient.get<PriceSyncSchedule[]>(`${BASE}/schedules/${workspaceId}`);
  return data;
}

export async function getPriceSyncMetrics(workspaceId: string, accountId?: string): Promise<PriceSyncMetrics> {
  const { data } = await apiClient.get<PriceSyncMetrics>(`${BASE}/metrics/${workspaceId}`, { params: { accountId } });
  return data;
}
