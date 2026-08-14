import { apiClient } from '@/lib/api/axios';
import type {
  AiDescription,
  AiDescriptionFilterParams,
  AiDescriptionHistoryEntry,
  AiDescriptionListResult,
  AiDescriptionStats,
  ApproveAiDescriptionPayload,
  CreateAiDescriptionPayload,
  ManualEditAiDescriptionPayload,
  RegenerateAiDescriptionSectionsPayload,
} from '@/types';

const BASE = '/ai-descriptions';

export async function createAiDescription(payload: CreateAiDescriptionPayload): Promise<AiDescription> {
  const { data } = await apiClient.post<AiDescription>(BASE, payload);
  return data;
}

export async function listAiDescriptions(params: AiDescriptionFilterParams = {}): Promise<AiDescriptionListResult> {
  const { data } = await apiClient.get<AiDescriptionListResult>(BASE, { params });
  return data;
}

export async function getAiDescriptionStats(): Promise<AiDescriptionStats> {
  const { data } = await apiClient.get<AiDescriptionStats>(`${BASE}/stats`);
  return data;
}

export async function getAiDescriptionsByCatalogProduct(catalogProductId: string): Promise<AiDescription[]> {
  const { data } = await apiClient.get<AiDescription[]>(`${BASE}/catalog/${catalogProductId}`);
  return data;
}

export async function getLatestAiDescriptionByCatalogProduct(catalogProductId: string): Promise<AiDescription | null> {
  const { data } = await apiClient.get<AiDescription | null>(`${BASE}/catalog/${catalogProductId}/latest`);
  return data;
}

export async function getAiDescriptionById(id: string): Promise<AiDescription> {
  const { data } = await apiClient.get<AiDescription>(`${BASE}/${id}`);
  return data;
}

export async function getAiDescriptionHistory(id: string): Promise<AiDescriptionHistoryEntry[]> {
  const { data } = await apiClient.get<AiDescriptionHistoryEntry[]>(`${BASE}/${id}/history`);
  return data;
}

export async function regenerateAiDescriptionSections(id: string, payload: RegenerateAiDescriptionSectionsPayload): Promise<AiDescription> {
  const { data } = await apiClient.post<AiDescription>(`${BASE}/${id}/regenerate`, payload);
  return data;
}

export async function manualEditAiDescription(id: string, payload: ManualEditAiDescriptionPayload): Promise<AiDescription> {
  const { data } = await apiClient.post<AiDescription>(`${BASE}/${id}/manual-edit`, payload);
  return data;
}

export async function approveAiDescription(id: string, payload: ApproveAiDescriptionPayload = {}): Promise<AiDescription> {
  const { data } = await apiClient.post<AiDescription>(`${BASE}/${id}/approve`, payload);
  return data;
}

export async function deleteAiDescription(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
