import { apiClient } from '@/lib/api/axios';
import type {
  AiQueue,
  AiQueueFilterParams,
  AiQueueJob,
  AiQueueListResult,
  AiQueueStats,
  CreateAiQueuePayload,
  EnqueueBatchPayload,
  EnqueueJobPayload,
  EnqueueResult,
  QueueJobFilterParams,
  QueueJobListResult,
  UpdateAiQueuePayload,
} from '@/types';

const BASE = '/ai-queue-management';

export async function listAiQueues(params: AiQueueFilterParams = {}): Promise<AiQueueListResult> {
  const { data } = await apiClient.get<AiQueueListResult>(`${BASE}/queues`, { params });
  return data;
}

export async function getAiQueueById(id: string): Promise<AiQueue> {
  const { data } = await apiClient.get<AiQueue>(`${BASE}/queues/${id}`);
  return data;
}

export async function createAiQueue(payload: CreateAiQueuePayload): Promise<AiQueue> {
  const { data } = await apiClient.post<AiQueue>(`${BASE}/queues`, payload);
  return data;
}

export async function updateAiQueue(id: string, payload: UpdateAiQueuePayload): Promise<AiQueue> {
  const { data } = await apiClient.patch<AiQueue>(`${BASE}/queues/${id}`, payload);
  return data;
}

export async function deleteAiQueue(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/queues/${id}`);
}

export async function pauseAiQueue(id: string): Promise<AiQueue> {
  const { data } = await apiClient.patch<AiQueue>(`${BASE}/queues/${id}/pause`);
  return data;
}

export async function resumeAiQueue(id: string): Promise<AiQueue> {
  const { data } = await apiClient.patch<AiQueue>(`${BASE}/queues/${id}/resume`);
  return data;
}

export async function drainAiQueue(id: string): Promise<AiQueue> {
  const { data } = await apiClient.patch<AiQueue>(`${BASE}/queues/${id}/drain`);
  return data;
}

export async function stopAiQueue(id: string): Promise<AiQueue> {
  const { data } = await apiClient.patch<AiQueue>(`${BASE}/queues/${id}/stop`);
  return data;
}

export async function enqueueJob(payload: EnqueueJobPayload): Promise<EnqueueResult> {
  const { data } = await apiClient.post<EnqueueResult>(`${BASE}/enqueue`, payload);
  return data;
}

export async function enqueueBatch(payload: EnqueueBatchPayload): Promise<EnqueueResult[]> {
  const { data } = await apiClient.post<EnqueueResult[]>(`${BASE}/enqueue-batch`, payload);
  return data;
}

export async function listQueueJobs(params: QueueJobFilterParams): Promise<QueueJobListResult> {
  const { data } = await apiClient.get<QueueJobListResult>(`${BASE}/jobs`, { params });
  return data;
}

export async function getQueueJobById(id: string, workspaceId: string): Promise<AiQueueJob> {
  const { data } = await apiClient.get<AiQueueJob>(`${BASE}/jobs/${id}`, { params: { workspaceId } });
  return data;
}

export async function cancelQueueJob(id: string, workspaceId: string): Promise<AiQueueJob> {
  const { data } = await apiClient.post<AiQueueJob>(`${BASE}/jobs/${id}/cancel`, {}, { params: { workspaceId } });
  return data;
}

export async function getQueueStats(id: string): Promise<AiQueueStats> {
  const { data } = await apiClient.get<AiQueueStats>(`${BASE}/queues/${id}/stats`);
  return data;
}
