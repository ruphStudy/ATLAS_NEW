import { apiClient } from '@/lib/api/axios';
import type {
  CapacitySnapshot,
  CreateWarehouseBinPayload,
  CreateWarehouseLocationPayload,
  CreateWarehouseZonePayload,
  WarehouseBin,
  WarehouseLocation,
  WarehouseZone,
} from '@/types';

function lifecycleActions<T>(base: string) {
  return {
    activate: async (id: string, reason?: string): Promise<T> => (await apiClient.post<T>(`${base}/${id}/activate`, { reason })).data,
    deactivate: async (id: string, reason?: string): Promise<T> => (await apiClient.post<T>(`${base}/${id}/deactivate`, { reason })).data,
    block: async (id: string, reason?: string): Promise<T> => (await apiClient.post<T>(`${base}/${id}/block`, { reason })).data,
    archive: async (id: string, reason?: string): Promise<T> => (await apiClient.post<T>(`${base}/${id}/archive`, { reason })).data,
    restore: async (id: string, reason?: string): Promise<T> => (await apiClient.post<T>(`${base}/${id}/restore`, { reason })).data,
    remove: async (id: string): Promise<void> => { await apiClient.delete(`${base}/${id}`); },
  };
}

// ── Zones ────────────────────────────────────────────────────────────
export async function listWarehouseZones(warehouseId: string, params: { page?: number; limit?: number; status?: string } = {}): Promise<WarehouseZone[] | { items: WarehouseZone[] }> {
  const { data } = await apiClient.get(`/warehouses/${warehouseId}/zones`, { params });
  return data;
}

export async function createWarehouseZone(warehouseId: string, payload: CreateWarehouseZonePayload): Promise<WarehouseZone> {
  const { data } = await apiClient.post<WarehouseZone>(`/warehouses/${warehouseId}/zones`, payload);
  return data;
}

export function warehouseZoneActions(warehouseId: string) {
  return lifecycleActions<WarehouseZone>(`/warehouses/${warehouseId}/zones`);
}

// ── Locations ────────────────────────────────────────────────────────
export async function listWarehouseLocations(warehouseId: string, params: { page?: number; limit?: number; type?: string; status?: string } = {}): Promise<WarehouseLocation[] | { items: WarehouseLocation[] }> {
  const { data } = await apiClient.get(`/warehouses/${warehouseId}/locations`, { params });
  return data;
}

export async function createWarehouseLocation(warehouseId: string, payload: CreateWarehouseLocationPayload): Promise<WarehouseLocation> {
  const { data } = await apiClient.post<WarehouseLocation>(`/warehouses/${warehouseId}/locations`, payload);
  return data;
}

export function warehouseLocationActions(warehouseId: string) {
  return lifecycleActions<WarehouseLocation>(`/warehouses/${warehouseId}/locations`);
}

// ── Bins ─────────────────────────────────────────────────────────────
export async function listWarehouseBins(warehouseId: string, params: { page?: number; limit?: number; type?: string; status?: string; locationId?: string } = {}): Promise<WarehouseBin[] | { items: WarehouseBin[] }> {
  const { data } = await apiClient.get(`/warehouses/${warehouseId}/bins`, { params });
  return data;
}

export async function createWarehouseBin(warehouseId: string, payload: CreateWarehouseBinPayload): Promise<WarehouseBin> {
  const { data } = await apiClient.post<WarehouseBin>(`/warehouses/${warehouseId}/bins`, payload);
  return data;
}

export function warehouseBinActions(warehouseId: string) {
  return lifecycleActions<WarehouseBin>(`/warehouses/${warehouseId}/bins`);
}

// ── Capacity ─────────────────────────────────────────────────────────
export async function getWarehouseCapacity(warehouseId: string): Promise<CapacitySnapshot> {
  const { data } = await apiClient.get<CapacitySnapshot>(`/warehouses/${warehouseId}/capacity`);
  return data;
}

export async function recalculateWarehouseCapacity(warehouseId: string): Promise<CapacitySnapshot> {
  const { data } = await apiClient.post<CapacitySnapshot>(`/warehouses/${warehouseId}/capacity/recalculate`, {});
  return data;
}
