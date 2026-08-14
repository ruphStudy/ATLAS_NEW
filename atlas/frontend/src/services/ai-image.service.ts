import { apiClient } from '@/lib/api/axios';
import type {
  AiImageFilterParams,
  AiImageHistoryEntry,
  AiImageSet,
  AiImageSetListResult,
  AiImageStats,
  ApproveAiImagesPayload,
  CreateAiImageSetPayload,
  ManualUploadAiImagePayload,
  RegenerateAiImagesPayload,
} from '@/types';

const BASE = '/ai-images';

export async function createAiImageSet(payload: CreateAiImageSetPayload): Promise<AiImageSet> {
  const { data } = await apiClient.post<AiImageSet>(BASE, payload);
  return data;
}

export async function listAiImageSets(params: AiImageFilterParams = {}): Promise<AiImageSetListResult> {
  const { data } = await apiClient.get<AiImageSetListResult>(BASE, { params });
  return data;
}

export async function getAiImageStats(): Promise<AiImageStats> {
  const { data } = await apiClient.get<AiImageStats>(`${BASE}/stats`);
  return data;
}

export async function getAiImageSetsByCatalogProduct(catalogProductId: string): Promise<AiImageSet[]> {
  const { data } = await apiClient.get<AiImageSet[]>(`${BASE}/catalog/${catalogProductId}`);
  return data;
}

export async function getLatestAiImageSetByCatalogProduct(catalogProductId: string): Promise<AiImageSet | null> {
  const { data } = await apiClient.get<AiImageSet | null>(`${BASE}/catalog/${catalogProductId}/latest`);
  return data;
}

export async function getAiImageSetById(id: string): Promise<AiImageSet> {
  const { data } = await apiClient.get<AiImageSet>(`${BASE}/${id}`);
  return data;
}

export async function getAiImageSetHistory(id: string): Promise<AiImageHistoryEntry[]> {
  const { data } = await apiClient.get<AiImageHistoryEntry[]>(`${BASE}/${id}/history`);
  return data;
}

export async function regenerateAiImages(id: string, payload: RegenerateAiImagesPayload): Promise<AiImageSet> {
  const { data } = await apiClient.post<AiImageSet>(`${BASE}/${id}/regenerate`, payload);
  return data;
}

export async function manualUploadAiImage(id: string, payload: ManualUploadAiImagePayload): Promise<AiImageSet> {
  const { data } = await apiClient.post<AiImageSet>(`${BASE}/${id}/manual-upload`, payload);
  return data;
}

export async function approveAiImages(id: string, payload: ApproveAiImagesPayload = {}): Promise<AiImageSet> {
  const { data } = await apiClient.post<AiImageSet>(`${BASE}/${id}/approve`, payload);
  return data;
}

export async function deleteAiImageSet(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
