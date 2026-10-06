import { apiClient } from '@/lib/api/axios';
import type {
  AiContext,
  AiContextFilterParams,
  AiContextListResult,
  AiContextStats,
  AiContextVersionEntry,
  ContextMergeResult,
  ContextSummaryResult,
  CreateAiContextPayload,
  MergeContextPayload,
} from '@/types';

const BASE = '/ai-context-management';

export async function listAiContexts(params: AiContextFilterParams): Promise<AiContextListResult> {
  const { data } = await apiClient.get<AiContextListResult>(`${BASE}/contexts`, { params });
  return data;
}

export async function getAiContextById(id: string, workspaceId: string): Promise<AiContext> {
  const { data } = await apiClient.get<AiContext>(`${BASE}/contexts/${id}`, { params: { workspaceId } });
  return data;
}

export async function createAiContext(payload: CreateAiContextPayload): Promise<AiContext> {
  const { data } = await apiClient.post<AiContext>(`${BASE}/contexts`, payload);
  return data;
}

export async function deleteAiContext(id: string, workspaceId: string): Promise<void> {
  await apiClient.delete(`${BASE}/contexts/${id}`, { params: { workspaceId } });
}

export async function mergeAiContexts(payload: MergeContextPayload): Promise<ContextMergeResult> {
  const { data } = await apiClient.post<ContextMergeResult>(`${BASE}/merge`, payload);
  return data;
}

export async function summarizeAiContext(id: string, workspaceId: string): Promise<ContextSummaryResult> {
  const { data } = await apiClient.post<ContextSummaryResult>(`${BASE}/contexts/${id}/summarize`, {}, { params: { workspaceId } });
  return data;
}

export async function trimAiContext(id: string, workspaceId: string, maxTokens: number): Promise<AiContext> {
  const { data } = await apiClient.post<AiContext>(`${BASE}/contexts/${id}/trim`, {}, { params: { workspaceId, maxTokens } });
  return data;
}

export async function expireAiContext(id: string, workspaceId: string): Promise<AiContext> {
  const { data } = await apiClient.patch<AiContext>(`${BASE}/contexts/${id}/expire`, {}, { params: { workspaceId } });
  return data;
}

export async function archiveAiContext(id: string, workspaceId: string): Promise<AiContext> {
  const { data } = await apiClient.patch<AiContext>(`${BASE}/contexts/${id}/archive`, {}, { params: { workspaceId } });
  return data;
}

export async function listAiContextVersions(id: string, workspaceId: string): Promise<AiContextVersionEntry[]> {
  const { data } = await apiClient.get<AiContextVersionEntry[]>(`${BASE}/contexts/${id}/versions`, { params: { workspaceId } });
  return data;
}

export async function getAiContextStats(workspaceId: string, startDate?: string, endDate?: string): Promise<AiContextStats> {
  const { data } = await apiClient.get<AiContextStats>(`${BASE}/stats`, { params: { workspaceId, startDate, endDate } });
  return data;
}
