import { apiClient } from '@/lib/api/axios';
import type {
  BrandEntityLink,
  ChangeBrandOwnershipPayload,
  CreateMultiBrandPayload,
  LinkBrandEntityPayload,
  MultiBrand,
  MultiBrandFilterParams,
  MultiBrandHistoryEntry,
  MultiBrandListResult,
  UpdateMultiBrandPayload,
} from '@/types';

const BASE = '/multi-brand';

export async function listMultiBrands(params: MultiBrandFilterParams = {}): Promise<MultiBrandListResult> {
  const { data } = await apiClient.get(`${BASE}/brands`, { params });
  return data;
}

export async function getBrandById(id: string, workspaceId?: string): Promise<MultiBrand> {
  const { data } = await apiClient.get(`${BASE}/brands/${id}`, { params: { workspaceId } });
  return data;
}

export async function createBrand(payload: CreateMultiBrandPayload): Promise<MultiBrand> {
  const { data } = await apiClient.post(`${BASE}/brands`, payload);
  return data;
}

export async function updateBrand(id: string, payload: UpdateMultiBrandPayload): Promise<MultiBrand> {
  const { data } = await apiClient.patch(`${BASE}/brands/${id}`, payload);
  return data;
}

export async function activateBrand(id: string, reason?: string): Promise<MultiBrand> {
  const { data } = await apiClient.post(`${BASE}/brands/${id}/activate`, { reason });
  return data;
}

export async function deactivateBrand(id: string, reason?: string): Promise<MultiBrand> {
  const { data } = await apiClient.post(`${BASE}/brands/${id}/deactivate`, { reason });
  return data;
}

export async function archiveBrand(id: string, reason?: string): Promise<MultiBrand> {
  const { data } = await apiClient.post(`${BASE}/brands/${id}/archive`, { reason });
  return data;
}

export async function restoreBrand(id: string, reason?: string): Promise<MultiBrand> {
  const { data } = await apiClient.post(`${BASE}/brands/${id}/restore`, { reason });
  return data;
}

export async function setDefaultBrand(id: string): Promise<MultiBrand> {
  const { data } = await apiClient.post(`${BASE}/brands/${id}/set-default`);
  return data;
}

export async function changeBrandOwnership(id: string, payload: ChangeBrandOwnershipPayload): Promise<MultiBrand> {
  const { data } = await apiClient.post(`${BASE}/brands/${id}/ownership`, payload);
  return data;
}

export async function getBrandHistory(id: string): Promise<MultiBrandHistoryEntry[]> {
  const { data } = await apiClient.get(`${BASE}/brands/${id}/history`);
  return data;
}

export async function linkBrandEntity(brandId: string, payload: LinkBrandEntityPayload): Promise<BrandEntityLink> {
  const { data } = await apiClient.post(`${BASE}/brands/${brandId}/links`, payload);
  return data;
}

export async function listBrandLinks(brandId: string): Promise<BrandEntityLink[]> {
  const { data } = await apiClient.get(`${BASE}/brands/${brandId}/links`);
  return data;
}

export async function unlinkBrandEntity(brandId: string, entityType: string, entityId: string): Promise<void> {
  await apiClient.delete(`${BASE}/brands/${brandId}/links/${entityType}/${entityId}`);
}
