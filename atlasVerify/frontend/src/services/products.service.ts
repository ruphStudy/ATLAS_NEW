import { apiClient } from '@/lib/api/axios';
import type { CatalogFilterParams, CatalogHistoryEntry, CatalogProduct, CreateCatalogProductPayload, PaginatedResult, UpdateCatalogProductPayload } from '@/types';

const BASE = '/product-catalog';

export async function listProducts(params: CatalogFilterParams = {}): Promise<PaginatedResult<CatalogProduct>> {
  const { data } = await apiClient.get<PaginatedResult<CatalogProduct>>(BASE, { params });
  return data;
}

export async function getProductById(id: string): Promise<CatalogProduct> {
  const { data } = await apiClient.get<CatalogProduct>(`${BASE}/${id}`);
  return data;
}

export async function createProduct(payload: CreateCatalogProductPayload): Promise<CatalogProduct> {
  const { data } = await apiClient.post<CatalogProduct>(BASE, payload);
  return data;
}

export async function updateProduct(id: string, payload: UpdateCatalogProductPayload): Promise<CatalogProduct> {
  const { data } = await apiClient.patch<CatalogProduct>(`${BASE}/${id}`, payload);
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export interface ProductCatalogStats {
  total: number;
  byStatus: Record<string, number>;
  byProductType: Record<string, number>;
  duplicates: number;
}

export async function getProductStats(): Promise<ProductCatalogStats> {
  const { data } = await apiClient.get<ProductCatalogStats>(`${BASE}/stats`);
  return data;
}

export async function getProductHistory(id: string): Promise<CatalogHistoryEntry[]> {
  const { data } = await apiClient.get<CatalogHistoryEntry[]>(`${BASE}/${id}/history`);
  return data;
}

export async function requestAiGenerationForProduct(id: string, notes?: string): Promise<CatalogProduct> {
  const { data } = await apiClient.post<CatalogProduct>(`${BASE}/${id}/request-ai`, { notes });
  return data;
}

export async function markProductAiGenerated(id: string, notes?: string): Promise<CatalogProduct> {
  const { data } = await apiClient.post<CatalogProduct>(`${BASE}/${id}/mark-ai-generated`, { notes });
  return data;
}

export async function submitProductForApproval(id: string, reason?: string): Promise<CatalogProduct> {
  const { data } = await apiClient.post<CatalogProduct>(`${BASE}/${id}/submit-for-approval`, { reason });
  return data;
}

export async function approveProduct(id: string, reason?: string): Promise<CatalogProduct> {
  const { data } = await apiClient.post<CatalogProduct>(`${BASE}/${id}/approve`, { reason });
  return data;
}

export async function publishProduct(id: string, reason?: string): Promise<CatalogProduct> {
  const { data } = await apiClient.post<CatalogProduct>(`${BASE}/${id}/publish`, { reason });
  return data;
}

export async function archiveProduct(id: string, reason?: string): Promise<CatalogProduct> {
  const { data } = await apiClient.post<CatalogProduct>(`${BASE}/${id}/archive`, { reason });
  return data;
}

export async function revertProductToDraft(id: string, reason?: string): Promise<CatalogProduct> {
  const { data } = await apiClient.post<CatalogProduct>(`${BASE}/${id}/revert-to-draft`, { reason });
  return data;
}
