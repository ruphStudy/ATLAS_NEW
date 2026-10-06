import { apiClient } from '@/lib/api/axios';
import type { CreateDispatchPayload, DispatchException, DispatchFilterParams, DispatchListResult, DispatchTask, DispatchTaskPackage, RecordExceptionPayload } from '@/types';

const BASE = '/dispatch';

export async function listDispatchTasks(params: DispatchFilterParams = {}): Promise<DispatchListResult> {
  const { data } = await apiClient.get<DispatchListResult>(BASE, { params });
  return data;
}

export async function getDispatchTaskById(id: string): Promise<DispatchTask> {
  const { data } = await apiClient.get<DispatchTask>(`${BASE}/${id}`);
  return data;
}

export async function createDispatchTask(payload: CreateDispatchPayload): Promise<DispatchTask> {
  const { data } = await apiClient.post<DispatchTask>(BASE, payload);
  return data;
}

export async function generateDispatchFromPacking(packingTaskId: string, warehouseId: string): Promise<DispatchTask> {
  const { data } = await apiClient.post<DispatchTask>(`${BASE}/generate-from-packing`, { packingTaskId, warehouseId });
  return data;
}

export async function getDispatchPackages(id: string): Promise<DispatchTaskPackage[]> {
  const { data } = await apiClient.get<DispatchTaskPackage[]>(`${BASE}/${id}/packages`);
  return data;
}

export async function getDispatchExceptions(id: string): Promise<DispatchException[]> {
  const { data } = await apiClient.get<DispatchException[]>(`${BASE}/${id}/exceptions`);
  return data;
}

export async function assignDispatchTask(id: string, assignedTo: string): Promise<DispatchTask> {
  const { data } = await apiClient.post<DispatchTask>(`${BASE}/${id}/assign`, { assignedTo });
  return data;
}

export async function startDispatchTask(id: string): Promise<DispatchTask> {
  const { data } = await apiClient.post<DispatchTask>(`${BASE}/${id}/start`, {});
  return data;
}

export async function executeDispatchPackage(id: string, packageId: string): Promise<DispatchTask> {
  const { data } = await apiClient.post<DispatchTask>(`${BASE}/${id}/execute`, { packageId });
  return data;
}

export async function updateDispatchTask(id: string, payload: { carrierName?: string; serviceType?: string; pickupReference?: string; dispatchReference?: string }): Promise<DispatchTask> {
  const { data } = await apiClient.patch<DispatchTask>(`${BASE}/${id}`, payload);
  return data;
}

export async function completeDispatchTask(id: string): Promise<DispatchTask> {
  const { data } = await apiClient.post<DispatchTask>(`${BASE}/${id}/complete`, {});
  return data;
}

export async function cancelDispatchTask(id: string, reason: string): Promise<DispatchTask> {
  const { data } = await apiClient.post<DispatchTask>(`${BASE}/${id}/cancel`, { reason });
  return data;
}

export async function reopenDispatchTask(id: string, reason?: string): Promise<DispatchTask> {
  const { data } = await apiClient.post<DispatchTask>(`${BASE}/${id}/reopen`, { reason });
  return data;
}

export async function recordDispatchException(id: string, payload: RecordExceptionPayload): Promise<DispatchException> {
  const { data } = await apiClient.post<DispatchException>(`${BASE}/${id}/record-exception`, payload);
  return data;
}

export async function scanDispatchBarcode(id: string, barcode: string): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post<{ success: boolean; message: string }>(`${BASE}/${id}/scan-barcode`, { barcode });
  return data;
}
