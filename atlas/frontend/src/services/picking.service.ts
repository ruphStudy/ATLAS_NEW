import { apiClient } from '@/lib/api/axios';
import type { CreatePickingPayload, PickingException, PickingFilterParams, PickingListResult, PickingTask, RecordExceptionPayload } from '@/types';

const BASE = '/picking';

export async function listPickingTasks(params: PickingFilterParams = {}): Promise<PickingListResult> {
  const { data } = await apiClient.get<PickingListResult>(BASE, { params });
  return data;
}

export async function getPickingTaskById(id: string): Promise<PickingTask> {
  const { data } = await apiClient.get<PickingTask>(`${BASE}/${id}`);
  return data;
}

export async function createPickingTask(payload: CreatePickingPayload): Promise<PickingTask> {
  const { data } = await apiClient.post<PickingTask>(BASE, payload);
  return data;
}

export async function generatePickingFromOrder(orderId: string, warehouseId: string): Promise<PickingTask> {
  const { data } = await apiClient.post<PickingTask>(`${BASE}/generate-from-order`, { orderId, warehouseId });
  return data;
}

export async function generatePickingFromTransfer(transferId: string, warehouseId: string): Promise<PickingTask> {
  const { data } = await apiClient.post<PickingTask>(`${BASE}/generate-from-transfer`, { transferId, warehouseId });
  return data;
}

export async function getPickingExceptions(id: string): Promise<PickingException[]> {
  const { data } = await apiClient.get<PickingException[]>(`${BASE}/${id}/exceptions`);
  return data;
}

export async function assignPickingTask(id: string, assignedTo: string): Promise<PickingTask> {
  const { data } = await apiClient.post<PickingTask>(`${BASE}/${id}/assign`, { assignedTo });
  return data;
}

export async function releasePickingTask(id: string): Promise<PickingTask> {
  const { data } = await apiClient.post<PickingTask>(`${BASE}/${id}/release`, {});
  return data;
}

export async function startPickingTask(id: string): Promise<PickingTask> {
  const { data } = await apiClient.post<PickingTask>(`${BASE}/${id}/start`, {});
  return data;
}

export async function pausePickingTask(id: string, reason?: string): Promise<PickingTask> {
  const { data } = await apiClient.post<PickingTask>(`${BASE}/${id}/pause`, { reason });
  return data;
}

export async function resumePickingTask(id: string): Promise<PickingTask> {
  const { data } = await apiClient.post<PickingTask>(`${BASE}/${id}/resume`, {});
  return data;
}

export async function executePickingLine(id: string, lineId: string, pickedQuantity: number): Promise<PickingTask> {
  const { data } = await apiClient.post<PickingTask>(`${BASE}/${id}/execute`, { lineId, pickedQuantity });
  return data;
}

export async function completePickingTask(id: string): Promise<PickingTask> {
  const { data } = await apiClient.post<PickingTask>(`${BASE}/${id}/complete`, {});
  return data;
}

export async function cancelPickingTask(id: string, reason: string): Promise<PickingTask> {
  const { data } = await apiClient.post<PickingTask>(`${BASE}/${id}/cancel`, { reason });
  return data;
}

export async function reassignPickingTask(id: string, assignedTo: string): Promise<PickingTask> {
  const { data } = await apiClient.post<PickingTask>(`${BASE}/${id}/reassign`, { assignedTo });
  return data;
}

export async function recordPickingException(id: string, payload: RecordExceptionPayload): Promise<PickingException> {
  const { data } = await apiClient.post<PickingException>(`${BASE}/${id}/record-exception`, payload);
  return data;
}

export async function scanPickingBarcode(id: string, barcode: string): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post<{ success: boolean; message: string }>(`${BASE}/${id}/scan-barcode`, { barcode });
  return data;
}
