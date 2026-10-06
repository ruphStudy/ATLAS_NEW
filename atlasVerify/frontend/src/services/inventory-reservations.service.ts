import { apiClient } from '@/lib/api/axios';
import type { CreateReservationPayload, InventoryReservation, InventoryReservationFilterParams, InventoryReservationListResult } from '@/types';

const BASE = '/inventory/reservations';

export async function listReservations(params: InventoryReservationFilterParams = {}): Promise<InventoryReservationListResult> {
  const { data } = await apiClient.get<InventoryReservationListResult>(BASE, { params });
  return data;
}

export async function getReservationById(id: string): Promise<InventoryReservation> {
  const { data } = await apiClient.get<InventoryReservation>(`${BASE}/${id}`);
  return data;
}

export async function createReservation(payload: CreateReservationPayload): Promise<InventoryReservation> {
  const { data } = await apiClient.post<InventoryReservation>(BASE, payload);
  return data;
}

export async function getReservationHistory(id: string): Promise<Record<string, unknown>[]> {
  const { data } = await apiClient.get<Record<string, unknown>[]>(`${BASE}/${id}/history`);
  return data;
}

export async function confirmReservation(id: string, notes?: string): Promise<InventoryReservation> {
  const { data } = await apiClient.post<InventoryReservation>(`${BASE}/${id}/confirm`, { notes });
  return data;
}

export async function releaseReservation(id: string, quantity?: number, reason?: string): Promise<InventoryReservation> {
  const { data } = await apiClient.post<InventoryReservation>(`${BASE}/${id}/release`, { quantity, reason });
  return data;
}

export async function cancelReservation(id: string, reason?: string): Promise<InventoryReservation> {
  const { data } = await apiClient.post<InventoryReservation>(`${BASE}/${id}/cancel`, { reason });
  return data;
}
