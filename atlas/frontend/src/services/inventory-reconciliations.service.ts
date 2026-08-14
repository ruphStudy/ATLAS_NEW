import { apiClient } from '@/lib/api/axios';
import type {
  CreateReconciliationRunPayload,
  InventoryReconciliationFilterParams,
  InventoryReconciliationLine,
  InventoryReconciliationListResult,
  InventoryReconciliationRun,
} from '@/types';

const BASE = '/inventory/reconciliations';

export async function listReconciliationRuns(params: InventoryReconciliationFilterParams = {}): Promise<InventoryReconciliationListResult> {
  const { data } = await apiClient.get<InventoryReconciliationListResult>(BASE, { params });
  return data;
}

export async function getReconciliationRunById(id: string): Promise<InventoryReconciliationRun> {
  const { data } = await apiClient.get<InventoryReconciliationRun>(`${BASE}/${id}`);
  return data;
}

export async function createReconciliationRun(payload: CreateReconciliationRunPayload): Promise<InventoryReconciliationRun> {
  const { data } = await apiClient.post<InventoryReconciliationRun>(BASE, payload);
  return data;
}

export async function getReconciliationRunHistory(id: string): Promise<Record<string, unknown>[]> {
  const { data } = await apiClient.get<Record<string, unknown>[]>(`${BASE}/${id}/history`);
  return data;
}

export async function listReconciliationLines(runId: string, params: { page?: number; limit?: number; classification?: string; findingStatus?: string } = {}): Promise<InventoryReconciliationLine[] | { items: InventoryReconciliationLine[] }> {
  const { data } = await apiClient.get(`${BASE}/${runId}/lines`, { params });
  return data;
}

export async function cancelReconciliationRun(id: string, reason?: string): Promise<InventoryReconciliationRun> {
  const { data } = await apiClient.post<InventoryReconciliationRun>(`${BASE}/${id}/cancel`, { reason });
  return data;
}

export async function getReconciliationLineById(lineId: string): Promise<InventoryReconciliationLine> {
  const { data } = await apiClient.get<InventoryReconciliationLine>(`${BASE}/lines/${lineId}`);
  return data;
}

export async function approveReconciliationLine(lineId: string, notes?: string): Promise<InventoryReconciliationLine> {
  const { data } = await apiClient.post<InventoryReconciliationLine>(`${BASE}/lines/${lineId}/approve`, { notes });
  return data;
}

export async function rejectReconciliationLine(lineId: string, reason: string): Promise<InventoryReconciliationLine> {
  const { data } = await apiClient.post<InventoryReconciliationLine>(`${BASE}/lines/${lineId}/reject`, { reason });
  return data;
}

export async function ignoreReconciliationLine(lineId: string, reason?: string): Promise<InventoryReconciliationLine> {
  const { data } = await apiClient.post<InventoryReconciliationLine>(`${BASE}/lines/${lineId}/ignore`, { reason });
  return data;
}

export async function resolveReconciliationLine(lineId: string, notes?: string): Promise<InventoryReconciliationLine> {
  const { data } = await apiClient.post<InventoryReconciliationLine>(`${BASE}/lines/${lineId}/resolve`, { notes });
  return data;
}

export async function reopenReconciliationLine(lineId: string, reason?: string): Promise<InventoryReconciliationLine> {
  const { data } = await apiClient.post<InventoryReconciliationLine>(`${BASE}/lines/${lineId}/reopen`, { reason });
  return data;
}
