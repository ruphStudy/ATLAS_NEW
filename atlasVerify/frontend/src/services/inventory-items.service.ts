import { apiClient } from '@/lib/api/axios';
import type {
  CreateInventoryItemPayload,
  InventoryConfig,
  InventoryItem,
  InventoryItemFilterParams,
  InventoryItemHistoryEntry,
  InventoryItemListResult,
  UpdateInventoryItemPayload,
} from '@/types';

const BASE = '/inventory/items';

export async function listInventoryItems(params: InventoryItemFilterParams = {}): Promise<InventoryItemListResult> {
  const { data } = await apiClient.get<InventoryItemListResult>(BASE, { params });
  return data;
}

export async function getInventoryItemById(id: string): Promise<InventoryItem> {
  const { data } = await apiClient.get<InventoryItem>(`${BASE}/${id}`);
  return data;
}

export async function getInventoryItemsByCatalogProduct(catalogProductId: string, variantId?: string): Promise<InventoryItem[]> {
  const { data } = await apiClient.get<InventoryItem[]>(`${BASE}/by-catalog-product/${catalogProductId}`, { params: { variantId } });
  return data;
}

export async function createInventoryItem(payload: CreateInventoryItemPayload): Promise<InventoryItem> {
  const { data } = await apiClient.post<InventoryItem>(BASE, payload);
  return data;
}

export async function updateInventoryItem(id: string, payload: UpdateInventoryItemPayload): Promise<InventoryItem> {
  const { data } = await apiClient.patch<InventoryItem>(`${BASE}/${id}`, payload);
  return data;
}

export async function getInventoryItemHistory(id: string): Promise<InventoryItemHistoryEntry[]> {
  const { data } = await apiClient.get<InventoryItemHistoryEntry[]>(`${BASE}/${id}/history`);
  return data;
}

export async function activateInventoryItem(id: string, reason?: string): Promise<InventoryItem> {
  const { data } = await apiClient.post<InventoryItem>(`${BASE}/${id}/activate`, { reason });
  return data;
}

export async function deactivateInventoryItem(id: string, reason?: string): Promise<InventoryItem> {
  const { data } = await apiClient.post<InventoryItem>(`${BASE}/${id}/deactivate`, { reason });
  return data;
}

export async function reactivateInventoryItem(id: string, reason?: string): Promise<InventoryItem> {
  const { data } = await apiClient.post<InventoryItem>(`${BASE}/${id}/reactivate`, { reason });
  return data;
}

export async function discontinueInventoryItem(id: string, reason?: string): Promise<InventoryItem> {
  const { data } = await apiClient.post<InventoryItem>(`${BASE}/${id}/discontinue`, { reason });
  return data;
}

export async function archiveInventoryItem(id: string, reason?: string): Promise<InventoryItem> {
  const { data } = await apiClient.post<InventoryItem>(`${BASE}/${id}/archive`, { reason });
  return data;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function getInventoryItemConfig(id: string): Promise<InventoryConfig> {
  const { data } = await apiClient.get<InventoryConfig>(`${BASE}/${id}/config`);
  return data;
}

export async function updateInventoryItemConfig(id: string, payload: Partial<InventoryConfig>): Promise<InventoryConfig> {
  const { data } = await apiClient.patch<InventoryConfig>(`${BASE}/${id}/config`, payload);
  return data;
}
