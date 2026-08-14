import { apiClient } from '@/lib/api/axios';
import type {
  CreateFBAShipmentPayload,
  FBAReceivingDiscrepancy,
  FBAShipment,
  FBAShipmentBox,
  FBAShipmentFilterParams,
  FBAShipmentItem,
  FBAShipmentListResult,
} from '@/types';

const BASE = '/fba-shipments';

export async function listFBAShipments(params: FBAShipmentFilterParams): Promise<FBAShipmentListResult> {
  const { data } = await apiClient.get<FBAShipmentListResult>(BASE, { params });
  return data;
}

export async function getFBAShipmentById(id: string, workspaceId: string): Promise<FBAShipment> {
  const { data } = await apiClient.get<FBAShipment>(`${BASE}/${id}`, { params: { workspaceId } });
  return data;
}

export async function createFBAShipment(payload: CreateFBAShipmentPayload): Promise<FBAShipment> {
  const { data } = await apiClient.post<FBAShipment>(BASE, payload);
  return data;
}

export async function getFBAShipmentItems(id: string, workspaceId: string): Promise<FBAShipmentItem[]> {
  const { data } = await apiClient.get<FBAShipmentItem[]>(`${BASE}/${id}/items`, { params: { workspaceId } });
  return data;
}

export async function getFBAShipmentBoxes(id: string, workspaceId: string): Promise<FBAShipmentBox[]> {
  const { data } = await apiClient.get<FBAShipmentBox[]>(`${BASE}/${id}/boxes`, { params: { workspaceId } });
  return data;
}

export async function getFBAShipmentDiscrepancies(id: string, workspaceId: string): Promise<FBAReceivingDiscrepancy[]> {
  const { data } = await apiClient.get<FBAReceivingDiscrepancy[]>(`${BASE}/${id}/discrepancies`, { params: { workspaceId } });
  return data;
}

export async function planFBAShipment(id: string, workspaceId: string): Promise<FBAShipment> {
  const { data } = await apiClient.patch<FBAShipment>(`${BASE}/${id}/plan`, {}, { params: { workspaceId } });
  return data;
}

export async function approveFBAShipment(id: string, workspaceId: string): Promise<FBAShipment> {
  const { data } = await apiClient.patch<FBAShipment>(`${BASE}/${id}/approve`, {}, { params: { workspaceId } });
  return data;
}

export async function prepareFBAShipment(id: string, workspaceId: string): Promise<FBAShipment> {
  const { data } = await apiClient.patch<FBAShipment>(`${BASE}/${id}/prepare`, {}, { params: { workspaceId } });
  return data;
}

export async function dispatchFBAShipment(id: string, workspaceId: string): Promise<FBAShipment> {
  const { data } = await apiClient.patch<FBAShipment>(`${BASE}/${id}/dispatch`, {}, { params: { workspaceId } });
  return data;
}

export async function trackFBAShipment(id: string, workspaceId: string, trackingReference?: string): Promise<FBAShipment> {
  const { data } = await apiClient.patch<FBAShipment>(`${BASE}/${id}/track`, { trackingReference }, { params: { workspaceId } });
  return data;
}

export async function reconcileFBAShipment(id: string, workspaceId: string): Promise<FBAShipment> {
  const { data } = await apiClient.patch<FBAShipment>(`${BASE}/${id}/reconcile`, {}, { params: { workspaceId } });
  return data;
}

export async function closeFBAShipment(id: string, workspaceId: string): Promise<FBAShipment> {
  const { data } = await apiClient.patch<FBAShipment>(`${BASE}/${id}/close`, {}, { params: { workspaceId } });
  return data;
}

export async function cancelFBAShipment(id: string, workspaceId: string, reason: string): Promise<FBAShipment> {
  const { data } = await apiClient.patch<FBAShipment>(`${BASE}/${id}/cancel`, { reason }, { params: { workspaceId } });
  return data;
}

export async function addFBAShipmentItem(id: string, workspaceId: string, payload: { inventoryItemId: string; sku: string; requestedQuantity: number }): Promise<FBAShipmentItem> {
  const { data } = await apiClient.post<FBAShipmentItem>(`${BASE}/${id}/items`, payload, { params: { workspaceId } });
  return data;
}

export async function createFBAShipmentBox(id: string, workspaceId: string, payload: { length?: number; width?: number; height?: number; weight?: number }): Promise<FBAShipmentBox> {
  const { data } = await apiClient.post<FBAShipmentBox>(`${BASE}/${id}/boxes`, payload, { params: { workspaceId } });
  return data;
}

export async function recordFBADiscrepancy(id: string, workspaceId: string, payload: { discrepancyType: string; description: string; itemId?: string; expectedQuantity?: number; receivedQuantity?: number }): Promise<FBAReceivingDiscrepancy> {
  const { data } = await apiClient.post<FBAReceivingDiscrepancy>(`${BASE}/${id}/discrepancies`, payload, { params: { workspaceId } });
  return data;
}

export async function reconcileFBADiscrepancy(id: string, discrepancyId: string, workspaceId: string, reconciliationNotes?: string): Promise<FBAReceivingDiscrepancy> {
  const { data } = await apiClient.patch<FBAReceivingDiscrepancy>(`${BASE}/${id}/discrepancies/${discrepancyId}/reconcile`, { reconciliationNotes }, { params: { workspaceId } });
  return data;
}
