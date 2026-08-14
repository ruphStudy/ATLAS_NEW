import { apiClient } from '@/lib/api/axios';
import type {
  CreateInventoryTransferPayload,
  InventoryTransfer,
  InventoryTransferFilterParams,
  InventoryTransferHistoryEntry,
  InventoryTransferListResult,
  ReceiveTransferLineInput,
} from '@/types';

const BASE = '/inventory/transfers';

export async function listInventoryTransfers(params: InventoryTransferFilterParams = {}): Promise<InventoryTransferListResult> {
  const { data } = await apiClient.get<InventoryTransferListResult>(BASE, { params });
  return data;
}

export async function getInventoryTransferById(id: string): Promise<InventoryTransfer> {
  const { data } = await apiClient.get<InventoryTransfer>(`${BASE}/${id}`);
  return data;
}

export async function createInventoryTransfer(payload: CreateInventoryTransferPayload): Promise<InventoryTransfer> {
  const { data } = await apiClient.post<InventoryTransfer>(BASE, payload);
  return data;
}

export async function getInventoryTransferHistory(id: string): Promise<InventoryTransferHistoryEntry[]> {
  const { data } = await apiClient.get<InventoryTransferHistoryEntry[]>(`${BASE}/${id}/history`);
  return data;
}

export async function approveInventoryTransfer(id: string, notes?: string): Promise<InventoryTransfer> {
  const { data } = await apiClient.post<InventoryTransfer>(`${BASE}/${id}/approve`, { notes });
  return data;
}

export async function dispatchInventoryTransfer(id: string, shipmentReference?: string, notes?: string): Promise<InventoryTransfer> {
  const { data } = await apiClient.post<InventoryTransfer>(`${BASE}/${id}/dispatch`, { shipmentReference, notes });
  return data;
}

export async function receiveInventoryTransfer(id: string, lines: ReceiveTransferLineInput[], notes?: string): Promise<InventoryTransfer> {
  const { data } = await apiClient.post<InventoryTransfer>(`${BASE}/${id}/receive`, { lines, notes });
  return data;
}

export async function cancelInventoryTransfer(id: string, reason: string): Promise<InventoryTransfer> {
  const { data } = await apiClient.post<InventoryTransfer>(`${BASE}/${id}/cancel`, { reason });
  return data;
}

export async function reverseInventoryTransfer(id: string, reason: string): Promise<InventoryTransfer> {
  const { data } = await apiClient.post<InventoryTransfer>(`${BASE}/${id}/reverse`, { reason });
  return data;
}
