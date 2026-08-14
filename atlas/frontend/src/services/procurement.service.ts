import { apiClient } from '@/lib/api/axios';
import type {
  CreateProcurementPayload,
  Procurement,
  ProcurementFilterParams,
  ProcurementHistoryEntry,
  ProcurementListResult,
  UpdateProcurementPayload,
} from '@/types';

const BASE = '/procurement';

export async function listProcurements(params: ProcurementFilterParams = {}): Promise<ProcurementListResult> {
  const { data } = await apiClient.get<ProcurementListResult>(BASE, { params });
  return data;
}

export async function getProcurementById(id: string): Promise<Procurement> {
  const { data } = await apiClient.get<Procurement>(`${BASE}/${id}`);
  return data;
}

export async function createProcurement(payload: CreateProcurementPayload): Promise<Procurement> {
  const { data } = await apiClient.post<Procurement>(BASE, payload);
  return data;
}

export async function updateProcurement(id: string, payload: UpdateProcurementPayload): Promise<Procurement> {
  const { data } = await apiClient.patch<Procurement>(`${BASE}/${id}`, payload);
  return data;
}

export async function submitProcurementForApproval(id: string): Promise<Procurement> {
  const { data } = await apiClient.post<Procurement>(`${BASE}/${id}/submit`);
  return data;
}

export async function approveProcurement(id: string, notes?: string): Promise<Procurement> {
  const { data } = await apiClient.post<Procurement>(`${BASE}/${id}/approve`, { notes });
  return data;
}

export async function markProcurementOrdered(id: string): Promise<Procurement> {
  const { data } = await apiClient.post<Procurement>(`${BASE}/${id}/order`);
  return data;
}

export async function markProcurementInProgress(id: string): Promise<Procurement> {
  const { data } = await apiClient.post<Procurement>(`${BASE}/${id}/in-progress`);
  return data;
}

export async function markProcurementPartiallyReceived(id: string): Promise<Procurement> {
  const { data } = await apiClient.post<Procurement>(`${BASE}/${id}/partially-received`);
  return data;
}

export async function completeProcurement(id: string): Promise<Procurement> {
  const { data } = await apiClient.post<Procurement>(`${BASE}/${id}/complete`);
  return data;
}

export async function cancelProcurement(id: string, reason: string): Promise<Procurement> {
  const { data } = await apiClient.post<Procurement>(`${BASE}/${id}/cancel`, { reason });
  return data;
}

export async function getProcurementHistory(id: string): Promise<ProcurementHistoryEntry[]> {
  const { data } = await apiClient.get<ProcurementHistoryEntry[]>(`${BASE}/${id}/history`);
  return data;
}

export async function deleteProcurement(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function getProcurementStats(): Promise<Record<string, number>> {
  const { data } = await apiClient.get<Record<string, number>>(`${BASE}/stats`);
  return data;
}
