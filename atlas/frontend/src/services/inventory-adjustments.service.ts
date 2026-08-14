import { apiClient } from '@/lib/api/axios';
import type {
  CreateAdjustmentPayload,
  InventoryAdjustment,
  InventoryAdjustmentFilterParams,
  InventoryAdjustmentHistoryEntry,
  InventoryAdjustmentListResult,
} from '@/types';

const BASE = '/inventory/adjustments';

export async function listAdjustments(params: InventoryAdjustmentFilterParams = {}): Promise<InventoryAdjustmentListResult> {
  const { data } = await apiClient.get<InventoryAdjustmentListResult>(BASE, { params });
  return data;
}

export async function getAdjustmentById(id: string): Promise<InventoryAdjustment> {
  const { data } = await apiClient.get<InventoryAdjustment>(`${BASE}/${id}`);
  return data;
}

export async function createAdjustment(payload: CreateAdjustmentPayload): Promise<InventoryAdjustment> {
  const { data } = await apiClient.post<InventoryAdjustment>(BASE, payload);
  return data;
}

export async function getAdjustmentHistory(id: string): Promise<InventoryAdjustmentHistoryEntry[]> {
  const { data } = await apiClient.get<InventoryAdjustmentHistoryEntry[]>(`${BASE}/${id}/history`);
  return data;
}

export async function approveAdjustment(id: string, notes?: string): Promise<InventoryAdjustment> {
  const { data } = await apiClient.post<InventoryAdjustment>(`${BASE}/${id}/approve`, { notes });
  return data;
}

export async function rejectAdjustment(id: string, reason: string): Promise<InventoryAdjustment> {
  const { data } = await apiClient.post<InventoryAdjustment>(`${BASE}/${id}/reject`, { reason });
  return data;
}

export async function postAdjustment(id: string, notes?: string): Promise<InventoryAdjustment> {
  const { data } = await apiClient.post<InventoryAdjustment>(`${BASE}/${id}/post`, { notes });
  return data;
}

export async function cancelAdjustment(id: string, reason?: string): Promise<InventoryAdjustment> {
  const { data } = await apiClient.post<InventoryAdjustment>(`${BASE}/${id}/cancel`, { reason });
  return data;
}

export async function reverseAdjustment(id: string, reason: string): Promise<InventoryAdjustment> {
  const { data } = await apiClient.post<InventoryAdjustment>(`${BASE}/${id}/reverse`, { reason });
  return data;
}
