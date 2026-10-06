import { apiClient } from '@/lib/api/axios';
import type {
  AiCacheEntry,
  AiCacheEntryFilterParams,
  AiCacheEntryListResult,
  AiCachePolicy,
  AiCacheSavings,
  AiFallbackConfig,
  AiFallbackExecution,
  AiRetryAttempt,
  AiRetryExecution,
  AiRetryPolicy,
  AiRetryStats,
  CreateCachePolicyPayload,
  CreateFallbackConfigPayload,
  CreateRetryPolicyPayload,
  RetryExecutionFilterParams,
  RetryExecutionListResult,
  UpdateCachePolicyPayload,
  UpdateFallbackConfigPayload,
  UpdateRetryPolicyPayload,
} from '@/types';

const RETRY_BASE = '/ai-fallback-retry';
const CACHE_BASE = '/ai-cache-management';

// ── Retry executions ────────────────────────────────────────────────────
export async function listRetryExecutions(params: RetryExecutionFilterParams): Promise<RetryExecutionListResult> {
  const { data } = await apiClient.get<RetryExecutionListResult>(`${RETRY_BASE}/executions`, { params });
  return data;
}

export async function getRetryExecutionById(id: string, workspaceId: string): Promise<AiRetryExecution> {
  const { data } = await apiClient.get<AiRetryExecution>(`${RETRY_BASE}/executions/${id}`, { params: { workspaceId } });
  return data;
}

export async function getRetryAttempts(id: string, workspaceId: string): Promise<AiRetryAttempt[]> {
  const { data } = await apiClient.get<AiRetryAttempt[]>(`${RETRY_BASE}/executions/${id}/attempts`, { params: { workspaceId } });
  return data;
}

export async function getRetryFallbacks(id: string, workspaceId: string): Promise<AiFallbackExecution[]> {
  const { data } = await apiClient.get<AiFallbackExecution[]>(`${RETRY_BASE}/executions/${id}/fallbacks`, { params: { workspaceId } });
  return data;
}

export async function getRetryStats(workspaceId: string, startDate?: string, endDate?: string): Promise<AiRetryStats> {
  const { data } = await apiClient.get<AiRetryStats>(`${RETRY_BASE}/stats`, { params: { workspaceId, startDate, endDate } });
  return data;
}

// ── Retry policies ──────────────────────────────────────────────────────
export async function createRetryPolicy(payload: CreateRetryPolicyPayload): Promise<AiRetryPolicy> {
  const { data } = await apiClient.post<AiRetryPolicy>(`${RETRY_BASE}/policies`, payload);
  return data;
}

export async function updateRetryPolicy(id: string, payload: UpdateRetryPolicyPayload): Promise<AiRetryPolicy> {
  const { data } = await apiClient.patch<AiRetryPolicy>(`${RETRY_BASE}/policies/${id}`, payload);
  return data;
}

export async function deleteRetryPolicy(id: string): Promise<void> {
  await apiClient.delete(`${RETRY_BASE}/policies/${id}`);
}

export async function getRetryPolicyById(id: string): Promise<AiRetryPolicy> {
  const { data } = await apiClient.get<AiRetryPolicy>(`${RETRY_BASE}/policies/${id}`);
  return data;
}

// ── Fallback configs ────────────────────────────────────────────────────
export async function createFallbackConfig(payload: CreateFallbackConfigPayload): Promise<AiFallbackConfig> {
  const { data } = await apiClient.post<AiFallbackConfig>(`${RETRY_BASE}/fallback-configs`, payload);
  return data;
}

export async function updateFallbackConfig(id: string, payload: UpdateFallbackConfigPayload): Promise<AiFallbackConfig> {
  const { data } = await apiClient.patch<AiFallbackConfig>(`${RETRY_BASE}/fallback-configs/${id}`, payload);
  return data;
}

export async function deleteFallbackConfig(id: string): Promise<void> {
  await apiClient.delete(`${RETRY_BASE}/fallback-configs/${id}`);
}

export async function getFallbackConfigById(id: string): Promise<AiFallbackConfig> {
  const { data } = await apiClient.get<AiFallbackConfig>(`${RETRY_BASE}/fallback-configs/${id}`);
  return data;
}

// ── Cache entries ───────────────────────────────────────────────────────
export async function listCacheEntries(params: AiCacheEntryFilterParams): Promise<AiCacheEntryListResult> {
  const { data } = await apiClient.get<AiCacheEntryListResult>(`${CACHE_BASE}/entries`, { params });
  return data;
}

export async function getCacheEntryById(id: string, workspaceId: string): Promise<AiCacheEntry> {
  const { data } = await apiClient.get<AiCacheEntry>(`${CACHE_BASE}/entries/${id}`, { params: { workspaceId } });
  return data;
}

export async function getCacheSavings(workspaceId: string, startDate?: string, endDate?: string): Promise<AiCacheSavings> {
  const { data } = await apiClient.get<AiCacheSavings>(`${CACHE_BASE}/savings`, { params: { workspaceId, startDate, endDate } });
  return data;
}

export async function evictExpiredCacheEntries(workspaceId: string): Promise<{ evicted: number }> {
  const { data } = await apiClient.post<{ evicted: number }>(`${CACHE_BASE}/evict-expired`, {}, { params: { workspaceId } });
  return data;
}

export async function markStaleCacheEntries(workspaceId: string): Promise<{ marked: number }> {
  const { data } = await apiClient.post<{ marked: number }>(`${CACHE_BASE}/mark-stale`, {}, { params: { workspaceId } });
  return data;
}

// ── Cache policies ──────────────────────────────────────────────────────
export async function createCachePolicy(payload: CreateCachePolicyPayload): Promise<AiCachePolicy> {
  const { data } = await apiClient.post<AiCachePolicy>(`${CACHE_BASE}/policies`, payload);
  return data;
}

export async function updateCachePolicy(id: string, payload: UpdateCachePolicyPayload): Promise<AiCachePolicy> {
  const { data } = await apiClient.patch<AiCachePolicy>(`${CACHE_BASE}/policies/${id}`, payload);
  return data;
}

export async function deleteCachePolicy(id: string): Promise<void> {
  await apiClient.delete(`${CACHE_BASE}/policies/${id}`);
}

export async function getCachePolicyById(id: string): Promise<AiCachePolicy> {
  const { data } = await apiClient.get<AiCachePolicy>(`${CACHE_BASE}/policies/${id}`);
  return data;
}
