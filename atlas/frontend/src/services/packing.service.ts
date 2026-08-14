import { apiClient } from '@/lib/api/axios';
import type { CreatePackagePayload, CreatePackingPayload, PackingException, PackingFilterParams, PackingListResult, PackingTask, PackingTaskPackage, RecordExceptionPayload } from '@/types';

const BASE = '/packing';

export async function listPackingTasks(params: PackingFilterParams = {}): Promise<PackingListResult> {
  const { data } = await apiClient.get<PackingListResult>(BASE, { params });
  return data;
}

export async function getPackingTaskById(id: string): Promise<PackingTask> {
  const { data } = await apiClient.get<PackingTask>(`${BASE}/${id}`);
  return data;
}

export async function createPackingTask(payload: CreatePackingPayload): Promise<PackingTask> {
  const { data } = await apiClient.post<PackingTask>(BASE, payload);
  return data;
}

export async function generatePackingFromPicking(pickingTaskId: string, warehouseId: string): Promise<PackingTask> {
  const { data } = await apiClient.post<PackingTask>(`${BASE}/generate-from-picking`, { pickingTaskId, warehouseId });
  return data;
}

export async function getPackingTaskPackages(id: string): Promise<PackingTaskPackage[]> {
  const { data } = await apiClient.get<PackingTaskPackage[]>(`${BASE}/${id}/packages`);
  return data;
}

export async function getPackingExceptions(id: string): Promise<PackingException[]> {
  const { data } = await apiClient.get<PackingException[]>(`${BASE}/${id}/exceptions`);
  return data;
}

export async function assignPackingTask(id: string, assignedTo: string): Promise<PackingTask> {
  const { data } = await apiClient.post<PackingTask>(`${BASE}/${id}/assign`, { assignedTo });
  return data;
}

export async function startPackingTask(id: string): Promise<PackingTask> {
  const { data } = await apiClient.post<PackingTask>(`${BASE}/${id}/start`, {});
  return data;
}

export async function pausePackingTask(id: string, reason?: string): Promise<PackingTask> {
  const { data } = await apiClient.post<PackingTask>(`${BASE}/${id}/pause`, { reason });
  return data;
}

export async function resumePackingTask(id: string): Promise<PackingTask> {
  const { data } = await apiClient.post<PackingTask>(`${BASE}/${id}/resume`, {});
  return data;
}

export async function executePackingLine(id: string, lineId: string, packedQuantity: number, packageId?: string): Promise<PackingTask> {
  const { data } = await apiClient.post<PackingTask>(`${BASE}/${id}/execute`, { lineId, packedQuantity, packageId });
  return data;
}

export async function createPackingPackage(id: string, payload: CreatePackagePayload): Promise<PackingTaskPackage> {
  const { data } = await apiClient.post<PackingTaskPackage>(`${BASE}/${id}/packages`, payload);
  return data;
}

export async function updatePackingPackage(id: string, packageId: string, payload: Partial<CreatePackagePayload>): Promise<PackingTaskPackage> {
  const { data } = await apiClient.put<PackingTaskPackage>(`${BASE}/${id}/packages/${packageId}`, payload);
  return data;
}

export async function completePackingTask(id: string): Promise<PackingTask> {
  const { data } = await apiClient.post<PackingTask>(`${BASE}/${id}/complete`, {});
  return data;
}

export async function cancelPackingTask(id: string, reason: string): Promise<PackingTask> {
  const { data } = await apiClient.post<PackingTask>(`${BASE}/${id}/cancel`, { reason });
  return data;
}

export async function reopenPackingTask(id: string, reason?: string): Promise<PackingTask> {
  const { data } = await apiClient.post<PackingTask>(`${BASE}/${id}/reopen`, { reason });
  return data;
}

export async function recordPackingException(id: string, payload: RecordExceptionPayload): Promise<PackingException> {
  const { data } = await apiClient.post<PackingException>(`${BASE}/${id}/record-exception`, payload);
  return data;
}

export async function scanPackingBarcode(id: string, barcode: string): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post<{ success: boolean; message: string }>(`${BASE}/${id}/scan-barcode`, { barcode });
  return data;
}
