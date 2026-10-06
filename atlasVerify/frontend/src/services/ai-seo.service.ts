import { apiClient } from '@/lib/api/axios';
import type {
  AiSeoHistoryEntry,
  AiSeoOptimization,
  ApproveSeoPayload,
  CreateSeoOptimizationPayload,
  ManualSeoEditPayload,
  RegenerateSeoSectionsPayload,
  SeoOptimizationFilterParams,
  SeoOptimizationListResult,
  SeoOptimizationStats,
} from '@/types';

const BASE = '/ai-seo';

export async function createSeoOptimization(payload: CreateSeoOptimizationPayload): Promise<AiSeoOptimization> {
  const { data } = await apiClient.post<AiSeoOptimization>(BASE, payload);
  return data;
}

export async function listSeoOptimizations(params: SeoOptimizationFilterParams = {}): Promise<SeoOptimizationListResult> {
  const { data } = await apiClient.get<SeoOptimizationListResult>(BASE, { params });
  return data;
}

export async function getSeoOptimizationStats(): Promise<SeoOptimizationStats> {
  const { data } = await apiClient.get<SeoOptimizationStats>(`${BASE}/stats`);
  return data;
}

export async function getSeoOptimizationsByCatalogProduct(catalogProductId: string): Promise<AiSeoOptimization[]> {
  const { data } = await apiClient.get<AiSeoOptimization[]>(`${BASE}/catalog/${catalogProductId}`);
  return data;
}

export async function getLatestSeoOptimizationByCatalogProduct(catalogProductId: string): Promise<AiSeoOptimization | null> {
  const { data } = await apiClient.get<AiSeoOptimization | null>(`${BASE}/catalog/${catalogProductId}/latest`);
  return data;
}

export async function getSeoOptimizationById(id: string): Promise<AiSeoOptimization> {
  const { data } = await apiClient.get<AiSeoOptimization>(`${BASE}/${id}`);
  return data;
}

export async function getSeoOptimizationHistory(id: string): Promise<AiSeoHistoryEntry[]> {
  const { data } = await apiClient.get<AiSeoHistoryEntry[]>(`${BASE}/${id}/history`);
  return data;
}

export async function regenerateSeoSections(id: string, payload: RegenerateSeoSectionsPayload): Promise<AiSeoOptimization> {
  const { data } = await apiClient.post<AiSeoOptimization>(`${BASE}/${id}/regenerate`, payload);
  return data;
}

export async function manualEditSeoOptimization(id: string, payload: ManualSeoEditPayload): Promise<AiSeoOptimization> {
  const { data } = await apiClient.post<AiSeoOptimization>(`${BASE}/${id}/manual-edit`, payload);
  return data;
}

export async function approveSeoOptimization(id: string, payload: ApproveSeoPayload = {}): Promise<AiSeoOptimization> {
  const { data } = await apiClient.post<AiSeoOptimization>(`${BASE}/${id}/approve`, payload);
  return data;
}

export async function deleteSeoOptimization(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
