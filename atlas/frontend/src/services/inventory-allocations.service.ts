import { apiClient } from '@/lib/api/axios';
import type { AllocateInventoryPayload, InventoryAllocation, InventoryAllocationFilterParams, InventoryAllocationListResult } from '@/types';

const BASE = '/inventory/allocations';

export async function listAllocations(params: InventoryAllocationFilterParams = {}): Promise<InventoryAllocationListResult> {
  const { data } = await apiClient.get<InventoryAllocationListResult>(BASE, { params });
  return data;
}

export async function getAllocationById(id: string): Promise<InventoryAllocation> {
  const { data } = await apiClient.get<InventoryAllocation>(`${BASE}/${id}`);
  return data;
}

export async function allocateInventory(payload: AllocateInventoryPayload): Promise<InventoryAllocation> {
  const { data } = await apiClient.post<InventoryAllocation>(BASE, payload);
  return data;
}

export async function getAllocationHistory(id: string): Promise<Record<string, unknown>[]> {
  const { data } = await apiClient.get<Record<string, unknown>[]>(`${BASE}/${id}/history`);
  return data;
}

export async function reallocateInventory(id: string, reason?: string): Promise<InventoryAllocation> {
  const { data } = await apiClient.post<InventoryAllocation>(`${BASE}/${id}/reallocate`, { reason });
  return data;
}

export async function releaseAllocation(id: string, quantity?: number, reason?: string): Promise<InventoryAllocation> {
  const { data } = await apiClient.post<InventoryAllocation>(`${BASE}/${id}/release`, { quantity, reason });
  return data;
}

export async function cancelAllocation(id: string, reason?: string): Promise<InventoryAllocation> {
  const { data } = await apiClient.post<InventoryAllocation>(`${BASE}/${id}/cancel`, { reason });
  return data;
}
