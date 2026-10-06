import { apiClient } from '@/lib/api/axios';
import type { CreateMovementPayload, InventoryMovement, InventoryMovementFilterParams, InventoryMovementListResult } from '@/types';

const BASE = '/inventory/movements';

export async function listMovements(params: InventoryMovementFilterParams = {}): Promise<InventoryMovementListResult> {
  const { data } = await apiClient.get<InventoryMovementListResult>(BASE, { params });
  return data;
}

export async function getMovementById(id: string): Promise<InventoryMovement> {
  const { data } = await apiClient.get<InventoryMovement>(`${BASE}/${id}`);
  return data;
}

export async function createMovement(payload: CreateMovementPayload): Promise<InventoryMovement> {
  const { data } = await apiClient.post<InventoryMovement>(BASE, payload);
  return data;
}

export async function getMovementHistory(id: string): Promise<Record<string, unknown>[]> {
  const { data } = await apiClient.get<Record<string, unknown>[]>(`${BASE}/${id}/history`);
  return data;
}

export async function approveMovement(id: string, notes?: string): Promise<InventoryMovement> {
  const { data } = await apiClient.post<InventoryMovement>(`${BASE}/${id}/approve`, { notes });
  return data;
}

export async function executeMovement(id: string, notes?: string): Promise<InventoryMovement> {
  const { data } = await apiClient.post<InventoryMovement>(`${BASE}/${id}/execute`, { notes });
  return data;
}

export async function cancelMovement(id: string, reason?: string): Promise<InventoryMovement> {
  const { data } = await apiClient.post<InventoryMovement>(`${BASE}/${id}/cancel`, { reason });
  return data;
}

export async function reverseMovement(id: string, reason: string): Promise<InventoryMovement> {
  const { data } = await apiClient.post<InventoryMovement>(`${BASE}/${id}/reverse`, { reason });
  return data;
}
