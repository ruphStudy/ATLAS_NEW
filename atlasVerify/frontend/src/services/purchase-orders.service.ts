import { apiClient } from '@/lib/api/axios';
import type {
  CreatePurchaseOrderPayload,
  PurchaseOrder,
  PurchaseOrderFilterParams,
  PurchaseOrderHistoryEntry,
  PurchaseOrderListResult,
  UpdatePurchaseOrderPayload,
} from '@/types';

const BASE = '/purchase-orders';

export async function listPurchaseOrders(params: PurchaseOrderFilterParams = {}): Promise<PurchaseOrderListResult> {
  const { data } = await apiClient.get<PurchaseOrderListResult>(BASE, { params });
  return data;
}

export async function getPurchaseOrderById(id: string): Promise<PurchaseOrder> {
  const { data } = await apiClient.get<PurchaseOrder>(`${BASE}/${id}`);
  return data;
}

export async function createPurchaseOrder(payload: CreatePurchaseOrderPayload): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<PurchaseOrder>(BASE, payload);
  return data;
}

export async function updatePurchaseOrder(id: string, payload: UpdatePurchaseOrderPayload): Promise<PurchaseOrder> {
  const { data } = await apiClient.patch<PurchaseOrder>(`${BASE}/${id}`, payload);
  return data;
}

export async function submitPurchaseOrderForApproval(id: string): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<PurchaseOrder>(`${BASE}/${id}/submit`);
  return data;
}

export async function approvePurchaseOrder(id: string, notes?: string): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<PurchaseOrder>(`${BASE}/${id}/approve`, { notes });
  return data;
}

export async function issuePurchaseOrder(id: string): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<PurchaseOrder>(`${BASE}/${id}/issue`);
  return data;
}

export async function acknowledgePurchaseOrder(id: string, notes?: string): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<PurchaseOrder>(`${BASE}/${id}/acknowledge`, { notes });
  return data;
}

export async function markPurchaseOrderPartiallyFulfilled(id: string): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<PurchaseOrder>(`${BASE}/${id}/partially-fulfilled`);
  return data;
}

export async function markPurchaseOrderFulfilled(id: string): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<PurchaseOrder>(`${BASE}/${id}/fulfill`);
  return data;
}

export async function closePurchaseOrder(id: string): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<PurchaseOrder>(`${BASE}/${id}/close`);
  return data;
}

export async function cancelPurchaseOrder(id: string, reason: string): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<PurchaseOrder>(`${BASE}/${id}/cancel`, { reason });
  return data;
}

export async function getPurchaseOrderHistory(id: string): Promise<PurchaseOrderHistoryEntry[]> {
  const { data } = await apiClient.get<PurchaseOrderHistoryEntry[]>(`${BASE}/${id}/history`);
  return data;
}

export async function exportPurchaseOrder(id: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get<Record<string, unknown>>(`${BASE}/${id}/export`);
  return data;
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function getPurchaseOrderStats(): Promise<Record<string, number>> {
  const { data } = await apiClient.get<Record<string, number>>(`${BASE}/stats`);
  return data;
}
