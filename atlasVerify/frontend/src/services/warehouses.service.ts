import { apiClient } from '@/lib/api/axios';
import type {
  CreateWarehousePayload,
  PaginationParams,
  UpdateWarehousePayload,
  Warehouse,
  WarehouseFilterParams,
  WarehouseFullListResult,
  WarehouseHistoryEntry,
  WarehouseListResult,
} from '@/types';

const BASE = '/warehouses';

/** Minimal listing used to populate warehouse selectors elsewhere (e.g. receiving records). */
export async function listWarehouses(params: PaginationParams = {}): Promise<WarehouseListResult> {
  const { data } = await apiClient.get<WarehouseListResult>(BASE, { params });
  return data;
}

export async function listWarehousesFull(params: WarehouseFilterParams = {}): Promise<WarehouseFullListResult> {
  const { data } = await apiClient.get<WarehouseFullListResult>(BASE, { params });
  return data;
}

export async function getWarehouseById(id: string): Promise<Warehouse> {
  const { data } = await apiClient.get<Warehouse>(`${BASE}/${id}`);
  return data;
}

export async function createWarehouse(payload: CreateWarehousePayload): Promise<Warehouse> {
  const { data } = await apiClient.post<Warehouse>(BASE, payload);
  return data;
}

export async function updateWarehouse(id: string, payload: UpdateWarehousePayload): Promise<Warehouse> {
  const { data } = await apiClient.patch<Warehouse>(`${BASE}/${id}`, payload);
  return data;
}

export async function getWarehouseHistory(id: string): Promise<WarehouseHistoryEntry[]> {
  const { data } = await apiClient.get<WarehouseHistoryEntry[]>(`${BASE}/${id}/history`);
  return data;
}

export async function activateWarehouse(id: string, reason?: string): Promise<Warehouse> {
  const { data } = await apiClient.post<Warehouse>(`${BASE}/${id}/activate`, { reason });
  return data;
}

export async function deactivateWarehouse(id: string, reason?: string): Promise<Warehouse> {
  const { data } = await apiClient.post<Warehouse>(`${BASE}/${id}/deactivate`, { reason });
  return data;
}

export async function suspendWarehouse(id: string, reason?: string): Promise<Warehouse> {
  const { data } = await apiClient.post<Warehouse>(`${BASE}/${id}/suspend`, { reason });
  return data;
}

export async function closeWarehouse(id: string, reason?: string): Promise<Warehouse> {
  const { data } = await apiClient.post<Warehouse>(`${BASE}/${id}/close`, { reason });
  return data;
}

export async function archiveWarehouse(id: string, reason?: string): Promise<Warehouse> {
  const { data } = await apiClient.post<Warehouse>(`${BASE}/${id}/archive`, { reason });
  return data;
}

export async function restoreWarehouse(id: string, reason?: string): Promise<Warehouse> {
  const { data } = await apiClient.post<Warehouse>(`${BASE}/${id}/restore`, { reason });
  return data;
}

export async function deleteWarehouse(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
