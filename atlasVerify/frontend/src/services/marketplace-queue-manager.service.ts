import { apiClient } from '@/lib/api/axios';
import type {
  CancelMarketplaceJobPayload,
  MarketplaceAggregatedQueueMetrics,
  MarketplaceDeadLetterJob,
  MarketplaceJobHistoryEntry,
  MarketplaceJobInfo,
  MarketplaceJobState,
  MarketplaceQueueErrorSummary,
  MarketplaceQueueHealth,
  MarketplaceQueueMetrics,
  MarketplaceQueueOperationResult,
  MarketplaceQueueType,
  MarketplaceRateLimitConfig,
  RecoverStaleMarketplaceJobsPayload,
  ReprocessMarketplaceDeadLetterJobPayload,
  RetryMarketplaceJobPayload,
  SetMarketplaceRateLimitPayload,
} from '@/types';

const BASE = '/marketplace/queue-manager';

export async function listMarketplaceJobs(workspaceId: string, queueType: MarketplaceQueueType, state: MarketplaceJobState): Promise<MarketplaceJobInfo[]> {
  const { data } = await apiClient.get<MarketplaceJobInfo[]>(`${BASE}/jobs`, { params: { workspaceId, queueType, state } });
  return data;
}

export async function getMarketplaceJob(workspaceId: string, queueType: MarketplaceQueueType, jobId: string): Promise<MarketplaceJobInfo | null> {
  const { data } = await apiClient.get<MarketplaceJobInfo | null>(`${BASE}/jobs/detail`, { params: { workspaceId, queueType, jobId } });
  return data;
}

export async function getMarketplaceJobHistory(workspaceId: string, jobId: string): Promise<MarketplaceJobHistoryEntry[]> {
  const { data } = await apiClient.get<MarketplaceJobHistoryEntry[]>(`${BASE}/jobs/history/${workspaceId}/${jobId}`);
  return data;
}

export async function retryMarketplaceJob(payload: RetryMarketplaceJobPayload): Promise<MarketplaceQueueOperationResult> {
  const { data } = await apiClient.post<MarketplaceQueueOperationResult>(`${BASE}/jobs/retry`, payload);
  return data;
}

export async function cancelMarketplaceJob(payload: CancelMarketplaceJobPayload): Promise<MarketplaceQueueOperationResult> {
  const { data } = await apiClient.post<MarketplaceQueueOperationResult>(`${BASE}/jobs/cancel`, payload);
  return data;
}

export async function recoverStaleMarketplaceJobs(payload: RecoverStaleMarketplaceJobsPayload): Promise<MarketplaceQueueOperationResult> {
  const { data } = await apiClient.post<MarketplaceQueueOperationResult>(`${BASE}/jobs/recover-stale`, payload);
  return data;
}

export async function pauseMarketplaceQueue(queueType: MarketplaceQueueType): Promise<MarketplaceQueueOperationResult> {
  const { data } = await apiClient.post<MarketplaceQueueOperationResult>(`${BASE}/queues/pause`, { queueType });
  return data;
}

export async function resumeMarketplaceQueue(queueType: MarketplaceQueueType): Promise<MarketplaceQueueOperationResult> {
  const { data } = await apiClient.post<MarketplaceQueueOperationResult>(`${BASE}/queues/resume`, { queueType });
  return data;
}

export async function drainMarketplaceQueue(queueType: MarketplaceQueueType, delayed?: boolean): Promise<MarketplaceQueueOperationResult> {
  const { data } = await apiClient.post<MarketplaceQueueOperationResult>(`${BASE}/queues/drain`, { queueType, delayed });
  return data;
}

export async function cleanMarketplaceQueue(queueType: MarketplaceQueueType, grace: number, limit: number, type: 'completed' | 'failed'): Promise<MarketplaceQueueOperationResult> {
  const { data } = await apiClient.post<MarketplaceQueueOperationResult>(`${BASE}/queues/clean`, { queueType, grace, limit, type });
  return data;
}

export async function getMarketplaceQueueMetrics(queueType: MarketplaceQueueType): Promise<MarketplaceQueueMetrics | null> {
  const { data } = await apiClient.get<MarketplaceQueueMetrics | null>(`${BASE}/queues/metrics/${queueType}`);
  return data;
}

export async function getMarketplaceQueueHealth(queueType: MarketplaceQueueType): Promise<MarketplaceQueueHealth | null> {
  const { data } = await apiClient.get<MarketplaceQueueHealth | null>(`${BASE}/queues/health/${queueType}`);
  return data;
}

export async function getAllMarketplaceQueueMetrics(): Promise<MarketplaceQueueMetrics[]> {
  const { data } = await apiClient.get<MarketplaceQueueMetrics[]>(`${BASE}/queues/metrics`);
  return data;
}

export async function getMarketplaceAggregatedMetrics(workspaceId: string, queueType: MarketplaceQueueType): Promise<MarketplaceAggregatedQueueMetrics> {
  const { data } = await apiClient.get<MarketplaceAggregatedQueueMetrics>(`${BASE}/metrics/${workspaceId}/${queueType}`);
  return data;
}

export async function getAllMarketplaceAggregatedMetrics(workspaceId: string): Promise<MarketplaceAggregatedQueueMetrics[]> {
  const { data } = await apiClient.get<MarketplaceAggregatedQueueMetrics[]>(`${BASE}/metrics/${workspaceId}`);
  return data;
}

export async function getMarketplaceQueueErrorSummary(workspaceId: string, queueType: MarketplaceQueueType, startDate: string, endDate: string): Promise<MarketplaceQueueErrorSummary[]> {
  const { data } = await apiClient.get<MarketplaceQueueErrorSummary[]>(`${BASE}/errors`, { params: { workspaceId, queueType, startDate, endDate } });
  return data;
}

export async function getMarketplaceDeadLetterJobs(workspaceId: string, queueType?: MarketplaceQueueType): Promise<MarketplaceDeadLetterJob[]> {
  const { data } = await apiClient.get<MarketplaceDeadLetterJob[]>(`${BASE}/dead-letter/${workspaceId}`, { params: { queueType } });
  return data;
}

export async function reprocessMarketplaceDeadLetterJob(payload: ReprocessMarketplaceDeadLetterJobPayload): Promise<MarketplaceQueueOperationResult> {
  const { data } = await apiClient.post<MarketplaceQueueOperationResult>(`${BASE}/dead-letter/reprocess`, payload);
  return data;
}

export async function getMarketplaceRateLimitConfig(workspaceId: string, provider: string, queueType: MarketplaceQueueType, accountId?: string): Promise<MarketplaceRateLimitConfig | null> {
  const { data } = await apiClient.get<MarketplaceRateLimitConfig | null>(`${BASE}/rate-limit/${workspaceId}/${provider}/${queueType}`, { params: { accountId } });
  return data;
}

export async function createMarketplaceRateLimitConfig(payload: SetMarketplaceRateLimitPayload): Promise<MarketplaceRateLimitConfig> {
  const { data } = await apiClient.post<MarketplaceRateLimitConfig>(`${BASE}/rate-limit/create`, payload);
  return data;
}

export async function updateMarketplaceRateLimitConfig(payload: SetMarketplaceRateLimitPayload): Promise<MarketplaceRateLimitConfig> {
  const { data } = await apiClient.post<MarketplaceRateLimitConfig>(`${BASE}/rate-limit/update`, payload);
  return data;
}
