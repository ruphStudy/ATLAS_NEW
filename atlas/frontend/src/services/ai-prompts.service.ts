import { apiClient } from '@/lib/api/axios';
import type {
  AiPrompt,
  AiPromptFilterParams,
  AiPromptListResult,
  AiPromptStats,
  AiPromptVersion,
  CompilePromptPayload,
  CompiledPrompt,
  CreateAiPromptPayload,
  CreatePromptVersionPayload,
  ResolvePromptParams,
  ResolvedPrompt,
  RollbackPromptPayload,
  UpdateAiPromptPayload,
} from '@/types';

const BASE = '/ai-prompt';

export async function listAiPrompts(params: AiPromptFilterParams = {}): Promise<AiPromptListResult> {
  const { data } = await apiClient.get<AiPromptListResult>(`${BASE}/prompts`, { params });
  return data;
}

export async function getAiPromptById(id: string, workspaceId?: string): Promise<AiPrompt> {
  const { data } = await apiClient.get<AiPrompt>(`${BASE}/prompts/${id}`, { params: { workspaceId } });
  return data;
}

export async function createAiPrompt(payload: CreateAiPromptPayload): Promise<AiPrompt> {
  const { data } = await apiClient.post<AiPrompt>(`${BASE}/prompts`, payload);
  return data;
}

export async function updateAiPrompt(id: string, payload: UpdateAiPromptPayload, workspaceId?: string): Promise<AiPrompt> {
  const { data } = await apiClient.patch<AiPrompt>(`${BASE}/prompts/${id}`, payload, { params: { workspaceId } });
  return data;
}

export async function deleteAiPrompt(id: string, workspaceId?: string): Promise<void> {
  await apiClient.delete(`${BASE}/prompts/${id}`, { params: { workspaceId } });
}

export async function publishAiPrompt(id: string, workspaceId?: string, publishedBy?: string): Promise<AiPrompt> {
  const { data } = await apiClient.post<AiPrompt>(`${BASE}/prompts/${id}/publish`, {}, { params: { workspaceId, publishedBy } });
  return data;
}

export async function deprecateAiPrompt(id: string): Promise<AiPrompt> {
  const { data } = await apiClient.patch<AiPrompt>(`${BASE}/prompts/${id}/deprecate`);
  return data;
}

export async function archiveAiPrompt(id: string): Promise<AiPrompt> {
  const { data } = await apiClient.patch<AiPrompt>(`${BASE}/prompts/${id}/archive`);
  return data;
}

export async function createPromptVersion(payload: CreatePromptVersionPayload): Promise<AiPromptVersion> {
  const { data } = await apiClient.post<AiPromptVersion>(`${BASE}/versions`, payload);
  return data;
}

export async function listPromptVersions(promptId: string): Promise<AiPromptVersion[]> {
  const { data } = await apiClient.get<AiPromptVersion[]>(`${BASE}/prompts/${promptId}/versions`);
  return data;
}

export async function rollbackPrompt(payload: RollbackPromptPayload): Promise<AiPrompt> {
  const { data } = await apiClient.post<AiPrompt>(`${BASE}/rollback`, payload);
  return data;
}

export async function resolvePrompt(payload: ResolvePromptParams): Promise<ResolvedPrompt> {
  const { data } = await apiClient.post<ResolvedPrompt>(`${BASE}/resolve`, payload);
  return data;
}

export async function compilePrompt(payload: CompilePromptPayload): Promise<CompiledPrompt> {
  const { data } = await apiClient.post<CompiledPrompt>(`${BASE}/compile`, payload);
  return data;
}

export async function getPromptStats(id: string, startDate?: string, endDate?: string): Promise<AiPromptStats> {
  const { data } = await apiClient.get<AiPromptStats>(`${BASE}/prompts/${id}/stats`, { params: { startDate, endDate } });
  return data;
}
