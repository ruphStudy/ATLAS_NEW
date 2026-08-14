import { apiClient } from '@/lib/api/axios';
import type {
  CreateShipmentPayload,
  Shipment,
  ShipmentFilterParams,
  ShipmentListResult,
  ShipmentTrackingHistoryEntry,
  UpdateShipmentPayload,
  UpdateTrackingPayload,
} from '@/types';

const BASE = '/shipments';

export async function listShipments(params: ShipmentFilterParams = {}): Promise<ShipmentListResult> {
  const { data } = await apiClient.get<ShipmentListResult>(BASE, { params });
  return data;
}

export async function getShipmentById(id: string): Promise<Shipment> {
  const { data } = await apiClient.get<Shipment>(`${BASE}/${id}`);
  return data;
}

export async function createShipment(payload: CreateShipmentPayload): Promise<Shipment> {
  const { data } = await apiClient.post<Shipment>(BASE, payload);
  return data;
}

export async function updateShipment(id: string, payload: UpdateShipmentPayload): Promise<Shipment> {
  const { data } = await apiClient.patch<Shipment>(`${BASE}/${id}`, payload);
  return data;
}

export async function dispatchShipment(id: string, payload: { trackingNumber?: string; carrier?: string; dispatchDate?: string; notes?: string } = {}): Promise<Shipment> {
  const { data } = await apiClient.post<Shipment>(`${BASE}/${id}/dispatch`, payload);
  return data;
}

export async function updateShipmentTracking(id: string, payload: UpdateTrackingPayload): Promise<Shipment> {
  const { data } = await apiClient.post<Shipment>(`${BASE}/${id}/tracking`, payload);
  return data;
}

export async function deliverShipment(id: string, payload: { actualDeliveryDate?: string; notes?: string } = {}): Promise<Shipment> {
  const { data } = await apiClient.post<Shipment>(`${BASE}/${id}/deliver`, payload);
  return data;
}

export async function cancelShipment(id: string, reason: string): Promise<Shipment> {
  const { data } = await apiClient.post<Shipment>(`${BASE}/${id}/cancel`, { reason });
  return data;
}

export async function getShipmentTrackingHistory(id: string): Promise<ShipmentTrackingHistoryEntry[]> {
  const { data } = await apiClient.get<ShipmentTrackingHistoryEntry[]>(`${BASE}/${id}/tracking-history`);
  return data;
}

export async function scheduleTrackingSync(): Promise<{ queued: number }> {
  const { data } = await apiClient.post<{ queued: number }>(`${BASE}/sync-tracking`);
  return data;
}

export async function deleteShipment(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function getShipmentStats(): Promise<Record<string, number>> {
  const { data } = await apiClient.get<Record<string, number>>(`${BASE}/stats`);
  return data;
}
