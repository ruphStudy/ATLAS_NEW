import { apiClient } from '@/lib/api/axios';
import type { CreatePutawayPayload, PutawayFilterParams, PutawayListResult, PutawayTask } from '@/types';

const BASE = '/putaway';

export async function listPutawayTasks(params: PutawayFilterParams = {}): Promise<PutawayListResult> {
  const { data } = await apiClient.get<PutawayListResult>(BASE, { params });
  return data;
}

export async function getPutawayTaskById(id: string): Promise<PutawayTask> {
  const { data } = await apiClient.get<PutawayTask>(`${BASE}/${id}`);
  return data;
}

export async function createPutawayTask(payload: CreatePutawayPayload): Promise<PutawayTask> {
  const { data } = await apiClient.post<PutawayTask>(BASE, payload);
  return data;
}

export async function generatePutawayFromReceiving(receivingId: string, warehouseId: string): Promise<PutawayTask> {
  const { data } = await apiClient.post<PutawayTask>(`${BASE}/generate-from-receiving`, { receivingId, warehouseId });
  return data;
}

export async function assignPutawayTask(id: string, assignedTo: string): Promise<PutawayTask> {
  const { data } = await apiClient.post<PutawayTask>(`${BASE}/${id}/assign`, { assignedTo });
  return data;
}

export async function startPutawayTask(id: string): Promise<PutawayTask> {
  const { data } = await apiClient.post<PutawayTask>(`${BASE}/${id}/start`, {});
  return data;
}

export async function executePutawayLine(id: string, lineId: string, putawayQuantity: number, destinationBinId?: string, destinationLocationId?: string): Promise<PutawayTask> {
  const { data } = await apiClient.post<PutawayTask>(`${BASE}/${id}/execute`, { lineId, putawayQuantity, destinationBinId, destinationLocationId });
  return data;
}

export async function completePutawayTask(id: string): Promise<PutawayTask> {
  const { data } = await apiClient.post<PutawayTask>(`${BASE}/${id}/complete`, {});
  return data;
}

export async function cancelPutawayTask(id: string, reason: string): Promise<PutawayTask> {
  const { data } = await apiClient.post<PutawayTask>(`${BASE}/${id}/cancel`, { reason });
  return data;
}

export async function reassignPutawayTask(id: string, assignedTo: string): Promise<PutawayTask> {
  const { data } = await apiClient.post<PutawayTask>(`${BASE}/${id}/reassign`, { assignedTo });
  return data;
}

export async function scanPutawayLocation(id: string, barcode: string): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post<{ success: boolean; message: string }>(`${BASE}/${id}/scan-location`, { barcode });
  return data;
}
