import { apiClient } from '@/lib/api/axios';
import type { CreateCycleCountPayload, InventoryCycleCount, InventoryCycleCountFilterParams, InventoryCycleCountLine, InventoryCycleCountListResult } from '@/types';

const BASE = '/inventory/cycle-counts';

export async function listCycleCounts(params: InventoryCycleCountFilterParams = {}): Promise<InventoryCycleCountListResult> {
  const { data } = await apiClient.get<InventoryCycleCountListResult>(BASE, { params });
  return data;
}

export async function getCycleCountById(id: string): Promise<InventoryCycleCount> {
  const { data } = await apiClient.get<InventoryCycleCount>(`${BASE}/${id}`);
  return data;
}

export async function createCycleCount(payload: CreateCycleCountPayload): Promise<InventoryCycleCount> {
  const { data } = await apiClient.post<InventoryCycleCount>(BASE, payload);
  return data;
}

export async function getCycleCountHistory(id: string): Promise<Record<string, unknown>[]> {
  const { data } = await apiClient.get<Record<string, unknown>[]>(`${BASE}/${id}/history`);
  return data;
}

export async function listCycleCountLines(id: string, params: { page?: number; limit?: number; lineStatus?: string } = {}): Promise<InventoryCycleCountLine[] | { items: InventoryCycleCountLine[] }> {
  const { data } = await apiClient.get(`${BASE}/${id}/lines`, { params });
  return data;
}

export async function scheduleCycleCount(id: string, scheduledAt: string): Promise<InventoryCycleCount> {
  const { data } = await apiClient.post<InventoryCycleCount>(`${BASE}/${id}/schedule`, { scheduledAt });
  return data;
}

export async function assignCycleCount(id: string, assignedTo: string): Promise<InventoryCycleCount> {
  const { data } = await apiClient.post<InventoryCycleCount>(`${BASE}/${id}/assign`, { assignedTo });
  return data;
}

export async function startCycleCount(id: string): Promise<InventoryCycleCount> {
  const { data } = await apiClient.post<InventoryCycleCount>(`${BASE}/${id}/start`, {});
  return data;
}

export async function pauseCycleCount(id: string, reason?: string): Promise<InventoryCycleCount> {
  const { data } = await apiClient.post<InventoryCycleCount>(`${BASE}/${id}/pause`, { reason });
  return data;
}

export async function completeCycleCount(id: string): Promise<InventoryCycleCount> {
  const { data } = await apiClient.post<InventoryCycleCount>(`${BASE}/${id}/complete`, {});
  return data;
}

export async function approveCycleCount(id: string, notes?: string): Promise<InventoryCycleCount> {
  const { data } = await apiClient.post<InventoryCycleCount>(`${BASE}/${id}/approve`, { notes });
  return data;
}

export async function rejectCycleCount(id: string, reason: string): Promise<InventoryCycleCount> {
  const { data } = await apiClient.post<InventoryCycleCount>(`${BASE}/${id}/reject`, { reason });
  return data;
}

export async function cancelCycleCount(id: string, reason?: string): Promise<InventoryCycleCount> {
  const { data } = await apiClient.post<InventoryCycleCount>(`${BASE}/${id}/cancel`, { reason });
  return data;
}

export async function submitCycleCountLine(id: string, lineId: string, countedQuantity: number, notes?: string): Promise<InventoryCycleCountLine> {
  const { data } = await apiClient.post<InventoryCycleCountLine>(`${BASE}/${id}/lines/${lineId}/count`, { countedQuantity, notes });
  return data;
}

export async function flagRecount(id: string, lineId: string, reason?: string): Promise<InventoryCycleCountLine> {
  const { data } = await apiClient.post<InventoryCycleCountLine>(`${BASE}/${id}/lines/${lineId}/flag-recount`, { reason });
  return data;
}
