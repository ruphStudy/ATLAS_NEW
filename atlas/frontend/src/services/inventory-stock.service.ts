import { apiClient } from '@/lib/api/axios';
import type {
  AdjustStockPayload,
  ChangeStockStatusPayload,
  InventoryBatch,
  InventoryStock,
  InventoryTransaction,
  OnHandSummary,
  ReceiveStockPayload,
  ReserveStockPayload,
  TransferStockPayload,
} from '@/types';

const BASE = (inventoryItemId: string) => `/inventory/items/${inventoryItemId}/stock`;

export async function listStock(inventoryItemId: string, params: { warehouseId?: string; status?: string } = {}): Promise<InventoryStock[]> {
  const { data } = await apiClient.get<InventoryStock[]>(BASE(inventoryItemId), { params });
  return data;
}

export async function getOnHandSummary(inventoryItemId: string): Promise<OnHandSummary> {
  const { data } = await apiClient.get<OnHandSummary>(`${BASE(inventoryItemId)}/summary`);
  return data;
}

export async function listTransactions(inventoryItemId: string, params: { page?: number; limit?: number; type?: string } = {}): Promise<{ items: InventoryTransaction[]; total: number } | InventoryTransaction[]> {
  const { data } = await apiClient.get(`${BASE(inventoryItemId)}/transactions`, { params });
  return data;
}

export async function reverseTransaction(inventoryItemId: string, transactionId: string, reason: string): Promise<InventoryTransaction> {
  const { data } = await apiClient.post<InventoryTransaction>(`${BASE(inventoryItemId)}/transactions/${transactionId}/reverse`, { reason });
  return data;
}

export async function receiveStock(inventoryItemId: string, payload: ReceiveStockPayload): Promise<InventoryTransaction> {
  const { data } = await apiClient.post<InventoryTransaction>(`${BASE(inventoryItemId)}/receive`, payload);
  return data;
}

export async function issueStock(inventoryItemId: string, payload: ReceiveStockPayload): Promise<InventoryTransaction> {
  const { data } = await apiClient.post<InventoryTransaction>(`${BASE(inventoryItemId)}/issue`, payload);
  return data;
}

export async function dispatchStock(inventoryItemId: string, payload: ReceiveStockPayload): Promise<InventoryTransaction> {
  const { data } = await apiClient.post<InventoryTransaction>(`${BASE(inventoryItemId)}/dispatch`, payload);
  return data;
}

export async function returnStock(inventoryItemId: string, payload: ReceiveStockPayload): Promise<InventoryTransaction> {
  const { data } = await apiClient.post<InventoryTransaction>(`${BASE(inventoryItemId)}/return`, payload);
  return data;
}

export async function transferStockBetweenWarehouses(inventoryItemId: string, payload: TransferStockPayload): Promise<InventoryTransaction> {
  const { data } = await apiClient.post<InventoryTransaction>(`${BASE(inventoryItemId)}/transfer`, payload);
  return data;
}

export async function adjustStock(inventoryItemId: string, payload: AdjustStockPayload): Promise<InventoryTransaction> {
  const { data } = await apiClient.post<InventoryTransaction>(`${BASE(inventoryItemId)}/adjust`, payload);
  return data;
}

export async function reserveStockDirect(inventoryItemId: string, payload: ReserveStockPayload): Promise<InventoryTransaction> {
  const { data } = await apiClient.post<InventoryTransaction>(`${BASE(inventoryItemId)}/reserve`, payload);
  return data;
}

export async function releaseStockDirect(inventoryItemId: string, payload: ReserveStockPayload): Promise<InventoryTransaction> {
  const { data } = await apiClient.post<InventoryTransaction>(`${BASE(inventoryItemId)}/release`, payload);
  return data;
}

export async function changeStockStatus(inventoryItemId: string, payload: ChangeStockStatusPayload): Promise<InventoryTransaction> {
  const { data } = await apiClient.post<InventoryTransaction>(`${BASE(inventoryItemId)}/change-status`, payload);
  return data;
}

export async function listBatches(inventoryItemId: string, params: { page?: number; limit?: number } = {}): Promise<InventoryBatch[] | { items: InventoryBatch[] }> {
  const { data } = await apiClient.get(`/inventory/items/${inventoryItemId}/batches`, { params });
  return data;
}

export async function listSerials(inventoryItemId: string, params: { page?: number; limit?: number; status?: string } = {}): Promise<unknown> {
  const { data } = await apiClient.get(`/inventory/items/${inventoryItemId}/serials`, { params });
  return data;
}

export async function getExpiringBatches(days = 30): Promise<InventoryBatch[]> {
  const { data } = await apiClient.get<InventoryBatch[]>('/inventory/batches/expiring', { params: { days } });
  return data;
}
